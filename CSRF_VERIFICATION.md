# CSRF Protection Verification Guide

## Overview
Database-backed CSRF protection with single-use tokens has been implemented for Phase 2 security hardening.

## Architecture

### Two-Layer Protection
1. **Cookie Layer** (Double-Submit Pattern)
   - CSRF token stored in HTTP-only cookie
   - Token must match header value
   - Prevents external site attacks

2. **Database Layer** (Single-Use Tokens)
   - Tokens stored in PostgreSQL
   - Marked as "used" after validation
   - Prevents replay attacks
   - 1-hour expiration

## Testing CSRF Protection

### Test 1: Token Generation
```bash
# Generate a CSRF token
curl -c cookies.txt http://localhost:3001/api/csrf/token

# Expected response:
{
  "success": true,
  "token": "abc123...",
  "expiresIn": 3600,
  "timestamp": "2025-10-07T..."
}
```

### Test 2: Valid Request with CSRF Token
```bash
# Use the token from Test 1
TOKEN="<token_from_response>"

# Make a protected POST request
curl -b cookies.txt \
  -H "x-csrf-token: $TOKEN" \
  -H "Content-Type: application/json" \
  -X POST \
  http://localhost:3001/api/admin/users \
  -d '{"action":"test"}'

# Expected: 200 OK (if endpoint uses withDatabaseCSRFProtection)
```

### Test 3: Missing CSRF Token (Should Fail)
```bash
# Try POST without CSRF token
curl -b cookies.txt \
  -H "Content-Type: application/json" \
  -X POST \
  http://localhost:3001/api/admin/users \
  -d '{"action":"test"}'

# Expected: 403 Forbidden
{
  "error": "CSRF token validation failed",
  "code": "CSRF_INVALID",
  "message": "CSRF token missing from header"
}
```

### Test 4: Replay Attack (Should Fail)
```bash
# Try to reuse the same token twice
TOKEN="<same_token_from_test_2>"

# First request - should succeed
curl -b cookies.txt \
  -H "x-csrf-token: $TOKEN" \
  -X POST \
  http://localhost:3001/api/admin/users

# Second request - should FAIL (token already used)
curl -b cookies.txt \
  -H "x-csrf-token: $TOKEN" \
  -X POST \
  http://localhost:3001/api/admin/users

# Expected: 403 Forbidden
{
  "error": "CSRF token validation failed",
  "code": "CSRF_INVALID",
  "message": "CSRF token already used (replay attack detected)"
}
```

### Test 5: Expired Token (Should Fail)
```bash
# Wait 1 hour + 1 minute after generating token
sleep 3660

# Try to use expired token
curl -b cookies.txt \
  -H "x-csrf-token: $EXPIRED_TOKEN" \
  -X POST \
  http://localhost:3001/api/admin/users

# Expected: 403 Forbidden
{
  "error": "CSRF token validation failed",
  "code": "CSRF_INVALID",
  "message": "CSRF token expired"
}
```

### Test 6: Cookie Mismatch (Should Fail)
```bash
# Generate token
curl -c cookies.txt http://localhost:3001/api/csrf/token

# Use different token in header than cookie
curl -b cookies.txt \
  -H "x-csrf-token: WRONG_TOKEN_12345" \
  -X POST \
  http://localhost:3001/api/admin/users

# Expected: 403 Forbidden
{
  "error": "CSRF token validation failed",
  "code": "CSRF_INVALID",
  "message": "CSRF cookie validation failed"
}
```

## Database Verification

### Check Token Storage
```sql
-- View all CSRF tokens
SELECT
  id,
  LEFT(token, 16) as token_preview,
  used,
  expiresAt,
  createdAt,
  userId
FROM csrf_tokens
ORDER BY createdAt DESC
LIMIT 10;
```

### Check Token Usage
```sql
-- Count used vs unused tokens
SELECT
  used,
  COUNT(*) as count
FROM csrf_tokens
GROUP BY used;
```

### Check Expired Tokens
```sql
-- Find expired tokens
SELECT COUNT(*) as expired_count
FROM csrf_tokens
WHERE expiresAt < NOW();
```

## Cleanup Verification

### Manual Cleanup Test
```bash
# Trigger cleanup cron manually
curl -H "Authorization: Bearer <CRON_SECRET>" \
  http://localhost:3001/api/cron/cleanup-csrf

# Expected response:
{
  "success": true,
  "message": "CSRF token cleanup completed",
  "deletedCount": 42,
  "timestamp": "2025-10-07T..."
}
```

### Verify Cleanup in Database
```sql
-- Should return 0 expired tokens after cleanup
SELECT COUNT(*) FROM csrf_tokens WHERE expiresAt < NOW();

-- Should return 0 old used tokens
SELECT COUNT(*) FROM csrf_tokens
WHERE used = true
AND createdAt < NOW() - INTERVAL '24 hours';
```

## Integration with Admin Endpoints

### Example: Protect Admin Endpoint
```typescript
// src/app/api/admin/users/[id]/route.ts
import { withDatabaseCSRFProtection } from '@/lib/csrf'
import { withAdminAuth } from '@/lib/auth-middleware'

export const DELETE = withDatabaseCSRFProtection(
  withAdminAuth(async (request, user) => {
    // This endpoint now requires:
    // 1. Admin authentication
    // 2. Valid CSRF token in cookie
    // 3. Valid CSRF token in header
    // 4. Token not yet used (single-use)
    // 5. Token not expired (<1 hour old)

    const { id } = await request.params
    await prisma.user.delete({ where: { id } })

    return NextResponse.json({ success: true })
  })
)
```

### Example: Client-Side Usage
```typescript
// Client code to make protected request
async function deleteUser(userId: string) {
  // Step 1: Get fresh CSRF token
  const tokenResponse = await fetch('/api/csrf/token', {
    credentials: 'include' // Important: include cookies
  })
  const { token } = await tokenResponse.json()

  // Step 2: Make protected request with token
  const response = await fetch(`/api/admin/users/${userId}`, {
    method: 'DELETE',
    headers: {
      'x-csrf-token': token
    },
    credentials: 'include' // Important: include cookies
  })

  if (response.status === 403) {
    const error = await response.json()
    if (error.code === 'CSRF_INVALID') {
      // Token expired or already used - get new token and retry
      return deleteUser(userId)
    }
  }

  return response.json()
}
```

## Middleware Comparison

### withDatabaseCSRFProtection (Strongest)
**Use for:** Admin operations, financial transactions, critical mutations
```typescript
export const POST = withDatabaseCSRFProtection(handler)
```
- ✅ Double-submit cookie validation
- ✅ Database validation
- ✅ Single-use tokens
- ✅ Replay attack prevention
- ✅ 1-hour expiration

### withEnhancedCSRFProtection (Medium)
**Use for:** Regular state-changing operations
```typescript
export const POST = withEnhancedCSRFProtection(handler)
```
- ✅ Double-submit cookie validation
- ❌ No database validation
- ❌ No single-use enforcement

### withCSRFProtection (Basic)
**Use for:** Low-risk operations
```typescript
export const POST = withCSRFProtection(handler)
```
- ✅ Basic cookie validation
- ❌ No double-submit pattern
- ❌ No database validation

## Checklist: Applying CSRF to Endpoints

### High Priority (Use withDatabaseCSRFProtection)
- [ ] `/api/admin/users/[id]` (DELETE, PUT)
- [ ] `/api/admin/moderation/*` (POST, PUT)
- [ ] `/api/admin/tokens/*` (POST, PUT, DELETE)
- [ ] `/api/tips/[id]/verify` (POST)
- [ ] `/api/users/block` (POST)
- [ ] `/api/users/privacy` (PUT)

### Medium Priority (Use withEnhancedCSRFProtection)
- [ ] `/api/posts` (POST, PUT, DELETE)
- [ ] `/api/posts/[id]/like` (POST)
- [ ] `/api/posts/[id]/comments` (POST)
- [ ] `/api/communities/[id]/join` (POST)
- [ ] `/api/friends/requests` (POST, PUT)
- [ ] `/api/upload` (POST)

### Implementation Example
```typescript
// Before
export const POST = withAuth(async (request, user) => {
  // Handler logic
})

// After
export const POST = withDatabaseCSRFProtection(
  withAuth(async (request, user) => {
    // Same handler logic
  })
)
```

## Environment Configuration

### Required Environment Variables
```bash
# .env
CRON_SECRET=<random_secret_for_cron_jobs>
```

Generate secret:
```bash
openssl rand -base64 32
```

### Vercel Cron Configuration
Add to `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/cron/cleanup-csrf",
    "schedule": "0 * * * *"
  }]
}
```

## Monitoring

### Metrics to Track
1. **CSRF Validation Failures**
   - Count 403 responses with code `CSRF_INVALID`
   - Alert on spikes (possible attack)

2. **Replay Attack Attempts**
   - Monitor logs for "replay attack detected"
   - Track by IP/user

3. **Token Generation Rate**
   - Track `/api/csrf/token` requests
   - Alert on unusual patterns

4. **Cleanup Efficiency**
   - Monitor deleted token count
   - Ensure database doesn't bloat

### Sample Monitoring Query
```sql
-- Tokens created vs used in last hour
SELECT
  COUNT(*) as total,
  SUM(CASE WHEN used THEN 1 ELSE 0 END) as used,
  SUM(CASE WHEN NOT used AND expiresAt > NOW() THEN 1 ELSE 0 END) as active
FROM csrf_tokens
WHERE createdAt > NOW() - INTERVAL '1 hour';
```

## Security Best Practices

### ✅ DO
- Generate new token for each critical operation
- Use `withDatabaseCSRFProtection` for admin endpoints
- Set `credentials: 'include'` in fetch requests
- Store tokens in HTTP-only cookies
- Monitor for replay attacks

### ❌ DON'T
- Don't reuse CSRF tokens across requests
- Don't expose tokens in URLs or localStorage
- Don't skip CSRF on state-changing operations
- Don't use GET requests for mutations
- Don't trust client-provided token values

## Troubleshooting

### Issue: "CSRF token missing from header"
**Solution:** Client must include `x-csrf-token` header
```typescript
headers: { 'x-csrf-token': token }
```

### Issue: "CSRF cookie validation failed"
**Solution:** Ensure `credentials: 'include'` is set
```typescript
fetch(url, { credentials: 'include' })
```

### Issue: "CSRF token already used"
**Solution:** Get a fresh token for each request
```typescript
// Don't do this:
const token = await getToken()
await request1(token) // OK
await request2(token) // FAIL - token already used

// Do this:
await request1(await getToken()) // OK
await request2(await getToken()) // OK - fresh token
```

### Issue: "CSRF token expired"
**Solution:** Tokens expire after 1 hour - get fresh token
```typescript
// Implement retry logic with fresh token
```

## Success Criteria

✅ **CSRF Protection Verified When:**
1. Valid requests with tokens succeed
2. Requests without tokens fail (403)
3. Replay attacks are detected and blocked
4. Expired tokens are rejected
5. Cookie mismatches are rejected
6. Cleanup cron runs successfully
7. No false positives in production

---

*Last Updated: 2025-10-07*
*Security Phase: 2*
