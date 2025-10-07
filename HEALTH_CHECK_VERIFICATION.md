# Health Check Endpoint Verification

## Implementation Summary

**Date:** 2025-10-07
**Endpoint:** `GET/HEAD /api/health`
**Purpose:** Comprehensive system health monitoring for production operations
**Version:** Tracks application version (2.7.4) for deployment verification

## Endpoint Specification

### `GET /api/health`

**Purpose:** Comprehensive health check with detailed metrics

**Query Parameters:**
- `detailed` (optional, boolean): Include detailed metadata (default: false)

**Response Format:**
```json
{
  "status": "healthy" | "degraded" | "unhealthy",
  "timestamp": "2025-10-07T12:00:00.000Z",
  "version": "2.7.4",
  "uptime": 86400,
  "checks": {
    "database": {
      "status": "pass" | "warn" | "fail",
      "message": "Database connection healthy",
      "responseTime": 23
    },
    "memory": {
      "status": "pass" | "warn" | "fail",
      "message": "Memory usage normal",
      "details": {
        "heapUsed": "45MB",
        "heapTotal": "128MB",
        "heapUsedPercent": "35%",
        "rss": "156MB",
        "external": "2MB"
      }
    },
    "dependencies": {
      "status": "pass" | "warn" | "fail",
      "message": "All dependencies configured",
      "details": {
        "nodeVersion": "v20.11.0",
        "platform": "linux"
      }
    }
  },
  "metadata": {
    "nodeVersion": "v20.11.0",
    "platform": "linux",
    "environment": "production"
  }
}
```

**Status Codes:**
- `200 OK`: System healthy or degraded
- `503 Service Unavailable`: System unhealthy

**Headers:**
- `Cache-Control`: `no-cache, no-store, must-revalidate`
- `X-Response-Time`: `45ms`
- `X-Health-Status`: `healthy` | `degraded` | `unhealthy`

### `HEAD /api/health`

**Purpose:** Lightweight health check (no response body)

**Status Codes:**
- `200 OK`: System healthy
- `503 Service Unavailable`: System unhealthy

**Headers:**
- `Cache-Control`: `no-cache, no-store, must-revalidate`

## Health Check Components

### 1. Database Check

**Test:** `SELECT 1` query to verify connectivity

**Pass Criteria:**
- Query succeeds
- Response time < 100ms

**Warn Criteria:**
- Query succeeds
- Response time >= 100ms

**Fail Criteria:**
- Query fails (connection error, timeout, etc.)

**Metrics:**
- `responseTime`: Query execution time in milliseconds

### 2. Memory Check

**Test:** Process memory usage via `process.memoryUsage()`

**Pass Criteria:**
- Heap usage < 80%

**Warn Criteria:**
- Heap usage >= 80% and < 90%

**Fail Criteria:**
- Heap usage >= 90%

**Metrics:**
- `heapUsed`: Used heap memory in MB
- `heapTotal`: Total heap memory in MB
- `heapUsedPercent`: Percentage of heap used
- `rss`: Resident Set Size (total memory)
- `external`: External memory (C++ objects)

### 3. Dependencies Check

**Test:** Verify critical environment variables

**Required Variables (Fail if missing):**
- `DATABASE_URL`: PostgreSQL connection string
- `NEXTAUTH_SECRET`: NextAuth.js JWT secret
- `SESSION_SECRET`: Session encryption secret

**Optional Variables (Warn if missing):**
- `ABSTRACT_CHAIN_ID`: Blockchain network ID
- `ABSTRACT_RPC_URL`: RPC endpoint URL
- `DISCORD_CLIENT_ID`: Discord OAuth client
- `TWITTER_CLIENT_ID`: Twitter OAuth client

**Pass Criteria:**
- All required variables present

**Warn Criteria:**
- All required variables present
- Some optional variables missing

**Fail Criteria:**
- Any required variable missing

## Status Determination Logic

### Overall Status Calculation

```typescript
if (any check fails) {
  overallStatus = 'unhealthy'
} else if (any check warns) {
  overallStatus = 'degraded'
} else {
  overallStatus = 'healthy'
}
```

### HTTP Status Code Mapping

```typescript
overallStatus === 'unhealthy' ? 503 : 200
```

**Rationale:**
- `503 Service Unavailable` triggers load balancer failover
- `200 OK` keeps instance in load balancer pool (even if degraded)
- Degraded systems can still serve traffic with reduced performance

## Integration with Monitoring Tools

### Datadog

**Configuration:**
```yaml
# datadog/conf.d/http_check.d/conf.yaml
init_config:

instances:
  - name: PeBloq Health Check
    url: https://pebloq.vercel.app/api/health
    timeout: 5
    http_response_status_code: 200
    check_certificate_expiration: true
    days_warning: 14
    days_critical: 7
    tags:
      - service:pebloq
      - env:production
```

**Metrics:**
- `http.response_time`: Health check response time
- `http.status_code`: HTTP status code (200 or 503)
- Custom metrics from response body (JSON parsing)

### Grafana

**Dashboard Query (Prometheus):**
```promql
# Health status (0 = unhealthy, 1 = degraded, 2 = healthy)
pebloq_health_status{instance="prod"}

# Database response time
pebloq_health_database_response_time_ms{instance="prod"}

# Memory usage percentage
pebloq_health_memory_heap_percent{instance="prod"}
```

**Alerts:**
```yaml
# Unhealthy status
- alert: PeBloqUnhealthy
  expr: pebloq_health_status < 1
  for: 2m
  annotations:
    summary: "PeBloq is unhealthy"

# Degraded status
- alert: PeBloqDegraded
  expr: pebloq_health_status == 1
  for: 5m
  annotations:
    summary: "PeBloq is degraded"

# High memory usage
- alert: PeBloqHighMemory
  expr: pebloq_health_memory_heap_percent > 80
  for: 5m
  annotations:
    summary: "PeBloq memory usage high"
```

### Axiom

**Log Ingestion:**
```bash
curl -X POST 'https://api.axiom.co/v1/datasets/pebloq-health/ingest' \
  -H 'Authorization: Bearer <token>' \
  -H 'Content-Type: application/json' \
  -d @health_check_response.json
```

**Query (APL - Axiom Processing Language):**
```apl
['pebloq-health']
| where status == "unhealthy"
| summarize count() by bin(timestamp, 5m)
```

### Vercel

**Health Check Configuration:**
```json
{
  "healthChecks": {
    "/api/health": {
      "path": "/api/health",
      "initialDelaySeconds": 30,
      "periodSeconds": 10,
      "failureThreshold": 3,
      "successThreshold": 1
    }
  }
}
```

## Testing Checklist

### Manual Testing

- [ ] **Basic Health Check**
  ```bash
  curl -i https://pebloq.vercel.app/api/health
  # Expected: 200 OK, status: "healthy"
  ```

- [ ] **Detailed Health Check**
  ```bash
  curl https://pebloq.vercel.app/api/health?detailed=true | jq
  # Expected: Includes metadata object
  ```

- [ ] **HEAD Request**
  ```bash
  curl -I https://pebloq.vercel.app/api/health
  # Expected: 200 OK, no body
  ```

- [ ] **Response Headers**
  ```bash
  curl -i https://pebloq.vercel.app/api/health | grep -E "Cache-Control|X-Response-Time|X-Health-Status"
  # Expected: All headers present
  ```

- [ ] **Version Verification**
  ```bash
  curl https://pebloq.vercel.app/api/health | jq .version
  # Expected: "2.7.4"
  ```

### Automated Testing

```typescript
// Test: Healthy system returns 200
describe('GET /api/health', () => {
  it('should return 200 for healthy system', async () => {
    const response = await fetch('/api/health')
    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data.status).toBe('healthy')
    expect(data.version).toBe('2.7.4')
  })

  it('should include all health checks', async () => {
    const response = await fetch('/api/health')
    const data = await response.json()

    expect(data.checks).toHaveProperty('database')
    expect(data.checks).toHaveProperty('memory')
    expect(data.checks).toHaveProperty('dependencies')
  })

  it('should return 503 for unhealthy system', async () => {
    // Mock database failure
    jest.spyOn(prisma, '$queryRaw').mockRejectedValue(new Error('Connection failed'))

    const response = await fetch('/api/health')
    expect(response.status).toBe(503)

    const data = await response.json()
    expect(data.status).toBe('unhealthy')
    expect(data.checks.database.status).toBe('fail')
  })

  it('should not cache response', async () => {
    const response = await fetch('/api/health')
    const cacheControl = response.headers.get('Cache-Control')

    expect(cacheControl).toContain('no-cache')
    expect(cacheControl).toContain('no-store')
  })
})

// Test: HEAD request returns status only
describe('HEAD /api/health', () => {
  it('should return 200 with no body', async () => {
    const response = await fetch('/api/health', { method: 'HEAD' })
    expect(response.status).toBe(200)

    const text = await response.text()
    expect(text).toBe('')
  })
})
```

### Performance Testing

- [ ] **Response Time**
  ```bash
  for i in {1..100}; do
    curl -w "%{time_total}\n" -o /dev/null -s https://pebloq.vercel.app/api/health
  done | awk '{sum+=$1; count++} END {print "Average:", sum/count "s"}'
  # Expected: < 0.1s average
  ```

- [ ] **Concurrent Requests**
  ```bash
  ab -n 1000 -c 50 https://pebloq.vercel.app/api/health
  # Expected: No failures, consistent response times
  ```

### Failure Simulation

- [ ] **Database Failure**
  - Stop database temporarily
  - Check health endpoint returns 503
  - Verify database check status is "fail"
  - Restart database
  - Verify health endpoint returns 200

- [ ] **Memory Pressure**
  - Simulate high memory usage (create large objects)
  - Verify memory check status is "warn" or "fail"
  - Check overall status reflects memory pressure

- [ ] **Missing Environment Variables**
  - Temporarily unset SESSION_SECRET
  - Verify dependencies check status is "fail"
  - Restore environment variable

## Production Monitoring Setup

### Uptime Monitoring Services

**Recommended:**
1. **Datadog Synthetics**: 1-minute intervals, multi-region
2. **Pingdom**: 1-minute intervals, alerting
3. **UptimeRobot**: 5-minute intervals (free tier)

**Configuration Example (Datadog):**
```json
{
  "name": "PeBloq Health Check",
  "type": "api",
  "subtype": "http",
  "config": {
    "request": {
      "method": "GET",
      "url": "https://pebloq.vercel.app/api/health"
    },
    "assertions": [
      {
        "type": "statusCode",
        "operator": "is",
        "target": 200
      },
      {
        "type": "responseTime",
        "operator": "lessThan",
        "target": 500
      },
      {
        "type": "body",
        "operator": "contains",
        "target": "healthy"
      }
    ]
  },
  "locations": ["aws:us-east-1", "aws:eu-west-1"],
  "options": {
    "tick_every": 60,
    "retry": {
      "count": 2,
      "interval": 30
    }
  }
}
```

### Alert Thresholds

**Critical Alerts (PagerDuty/SMS):**
- Health status = "unhealthy" for > 2 minutes
- Database check failing
- Response time > 5 seconds

**Warning Alerts (Slack/Email):**
- Health status = "degraded" for > 5 minutes
- Memory usage > 80%
- Database response time > 100ms

**Info Alerts (Logging only):**
- Optional dependencies missing
- Version change detected (deployment)

## Security Considerations

### Rate Limiting

Health check endpoint should NOT be rate limited to allow monitoring services unrestricted access.

**Exception in rate-limit middleware:**
```typescript
if (request.nextUrl.pathname === '/api/health') {
  return NextResponse.next()
}
```

### Authentication

Health check endpoint is intentionally **unauthenticated** for monitoring purposes.

**Rationale:**
- Monitoring services need unrestricted access
- No sensitive data exposed (only system metrics)
- Detailed metadata requires `?detailed=true` query param

### Information Disclosure

**Safe to expose:**
- Version number (useful for deployment tracking)
- Health status (public information)
- Uptime (non-sensitive)
- Generic error messages

**Protected:**
- Specific database credentials
- Internal IP addresses
- Detailed error stack traces
- User data or application secrets

## Deployment Verification

### Post-Deployment Checklist

- [ ] Health check returns 200 OK
- [ ] Version number matches deployed version (2.7.4)
- [ ] Database check passes
- [ ] Memory check passes
- [ ] Dependencies check passes
- [ ] Response time < 500ms
- [ ] No errors in application logs
- [ ] Monitoring alerts configured

### Rollback Criteria

Rollback deployment if:
- Health check returns 503 for > 2 minutes
- Database check consistently fails
- Memory usage > 90%
- Error rate > 5%

---

**Operational Status:** ✅ Production Ready
**Monitoring:** Enabled
**Next Review:** 2025-11-07 (Monthly review)
