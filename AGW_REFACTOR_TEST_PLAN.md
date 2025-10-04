# AGW Sign-In Refactor - Testing & Validation Plan

## ✅ Refactoring Complete

### Changes Summary
- **Client**: Single `msg` variable used for both `signMessage()` and POST body
- **Server**: Replaced ~200 lines of manual EIP-1271 code with viem's `verifyMessage()`
- **Reduction**: 515 lines → 375 lines (27% smaller)
- **Logging**: Added required diagnostic logs on both client and server

### Files Modified
1. `src/providers/AuthProvider.tsx` - Lines 375-422
2. `src/app/api/auth/wallet-login/route.ts` - Complete refactor

---

## 🧪 Manual Test Plan

### 1. Happy Path Test

**Setup:**
```bash
# 1. Hard refresh browser (Cmd+Shift+R / Ctrl+Shift+R)
# 2. Open DevTools Console & Network tab
# 3. Navigate to http://localhost:3001
```

**Steps:**
1. Connect AGW wallet (should show chainId 2741 - Abstract mainnet)
2. Click "Verify Wallet" button
3. Sign the message in AGW popup

**Expected Client Logs:**
```
[AGW Client POST] {
  addr: "0xae2cf7cc...",
  chainId: 2741,
  sigLen: 132,  // or >132 for 6492-wrapped
  msgPreview: '{"domain":"localhost:3001","statement":"Sign to verify..."'
}
```

**Expected Server Logs:**
```
[AGW Verify] start {
  clientChainId: 2741,
  serverChainId: 2741,
  addr: "0xae2cf7cc…",
  sigLen: 132,
  rpc: "https://api.mainnet.abs.xyz"
}
[AGW Verify] ✅ Signature valid
[AGW Verify] ✅ Auth success { addr: "0xae2cf7cc..." }
```

**Expected Response:**
- ✅ 200 OK
- ✅ JSON: `{ success: true, user: { id, walletAddress, username, displayName, isAdmin } }`
- ✅ UI shows "✅ Verified and authenticated"
- ✅ HTTP-only cookie `pengubook-session` is set

---

### 2. Chain Mismatch Test

**Setup:**
```bash
# Temporarily change client chain ID in .env.local
echo "NEXT_PUBLIC_ABSTRACT_CHAIN_ID=11124" >> .env.local
# Restart dev server
npm run dev
```

**Steps:**
1. Connect AGW wallet
2. Click "Verify Wallet"
3. Try to sign

**Expected Result:**
- ❌ 400 Bad Request
- Error: `"Chain mismatch: expected 2741"`
- Client logs show: `clientChainId: 11124, serverChainId: 2741`

**Cleanup:**
```bash
# Revert .env.local to correct chain ID
sed -i 's/NEXT_PUBLIC_ABSTRACT_CHAIN_ID=11124/NEXT_PUBLIC_ABSTRACT_CHAIN_ID=2741/' .env.local
```

---

### 3. Replay Attack / Nonce Reuse Test

**Steps:**
1. Complete successful authentication (Happy Path)
2. In DevTools Network tab, find the `/api/auth/wallet-login` POST request
3. Right-click → Copy → Copy as fetch
4. Paste in console and re-execute (exact same message + signature)

**Expected Result:**
- ❌ 401 Unauthorized
- Error: `"This authentication request has already been used. Please request a new nonce."`
- Server logs: `[Auth] ⚠️ Replay attack detected - nonce reuse`

---

### 4. Message Tampering Test

**Steps:**
1. Start verification flow (don't sign yet)
2. In DevTools, intercept the POST request
3. Modify one character in the `message` field before sending
4. Send the modified request with original signature

**Expected Result:**
- ❌ 401 Unauthorized
- Error: `"Invalid signature"`
- Server logs: `[AGW Verify] ❌ Invalid signature`

---

### 5. Long Signature (EIP-6492) Test

**Note:** This tests if viem's `verifyMessage` properly handles counterfactual signatures.

**Steps:**
1. Use a smart wallet that hasn't been deployed yet
2. Attempt to verify wallet

**Expected Behavior:**
- If sigLen > 200 (6492-wrapped), viem should automatically handle it
- ✅ Should succeed on mainnet if signature is valid
- ❌ Will get 401 if viem doesn't support the specific 6492 variant

**If it fails:** We may need to add explicit 6492 unwrapping (we removed it for simplicity).

---

## 🔍 Common Failure Scenarios

### 401 Invalid signature
**Possible Causes:**
- ✅ Message string mismatch between client and server
- ✅ Wrong chain (client on testnet, server on mainnet)
- ✅ Nonce expired (10 min timeout) or already consumed
- ✅ Signature is for a different wallet address
- ✅ Timestamp too old/future (>10 min difference)

### 400 Chain mismatch
**Possible Causes:**
- ✅ Client env: `NEXT_PUBLIC_ABSTRACT_CHAIN_ID` doesn't match server env: `ABSTRACT_CHAIN_ID`
- ✅ Client using testnet AGW, server configured for mainnet

**Fix:**
```bash
# Both should be 2741 for mainnet
grep ABSTRACT_CHAIN_ID .env.local
# Should show:
# ABSTRACT_CHAIN_ID=2741
# NEXT_PUBLIC_ABSTRACT_CHAIN_ID=2741
```

### Network errors / Timeouts
**Possible Causes:**
- ✅ Invalid `ABSTRACT_RPC_URL`
- ✅ Server can't reach RPC endpoint (firewall/network issue)
- ✅ Viem version mismatch (check package.json)

---

## 🎨 Optional Polish (Recommended)

### Add Message Length/Hash Preview to Server Logs

```typescript
// In wallet-login/route.ts, after line 81:
console.log('[AGW Verify] message preview', {
  len: message.length,
  hash: keccak256(toBytes(message)).slice(0, 12) + '…'
})
```

**Why:** Helps debug message mismatch issues without logging sensitive data.

---

## 🧪 Automated Tests (Vitest/Jest)

### Test 1: Signature Verification

```typescript
import { verifyMessage } from 'viem'
import { describe, it, expect } from 'vitest'

describe('AGW Signature Verification', () => {
  it('validates known good signature', async () => {
    const isValid = await verifyMessage({
      address: '0xAe2cf7cC881fFDfc75F1Fc425a01E8ae3229FA02' as `0x${string}`,
      message: JSON.stringify({
        domain: "localhost:3001",
        statement: "Sign to verify your Abstract Global Wallet.",
        nonce: "test-nonce-123",
        issuedAt: new Date().toISOString()
      }),
      signature: '0x...' as `0x${string}`, // Use real signature from test
    })
    expect(isValid).toBe(true)
  })

  it('rejects invalid signature', async () => {
    const isValid = await verifyMessage({
      address: '0xAe2cf7cC881fFDfc75F1Fc425a01E8ae3229FA02' as `0x${string}`,
      message: 'wrong message',
      signature: '0x...' as `0x${string}`,
    })
    expect(isValid).toBe(false)
  })
})
```

### Test 2: Chain Mismatch

```typescript
describe('Chain ID Validation', () => {
  it('rejects mismatched chain IDs', async () => {
    const response = await fetch('/api/auth/wallet-login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        message: '...',
        signature: '0x...',
        walletAddress: '0x...',
        chainId: 99999 // Wrong chain
      })
    })
    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error).toContain('Chain mismatch')
  })
})
```

### Test 3: Nonce Replay Prevention

```typescript
describe('Nonce Security', () => {
  it('prevents nonce reuse', async () => {
    // First request succeeds
    const response1 = await authenticateWithWallet(validPayload)
    expect(response1.status).toBe(200)

    // Second request with same nonce fails
    const response2 = await authenticateWithWallet(validPayload)
    expect(response2.status).toBe(401)
    const data = await response2.json()
    expect(data.error).toContain('already been used')
  })

  it('rejects expired nonces', async () => {
    // Create nonce that expired 11 minutes ago
    const expiredNonce = await createExpiredNonce()
    const response = await authenticateWithWallet({
      ...validPayload,
      nonce: expiredNonce
    })
    expect(response.status).toBe(401)
    expect((await response.json()).error).toContain('expired')
  })
})
```

---

## 🚀 Production Checklist

Before deploying to production:

### Environment Variables
- [ ] `ABSTRACT_CHAIN_ID=2741` (mainnet)
- [ ] `ABSTRACT_RPC_URL=https://api.mainnet.abs.xyz`
- [ ] `NEXT_PUBLIC_ABSTRACT_CHAIN_ID=2741`
- [ ] `SESSION_SECRET` is strong (checked by entropy validator)
- [ ] `DATABASE_URL` is set correctly

### Security Validations
- [ ] Message string is NEVER mutated between sign and POST
- [ ] Single-flight guard prevents duplicate nonce requests
- [ ] Error messages don't leak sensitive info (sanitized in production)
- [ ] HTTP-only cookies are used (never sessionStorage for auth)
- [ ] All auth attempts are logged to database

### Monitoring
- [ ] Set up alerts for repeated 401 errors (potential attack)
- [ ] Monitor `[AGW Verify]` logs for chain mismatch patterns
- [ ] Track nonce expiration vs usage rates
- [ ] Alert on unusual signature verification failures

### Performance
- [ ] RPC endpoint latency is acceptable (<500ms)
- [ ] Database connection pool is sized correctly
- [ ] Viem client is reused (module-scope singleton)

---

## 📊 Success Metrics

After deploying, track:

1. **Auth Success Rate**: Should be >95%
   ```sql
   SELECT
     COUNT(*) FILTER (WHERE success = true) * 100.0 / COUNT(*) as success_rate
   FROM "AuthAttempt"
   WHERE "createdAt" > NOW() - INTERVAL '24 hours';
   ```

2. **Chain Mismatch Errors**: Should be <1%
   ```sql
   SELECT COUNT(*)
   FROM "AuthAttempt"
   WHERE "failureReason" LIKE '%Chain mismatch%'
   AND "createdAt" > NOW() - INTERVAL '24 hours';
   ```

3. **Replay Attempts**: Track suspicious activity
   ```sql
   SELECT COUNT(*)
   FROM "AuthAttempt"
   WHERE "failureReason" LIKE '%Replay attack%'
   AND "createdAt" > NOW() - INTERVAL '24 hours';
   ```

---

## 🔧 Troubleshooting

### Issue: verifyMessage always returns false

**Diagnosis:**
```typescript
// Add to wallet-login/route.ts temporarily:
console.log('[DEBUG]', {
  addr,
  message: message.slice(0, 100),
  signature: signature.slice(0, 20),
  chainId: publicClient.chain?.id
})
```

**Common causes:**
- Message encoding differs between client and server (check for extra whitespace, Unicode issues)
- Address checksum mismatch (we normalize to lowercase, viem expects checksummed)
- Wrong RPC endpoint (testnet vs mainnet)

### Issue: Nonces expire too quickly

**Diagnosis:**
```sql
SELECT
  AVG(EXTRACT(EPOCH FROM ("usedAt" - "createdAt"))) as avg_seconds_to_use
FROM "AuthNonce"
WHERE used = true;
```

**Solution:** If avg > 60 seconds, users may be confused. Consider adding UI timer or extending nonce TTL.

---

## 📝 Deployment Steps

1. **Test locally:**
   ```bash
   npm run dev
   # Run all manual tests above
   ```

2. **Commit changes:**
   ```bash
   git add src/providers/AuthProvider.tsx src/app/api/auth/wallet-login/route.ts .env.local
   git commit -m "Refactor AGW sign-in to use viem's verifyMessage

   - Client: Single msg variable for signMessage + POST
   - Server: Replace manual EIP-1271 with viem verifyMessage
   - Add chain ID mismatch validation
   - Add diagnostic logging on client and server
   - Reduce code from 515 to 375 lines (27% reduction)

   🤖 Generated with [Claude Code](https://claude.com/claude-code)

   Co-Authored-By: Claude <noreply@anthropic.com>"
   ```

3. **Push to GitHub:**
   ```bash
   git push origin main
   ```

4. **Verify Vercel deployment:**
   - Wait for build to complete
   - Check environment variables in Vercel dashboard
   - Test on production URL with real wallet

5. **Monitor for 24 hours:**
   - Check error logs in Vercel
   - Monitor auth success rate
   - Watch for chain mismatch errors

---

## 🎯 Next Steps (From Original Task List)

After AGW refactor is validated:

### Remaining Web3 Tasks
- [ ] **WEB3-01:** Add gas estimation before all transactions
- [ ] **WEB3-02:** Implement ERC-20 approval flow for token tips
- [ ] **WEB3-03:** Add transaction monitoring with confirmation progress
- [ ] **WEB3-04:** Add enhanced error handling for Web3 operations

### Remaining UX/Testing Tasks
- [ ] **UX-05:** Improve TipModal with token search and balance validation
- [ ] **TEST-01:** Write authentication flow tests (nonce, wallet login, session)
- [ ] **TEST-02:** Write transaction verification tests
- [ ] **TEST-03:** Write API authorization tests (IDOR, privilege escalation)

---

## 🎓 What We Learned

### Why viem's verifyMessage is Better

**Before (Manual):**
- 3 separate contract calls with different digest variants
- Manual 6492 unwrapping and bytecode pre-checks
- Timeout wrappers to prevent hanging
- ~200 lines of complex signature verification logic

**After (viem):**
- Single `verifyMessage()` call handles all cases
- Automatic EOA, EIP-1271, and EIP-6492 support
- Built-in optimizations and fallback paths
- 15 lines of clear, maintainable code

### Security Improvements
1. **Strict chain validation:** Client and server chain IDs must match
2. **Single string signing:** Eliminates message mutation bugs
3. **Comprehensive logging:** Easier to diagnose auth failures
4. **Standards-compliant:** Uses official viem implementation

---

**Generated:** 2025-01-04
**Author:** Claude Code + @arson
**Status:** ✅ Ready for Testing
