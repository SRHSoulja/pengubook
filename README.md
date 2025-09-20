# PenguBook

A social platform with Abstract Global Wallet (AGW) integration and token tipping functionality.

## Features

- 🔗 **AGW Integration**: Connect your Abstract Global Wallet to access the platform
- 👤 **User Profiles**: Create and browse extensive user profiles
- 💰 **Token Tipping**: Tip other users with Abstract native tokens
- ⚙️ **Admin Panel**: Control which tokens are available on the platform
- 🌐 **Social Features**: Connect with other users and share interests

## Getting Started

1. **Clone and install dependencies:**
```bash
git clone <repository-url>
cd PenguBook
npm install
```

2. **Environment Setup:**
Copy the example environment file and configure it:
```bash
cp .env.example .env.local
```

Edit `.env.local` with your configuration:
```env
# Admin Configuration - Set to your wallet address
ADMIN_WALLET_ADDRESS=0xYourWalletAddressHere
NEXT_PUBLIC_ADMIN_WALLET_ADDRESS=0xYourWalletAddressHere

# Database
DATABASE_URL="file:./dev.db"

# NextAuth (for future authentication features)
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here

# Social OAuth (optional - for future Discord/X integration)
DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_CLIENT_SECRET=your_discord_client_secret
TWITTER_CLIENT_ID=your_twitter_client_id
TWITTER_CLIENT_SECRET=your_twitter_client_secret
```

3. **Database Setup:**
```bash
npx prisma generate
npx prisma db push
```

4. **Run the development server:**
```bash
npm run dev
```

5. **Open [http://localhost:3001](http://localhost:3001) in your browser.**

## Admin Access

- Only the wallet address specified in `ADMIN_WALLET_ADDRESS` will have access to the admin panel at `/admin`
- Admin users can manage tokens, users, and platform settings
- Admin users can toggle between admin view and normal user view
- All other users will see the regular settings page for managing their social accounts

## Project Structure

- `/src/app` - Next.js App Router pages
- `/src/components` - React components
- `/src/lib` - Utility functions and AGW integration
- `/src/types` - TypeScript type definitions
- `/prisma` - Database schema and migrations

## Key Components

- **WalletConnect**: AGW wallet connection component
- **TipButton**: Send tips to other users
- **TokenManager**: Admin interface for managing supported tokens
- **Profile Pages**: User profile display and interaction

## Technologies

- Next.js 14 with App Router
- TypeScript
- Tailwind CSS
- Prisma ORM
- Ethers.js for blockchain interaction
- SQLite database (development)