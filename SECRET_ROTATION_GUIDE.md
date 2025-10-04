# Secret Rotation Guide

## 🔐 Generate Fresh Production Secrets

Run these commands to generate new cryptographically secure secrets:

```bash
# 1. NextAuth Secret (32 bytes base64)
echo "NEXTAUTH_SECRET=$(openssl rand -base64 32)"

# 2. JWT Secret (32 bytes base64)
echo "JWT_SECRET=$(openssl rand -base64 32)"

# 3. Session Secret (64 bytes hex) - CRITICAL for wallet session signing
echo "SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")"

# 4. Encryption Secret (32 bytes hex)
echo "ENCRYPTION_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")"

# 5. Cron Secret (32 bytes hex)
echo "CRON_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")"
```

**⚠️ IMPORTANT:** SESSION_SECRET is used to sign wallet login sessions. Without it, the app will fall back to NEXTAUTH_SECRET (less secure).

---

## 📝 Add Secrets to Vercel

### Via Vercel CLI
```bash
# Install Vercel CLI if you haven't
npm install -g vercel

# Login to Vercel
vercel login

# Link to your project
vercel link

# Add secrets (replace with actual values from above)
vercel env add NEXTAUTH_SECRET production
vercel env add JWT_SECRET production
vercel env add ENCRYPTION_SECRET production
vercel env add CRON_SECRET production
vercel env add SESSION_SECRET production
```

### Via Vercel Dashboard
1. Go to https://vercel.com/dashboard
2. Select your PenguBook project
3. Go to Settings → Environment Variables
4. Add each secret:
   - **Key**: NEXTAUTH_SECRET
   - **Value**: (paste generated value)
   - **Environment**: Production
   - Click "Save"

---

## 🔄 OAuth Credentials (Discord & Twitter)

### Discord
1. Go to https://discord.com/developers/applications
2. Create NEW application for production (or regenerate secret for existing)
3. OAuth2 → General:
   - **Redirect URL**: `https://pengubook.vercel.app/api/auth/callback/discord`
4. Copy:
   - **CLIENT ID** → Add to Vercel as `DISCORD_CLIENT_ID`
   - **CLIENT SECRET** → Add to Vercel as `DISCORD_CLIENT_SECRET`

### Twitter (X)
1. Go to https://developer.twitter.com/en/portal/dashboard
2. Create NEW app for production (or regenerate keys)
3. App Settings → Keys and Tokens:
   - **OAuth 2.0 Client ID** → Add to Vercel as `TWITTER_CLIENT_ID`
   - **Client Secret** → Add to Vercel as `TWITTER_CLIENT_SECRET`
4. User Authentication Settings:
   - **Callback URL**: `https://pengubook.vercel.app/api/auth/callback/twitter`

---

## ☁️ Cloud Provider Keys

### AWS (for Rekognition)
```bash
# Create NEW IAM user for production
1. Go to AWS IAM Console
2. Create user: "pengubook-production"
3. Attach policy: AmazonRekognitionFullAccess
4. Create access key
5. Copy:
   - Access Key ID → Vercel: AWS_ACCESS_KEY_ID
   - Secret Access Key → Vercel: AWS_SECRET_ACCESS_KEY
6. Set region → Vercel: AWS_REGION=us-east-1
```

### Cloudinary
```bash
# Create NEW API key for production
1. Go to Cloudinary Console → Settings → Access Keys
2. Click "Generate New API Key"
3. Copy:
   - Cloud Name → Vercel: CLOUDINARY_CLOUD_NAME
   - API Key → Vercel: CLOUDINARY_API_KEY
   - API Secret → Vercel: CLOUDINARY_API_SECRET
```

---

## 🗄️ Database (Optional - Only if separating dev/prod)

### Neon Postgres
```bash
# If you want separate production database:
1. Go to https://neon.tech/
2. Create NEW database: "pengubook-production"
3. Copy connection string
4. Add to Vercel: DATABASE_URL
```

**Current:** Using same database for dev and prod (acceptable for now)

---

## 🚀 Upstash Redis (Required for Distributed Rate Limiting)

### Setup
1. Go to https://console.upstash.com/
2. Create account (free tier: 10,000 requests/day)
3. Create Database:
   - **Name**: pengubook-ratelimit
   - **Region**: us-east-1 (or closest to your Vercel region)
   - **Type**: Regional
4. Copy from dashboard:
   - **UPSTASH_REDIS_REST_URL** → Add to Vercel
   - **UPSTASH_REDIS_REST_TOKEN** → Add to Vercel

---

## ✅ Verification Checklist

After adding all secrets to Vercel:

- [ ] NEXTAUTH_SECRET (new value)
- [ ] JWT_SECRET (new value)
- [ ] SESSION_SECRET (new value) - **CRITICAL for wallet sessions**
- [ ] ENCRYPTION_SECRET (new value)
- [ ] CRON_SECRET (new value)
- [ ] DISCORD_CLIENT_ID (production app)
- [ ] DISCORD_CLIENT_SECRET (production secret)
- [ ] TWITTER_CLIENT_ID (production app)
- [ ] TWITTER_CLIENT_SECRET (production secret)
- [ ] AWS_ACCESS_KEY_ID (production IAM user)
- [ ] AWS_SECRET_ACCESS_KEY (production key)
- [ ] AWS_REGION=us-east-1
- [ ] CLOUDINARY_CLOUD_NAME
- [ ] CLOUDINARY_API_KEY (production key)
- [ ] CLOUDINARY_API_SECRET (production secret)
- [ ] UPSTASH_REDIS_REST_URL
- [ ] UPSTASH_REDIS_REST_TOKEN
- [ ] DATABASE_URL (existing - no change needed)
- [ ] NEXTAUTH_URL=https://pengubook.vercel.app
- [ ] NEXT_PUBLIC_APP_URL=https://pengubook.vercel.app
- [ ] ADMIN_WALLET_ADDRESS (existing - no change)
- [ ] NEXT_PUBLIC_ADMIN_WALLET_ADDRESS (existing - no change)

---

## 🔄 Rotation Schedule

Set calendar reminders for:

### Every 90 days:
- [ ] Rotate NEXTAUTH_SECRET
- [ ] Rotate JWT_SECRET
- [ ] Rotate ENCRYPTION_SECRET
- [ ] Rotate CRON_SECRET

### Every 6 months:
- [ ] Rotate OAuth secrets (Discord, Twitter)
- [ ] Rotate AWS IAM keys
- [ ] Rotate Cloudinary API keys

### When to rotate immediately:
- Suspected compromise
- Team member leaves with access
- Logs show unauthorized access attempts
- After security incident

---

## ⚠️ Important Notes

1. **Do NOT commit secrets to .env** - They should only exist in Vercel
2. **Old encrypted messages** - Rotating ENCRYPTION_SECRET means old messages can't be decrypted (acceptable for new system)
3. **Test after rotation** - Deploy and verify all features work before announcing launch
4. **Backup old secrets** - Keep in password manager for 30 days in case of rollback

---

## 🆘 Emergency Rollback

If rotation breaks something:

```bash
# Revert to old secrets temporarily
vercel env add NEXTAUTH_SECRET production
# (paste old value from backup)

# Re-deploy
vercel --prod
```

Then investigate what broke and fix before re-rotating.

---

Generated: $(date)
