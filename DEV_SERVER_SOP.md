# Dev Server Management SOP

## Standard Operating Procedure for Next.js Development Server

### Problem Statement
When restarting the Next.js dev server, common issues occur:
- Multiple servers running on same port (EADDRINUSE error)
- Cached .env changes not being picked up
- Stale build cache causing old warnings to persist

### Proper Restart Procedure

#### 1. Kill ALL Next.js processes
```bash
pkill -f "next dev"
# Wait 2 seconds for processes to fully terminate
sleep 2
```

#### 2. Verify port is free
```bash
lsof -ti:3001
# Should return nothing. If it returns a PID:
lsof -ti:3001 | xargs -r kill -9
```

#### 3. Clean build cache (if .env changed OR fixing warnings)
```bash
rm -rf .next
```

#### 4. Start fresh server
```bash
npm run dev
# NO & background flag on first start - we need to see if it starts successfully
```

#### 5. Wait for "Ready" message
```bash
# Wait for: ✓ Ready in X.Xs
# Then you can Ctrl+Z and bg if needed
```

### Common Mistakes to AVOID

❌ **WRONG**: Running multiple `npm run dev &` commands in parallel
- This creates race conditions and port conflicts

❌ **WRONG**: Trying to kill with `kill` before verifying with `lsof`
- Processes may not be fully terminated

❌ **WRONG**: Restarting without cleaning `.next` after env changes
- Old environment values persist in build cache

❌ **WRONG**: Using `&&` chains like `kill && npm run dev`
- Kill may fail silently, then dev starts on wrong port

### Correct Restart Sequence

```bash
# Step 1: Kill everything
pkill -f "next dev" && sleep 2

# Step 2: Verify clean slate
lsof -ti:3001 && echo "ERROR: Port still in use" || echo "Port free"

# Step 3: Clean build if needed
rm -rf .next

# Step 4: Start server (foreground first to verify)
npm run dev

# Wait for "✓ Ready" message

# Step 5: If running as background task (optional)
# Press Ctrl+Z, then: bg
```

### When to Clean `.next` Cache

Always clean when:
- ✅ Changing environment variables (`.env.local`)
- ✅ Fixing metadata/viewport warnings
- ✅ Modifying `next.config.js`
- ✅ Seeing stale security warnings

Sometimes clean when:
- ⚠️ Mysterious build errors
- ⚠️ Components not updating

Never clean when:
- ❌ Just changing component code (Hot reload handles this)
- ❌ CSS changes (Hot reload handles this)

### Environment Variable Changes

When updating `.env.local`:
1. Update the file
2. Kill server: `pkill -f "next dev" && sleep 2`
3. Clean cache: `rm -rf .next`
4. Restart: `npm run dev`

**Why?** Next.js bakes env vars into the build at compile time. Without cleaning `.next`, old values persist.

### Debugging Port Conflicts

```bash
# Find what's using port 3001
lsof -i:3001

# Expected output when free:
# (nothing)

# If something is there:
lsof -ti:3001 | xargs -r kill -9

# Verify it's gone:
lsof -i:3001
```

### Expected Server Output (Success)

```
> pebloq@2.7.4 dev
> next dev -p 3001

  ▲ Next.js 14.2.32
  - Local:        http://localhost:3001
  - Environments: .env.local

 ✓ Starting...
 ✓ Ready in X.Xs
```

### Expected Errors (After Fixing Issues)

After proper fixes, you should NOT see:
- ❌ `EADDRINUSE: address already in use`
- ❌ `SESSION_SECRET has low entropy` warnings
- ❌ `Unsupported metadata viewport` warnings
- ❌ `__nextjs_original-stack-frame` 400 errors (these are harmless but annoying)

You WILL still see (these are normal):
- ✅ `[next-auth][warn][DEBUG_ENABLED]` - Normal in dev mode
- ✅ `Session cookies transmitted over HTTP in development` - Normal in dev mode

### Quick Reference Commands

```bash
# Full clean restart (use this 90% of the time)
pkill -f "next dev" && sleep 2 && rm -rf .next && npm run dev

# Just restart (no cache clean)
pkill -f "next dev" && sleep 2 && npm run dev

# Emergency port clear
lsof -ti:3001 | xargs -r kill -9

# Check if server is running
lsof -i:3001
```

### Testing After Restart

```bash
# 1. Wait for "Ready" message
# 2. Test nonce endpoint
curl -s http://localhost:3001/api/auth/nonce | head -3

# Expected: JSON with nonce and expiresAt
# {"nonce":"...","expiresAt":"..."}

# 3. Check server logs for warnings
# Should not see metadata viewport warnings
```

## Summary

**Golden Rule**: One command at a time. Verify success before next step.

1. Kill cleanly (`pkill -f`)
2. Wait (`sleep 2`)
3. Clean if env changed (`rm -rf .next`)
4. Start fresh (`npm run dev`)
5. Verify (`curl` test endpoint)
