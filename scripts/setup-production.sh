#!/bin/bash
# Production setup script for PeBloq

set -e

echo "🐧 PeBloq Production Setup Script"
echo "===================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   print_error "This script should not be run as root for security reasons"
   exit 1
fi

# Check prerequisites
print_status "Checking prerequisites..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    print_error "Node.js version 18 or higher is required. Current version: $(node -v)"
    exit 1
fi

print_success "Prerequisites check passed"

# Create production environment file if it doesn't exist
if [ ! -f .env.production ]; then
    print_status "Creating production environment file..."
    cp .env.production.example .env.production
    print_warning "Please edit .env.production with your actual configuration values"
    print_warning "Make sure to set secure passwords and API keys!"
fi

# Generate secure secrets if needed
print_status "Checking environment secrets..."

# Generate NEXTAUTH_SECRET if not set
if ! grep -q "NEXTAUTH_SECRET=.*[a-zA-Z0-9]" .env.production; then
    NEXTAUTH_SECRET=$(openssl rand -base64 32)
    sed -i "s/NEXTAUTH_SECRET=.*/NEXTAUTH_SECRET=$NEXTAUTH_SECRET/" .env.production
    print_success "Generated NEXTAUTH_SECRET"
fi

# Generate JWT_SECRET if not set
if ! grep -q "JWT_SECRET=.*[a-zA-Z0-9]" .env.production; then
    JWT_SECRET=$(openssl rand -base64 32)
    sed -i "s/JWT_SECRET=.*/JWT_SECRET=$JWT_SECRET/" .env.production
    print_success "Generated JWT_SECRET"
fi

# Install dependencies
print_status "Installing dependencies..."
npm ci --only=production

# Build the application
print_status "Building application..."
npm run build

# Create necessary directories
print_status "Creating necessary directories..."
mkdir -p logs
mkdir -p uploads
mkdir -p postgres/init

# Set up database initialization script
print_status "Setting up database initialization..."
cat > postgres/init/01-init.sql << EOF
-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Create additional indexes for performance
-- These will be created after Prisma migration
EOF

# Start database services
print_status "Starting database services..."
docker-compose -f docker-compose.prod.yml up -d postgres redis

# Wait for database to be ready
print_status "Waiting for database to be ready..."
sleep 10

# Check database connection
print_status "Testing database connection..."
if docker-compose -f docker-compose.prod.yml exec -T postgres pg_isready -U pengubook > /dev/null 2>&1; then
    print_success "Database is ready"
else
    print_error "Database is not ready. Please check the logs."
    exit 1
fi

# Run database migrations
print_status "Running database migrations..."
npx prisma generate
npx prisma db push

# Create admin user setup script
print_status "Creating admin setup script..."
cat > scripts/create-admin.js << 'EOF'
const { PrismaClient } = require('@prisma/client')

async function createAdmin() {
  const prisma = new PrismaClient()

  const walletAddress = process.env.NEXT_PUBLIC_ADMIN_WALLET_ADDRESS

  if (!walletAddress) {
    console.error('NEXT_PUBLIC_ADMIN_WALLET_ADDRESS not set in environment')
    process.exit(1)
  }

  try {
    const admin = await prisma.user.upsert({
      where: { walletAddress },
      update: { isAdmin: true },
      create: {
        walletAddress,
        username: 'admin',
        displayName: 'Admin',
        isAdmin: true,
        level: 100
      }
    })

    console.log('Admin user created/updated:', admin.id)
  } catch (error) {
    console.error('Error creating admin:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createAdmin()
EOF

# Set up systemd service (if systemd is available)
if command -v systemctl &> /dev/null; then
    print_status "Setting up systemd service..."

    cat > /tmp/pengubook.service << EOF
[Unit]
Description=PeBloq Social Platform
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$PWD
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

    print_warning "Systemd service file created at /tmp/pengubook.service"
    print_warning "Run 'sudo mv /tmp/pengubook.service /etc/systemd/system/' to install it"
    print_warning "Then run 'sudo systemctl enable pengubook && sudo systemctl start pengubook'"
fi

# Create backup script
print_status "Creating backup script..."
cat > scripts/backup.sh << 'EOF'
#!/bin/bash
# Backup script for PeBloq production data

BACKUP_DIR="/var/backups/pengubook"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
docker-compose -f docker-compose.prod.yml exec -T postgres pg_dump -U pengubook pengubook > "$BACKUP_DIR/database_$DATE.sql"

# Backup uploaded files (if any)
if [ -d "uploads" ]; then
    tar -czf "$BACKUP_DIR/uploads_$DATE.tar.gz" uploads/
fi

# Keep only last 7 days of backups
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
EOF

chmod +x scripts/backup.sh

# Create update script
print_status "Creating update script..."
cat > scripts/update.sh << 'EOF'
#!/bin/bash
# Update script for PeBloq

set -e

echo "Updating PeBloq..."

# Pull latest changes
git pull origin main

# Install dependencies
npm ci --only=production

# Build application
npm run build

# Run migrations
npx prisma generate
npx prisma db push

# Restart services
if systemctl is-active --quiet pengubook; then
    sudo systemctl restart pengubook
    echo "PeBloq service restarted"
else
    echo "Please restart your application manually"
fi

echo "Update completed!"
EOF

chmod +x scripts/update.sh

# Security recommendations
print_status "Setting up security..."

# Set proper file permissions
chmod 600 .env.production
chmod -R 755 scripts/
chmod 644 docker-compose.prod.yml

print_success "Production setup completed!"
echo ""
print_status "Next steps:"
echo "1. Edit .env.production with your actual configuration"
echo "2. Set up SSL/TLS certificates for HTTPS"
echo "3. Configure your reverse proxy (nginx/Apache)"
echo "4. Set up monitoring and logging"
echo "5. Run 'node scripts/create-admin.js' to create admin user"
echo "6. Start the application with 'npm start'"
echo ""
print_warning "Security checklist:"
echo "- ✓ Environment secrets generated"
echo "- ✓ File permissions set"
echo "- ⚠ Configure firewall rules"
echo "- ⚠ Set up SSL certificates"
echo "- ⚠ Configure rate limiting at proxy level"
echo "- ⚠ Set up log rotation"
echo "- ⚠ Configure database backups"
echo ""
print_success "PeBloq is ready for production! 🐧"
EOF