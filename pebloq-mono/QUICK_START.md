# 🚀 PeBloq Railway Migration - Quick Start

## ⚠️ NPM Issue Detected

Your npm has a "Maximum call stack size exceeded" error. This is a known Windows/WSL issue.

## 🔧 Fix NPM First

```bash
# Option 1: Clear npm cache
npm cache clean --force

# Option 2: Reinstall npm
npm install -g npm@latest

# Option 3: Use a fresh terminal/restart VSCode
```

## 📦 Then Install Services

### API Service
```bash
cd services/api
npm install
npm run dev  # Should start on port 4000
```

### Socket Service
```bash
cd services/socket
npm install
npm run dev  # Should start on port 4001
```

## ✅ Test Services

```bash
# Test API
curl http://localhost:4000/health

# Should return: {"status":"ok","service":"pebloq-api",...}
```

## 📁 Files Created So Far

✅ services/api/package.json
✅ services/api/tsconfig.json
✅ services/api/src/index.ts
✅ .env (with all your credentials)
✅ packages/prisma/schema.prisma (copied from main project)

## 🎯 Next Steps After NPM Fix

1. Fix npm (see above)
2. Install API service: `cd services/api && npm install`
3. Test API: `npm run dev`
4. I'll create Socket and Worker services
5. We'll migrate the Next.js frontend last

**Try clearing npm cache and let me know if it works!**
