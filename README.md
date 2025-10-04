# Play History Service

A RESTful API service for tracking and managing user play history events with support for analytics, GDPR compliance, and idempotency guarantees.

## Table of Contents

- [Quick Start](#quick-start)
- [API Endpoints](#api-endpoints)
- [Architecture & Design Decisions](#architecture--design-decisions)
- [Testing](#testing)
- [Known Limitations](#known-limitations)
- [Future Improvements](#future-improvements)

## Quick Start

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- MongoDB 7.0+ (or use Docker)

### Installation

```bash
# Install dependencies
npm install

# Start MongoDB and application
docker compose up
```

The API will be available at `http://localhost:3000`

Swagger documentation: `http://localhost:3000/api-docs`

### Local Development

```bash
docker compose up mongo_db

# Run app without Docker
MONGODB_URI="mongodb://localhost:27017/play_history_db" npm run start:dev npm run start:dev
```


## API Endpoints

### Play Events

#### Create Play Event
```bash
POST /v1/play
Headers:
  x-idempotency-key: <UUID v4>
Body:
{
  "userId": "user123",
  "contentId": "movie456",
  "device": "mobile",
  "timestamp": "2025-09-30T12:00:00Z",
  "playbackDuration": 120
}
```

#### Get User History
```bash
GET /v1/history/:userId?limit=20&cursor=<cursor>
```

#### Get Most Watched Content
```bash
GET /v1/history/most-watched?from=2025-09-01T00:00:00Z&to=2025-09-30T23:59:59Z&limit=20
```

**Query Parameters:**
- `from` (required): Start date in ISO 8601 format (UTC)
- `to` (required): End date in ISO 8601 format (UTC)
- `limit` (optional): Number of results to return (default: 200, min: 1, max: 5000)

#### Anonymize User Data (GDPR)
```bash
PATCH /v1/history/:userId
```

### Health Check

```bash
GET /health
```


## Architecture & Design Decisions

### 1. **Event Hash for Duplicate Detection**

**Problem:** Users might accidentally submit the same play event multiple times (network retries, double-clicks, etc.)

**Solution:** Generate a SHA-256 hash from event content (`userId`, `contentId`, `device`, `timestamp`, `playbackDuration`) and create a unique compound index on `eventHash + userId`.

```typescript
// Prevents duplicate events regardless of idempotency key
const hash = generateContentHash(playEvent);
```

**Benefits:**
- Prevents logical duplicates even with different idempotency keys
- MongoDB handles deduplication at database level
- Supports distributed systems, and potential sharding on userId

**MongoDB Index:**
```javascript
{ eventHash: 1, userId: 1 } // Unique compound index
```

### 2. **Idempotency Key (UUID v4)**

**Problem:** Network issues can cause duplicate API requests

**Solution:** Require clients to send a `x-idempotency-key` header (UUID v4) with POST requests. The service maintains an in-memory cache of processed keys.

**Current Implementation:**
- In-memory Map for idempotency tracking
- Returns cached response for duplicate keys
- Client receives 201 request with expected data 

**Production Recommendation:**
```typescript
// Would use Redis for distributed idempotency
const cache = new Redis();
await cache.setex(idempotencyKey, 3600, JSON.stringify(response));
```

### 3. **Cursor-Based Pagination**

**Why not offset-based?**
- Offset/limit: `SKIP(1000)` scans and discards 1000 documents
- Cursor: Uses index directly, better performance

**Implementation:**
```typescript
// Cursor = last document's _id
db.find({ _id: { $gt: cursor } }).sort({ timestamp: -1 }).limit(20)
```

**Benefits:**
- O(1) performance regardless of page depth
- No missed/duplicate records with concurrent writes
- Better scalability

### 4. **MongoDB Aggregation for Analytics**

**Most-watched content uses aggregation pipeline:**

```typescript
[
  { $match: { timestamp: { $gte: start, $lte: end } } },
  { $group: { 
      _id: "$contentId", 
      totalPlayCount: { $sum: 1 } 
  }},
  { $sort: { totalPlayCount: -1 } },
  { $limit: limit } // Configurable: default 200, max 5000
]
```

**Query Parameters:**
- `from`, `to`: ISO 8601 date range (required)
- `limit`: Results to return (optional, default: 200, min: 1, max: 5000)

**Indexes:**
- `contentId_1` for grouping
- `timestamp_1` for date filtering

### 5. **GDPR Anonymization (Async Pattern)**

**Current Implementation:** Synchronous PATCH endpoint returns 200 (OK)

**Production Pattern:**
```typescript
// Would publish to message queue
await messageQueue.publish('gdpr.anonymize', { userId });
// Offload to worker process asynchronously in case of large dataset
```

**Why Message Queue?**
- Anonymization can take time (millions of records)
- Non-blocking for API
- Retry logic built-in
- Audit trail
- Dead-letter queue for failures


### 6. **API Versioning (v1)**

**Structure:**
**Future v2 Support:**
```typescript
@Module({
  imports: [V1Module, V2Module], // Side-by-side versioning
})
```

**Migration Strategy:**
- Keep v1 running during transition
- Gradual client migration
- Deprecation timeline

### 7. **Health Check Endpoint**

```bash
GET /health
Response:
{
  "status": "ok",
  "timestamp": "2025-10-04T12:00:00.000Z",
  "database": "connected"
}
```

**Monitors:**
- MongoDB connection state
- Ready for Kubernetes liveness/readiness probes


## Known Limitations

### 1. **No Database Health Check Failure Tests**

**Missing:** E2E tests for MongoDB connection failures

**TODO:**
```typescript
// Need to test:
it('should return 503 when database is unreachable', async () => {
  await mongoConnection.close();
  await request(app).get('/health').expect(503);
});
```

### 2. **No Authentication/Authorization** ⚠️

**Critical Missing Feature:**
- No user authentication
- No JWT validation
- No API keys

**Production Requirements:**
```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('user', 'admin')
async getUserHistory(@User() user, @Param('userId') userId) {
  // Verify user.id === userId or user has admin role
}
```

**Recommended Stack:**
- JWT tokens (access + refresh)
- OAuth2/OIDC (Auth0, Keycloak)
- API Gateway for centralized auth

### 3. **In-Memory Idempotency Cache**

**Current:** Single-instance Map

**Problem:** 
- Lost on restart
- Doesn't work in multi-instance deployments

**Solution:**
```typescript
// Use Redis for distributed cache
@Injectable()
export class IdempotencyService {
  async check(key: string): Promise<boolean> {
    return await this.redis.exists(key);
  }
  
  async store(key: string, response: any, ttl = 3600) {
    await this.redis.setex(key, ttl, JSON.stringify(response));
  }
}
```

### 4. **No Rate Limiting per User**

**Current:** Global rate limit (100 req/min)

**Need:** Per-user rate limiting

```typescript
ThrottlerModule.forRoot({
  throttlers: [{ ttl: 60000, limit: 100 }],
  skipIf: (context) => checkUserTier(context), 
})
```

### 5. **No Distributed Tracing**

**Missing:** Request correlation, distributed tracing

**Add:** OpenTelemetry, Jaeger, or Zipkin

```typescript
import { trace } from '@opentelemetry/api';
const span = trace.getTracer('play-history').startSpan('createPlayEvent');
```

### 6. **No Caching Layer**

**Current:** Every request hits MongoDB

**Add:** Redis caching for:
- Most-watched content (1-5 min TTL)
- User history (with cache invalidation)

```typescript
@Cacheable({ ttl: 300, key: 'most-watched:${from}:${to}' })
async getMostWatched(from: Date, to: Date) { ... }
```

### 7. **No Metrics/Monitoring**

**Missing:**
- Prometheus metrics
- Application Performance Monitoring (APM)
- Custom business metrics (events/sec, response times)

**Add:**
```typescript
@Injectable()
export class MetricsService {
  eventCounter = new Counter({ name: 'play_events_total' });
  responseTime = new Histogram({ name: 'http_request_duration_ms' });
}
```

### 8. **No Backup Strategy**

**Missing:**
- MongoDB backup procedures
- Point-in-time recovery
- Disaster recovery plan

### 9. **No Circuit Breaker**

**Missing:** Resilience patterns for MongoDB failures

**Add:** `@nestjs/terminus` with circuit breaker

## Future Improvements

### High Priority
- [ ] Add authentication/authorization (JWT, OAuth2)
- [ ] Implement Redis-based idempotency cache
- [ ] Add database health check failure tests
- [ ] Implement per-user rate limiting
- [ ] Implement message queue for GDPR anonymization


### Medium Priority
- [ ] Add Redis caching layer for analytics
- [ ] Add distributed tracing
- [ ] Add metrics for observability 
- [ ] Implement circuit breaker pattern 

