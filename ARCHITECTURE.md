# System Architecture

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         User (Caller)                           │
└────────────────────────────┬────────────────────────────────────┘
                             │ Phone Call
                             ▼
                    ┌─────────────────┐
                    │  Twilio Voice   │
                    │   & Streams     │
                    └────────┬────────┘
                             │ WebSocket (Audio)
                             ▼
┌────────────────────────────────────────────────────────────────┐
│                    Application Server                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                     Next.js Backend                       │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │  │
│  │  │  Twilio WS  │  │ OpenAI WS   │  │  Admin API  │     │  │
│  │  │   Handler   │  │   Handler   │  │  Routes     │     │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘     │  │
│  │                                                           │  │
│  │  ┌─────────────────────────────────────────────────┐    │  │
│  │  │         Real-time Service Layer                  │    │  │
│  │  │  - Session Management                            │    │  │
│  │  │  - Audio Streaming                               │    │  │
│  │  │  - Transcript Processing                         │    │  │
│  │  └─────────────────────────────────────────────────┘    │  │
│  │                                                           │  │
│  │  ┌─────────────────────────────────────────────────┐    │  │
│  │  │         Vector Service Layer                     │    │  │
│  │  │  - Embedding Generation                          │    │  │
│  │  │  - RAG Query Processing                          │    │  │
│  │  │  - Content Upsert/Delete                         │    │  │
│  │  └─────────────────────────────────────────────────┘    │  │
│  └──────────────────────────────────────────────────────────┘  │
└───────┬─────────────────┬─────────────────┬────────────────────┘
        │                 │                 │
        ▼                 ▼                 ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│ PostgreSQL  │  │  Pinecone   │  │   OpenAI    │
│  Database   │  │   Vector    │  │  Real-time  │
│             │  │     DB      │  │     API     │
└─────────────┘  └─────────────┘  └─────────────┘
```

## Data Flow Diagram

### Call Initialization Flow

```
Caller                Twilio              App Server           Database
  │                     │                      │                   │
  │─── Phone Call ─────▶│                      │                   │
  │                     │                      │                   │
  │                     │── POST /voice ──────▶│                   │
  │                     │                      │                   │
  │                     │                      │── Find Business ──▶│
  │                     │                      │◀── Business Info ──│
  │                     │                      │                   │
  │                     │                      │── Create Log ─────▶│
  │                     │◀─── TwiML Response ──│                   │
  │                     │                      │                   │
  │                     │── WebSocket Open ───▶│                   │
  │◀─── Connected ──────│                      │                   │
```

### Real-time Audio Flow

```
Caller        Twilio WS       App Server       OpenAI WS       Pinecone
  │               │                │                │              │
  │─── Speak ────▶│                │                │              │
  │               │── Audio Data ─▶│                │              │
  │               │                │── Audio Data ─▶│              │
  │               │                │                │              │
  │               │                │◀── AI Query ───│              │
  │               │                │                │              │
  │               │                │── Search RAG ─────────────────▶│
  │               │                │◀── Results ────────────────────│
  │               │                │                │              │
  │               │                │── Context ─────▶│              │
  │               │                │◀── Response ────│              │
  │               │                │                │              │
  │               │◀── Audio Data ─│                │              │
  │◀── AI Reply ──│                │                │              │
```

## Component Architecture

### Frontend (Admin Panel)

```
src/app/admin/
├── page.tsx              # Dashboard
├── businesses/           # Business management
├── rag/                  # Knowledge base editor
│   └── page.tsx         # RAG content CRUD
├── config/               # AI configuration
│   └── page.tsx         # Config editor
└── calls/                # Call logs & analytics
    └── page.tsx         # Logs viewer
```

### Backend API Routes

```
src/app/api/
├── twilio/
│   ├── voice/
│   │   └── route.ts     # Incoming call webhook
│   ├── status/
│   │   └── route.ts     # Call status callback
│   └── stream/
│       └── route.ts     # Media stream WebSocket
├── rag/
│   └── route.ts         # CRUD operations
├── config/
│   └── route.ts         # Configuration API
└── calls/
    └── route.ts         # Logs & analytics
```

### Service Layer

```
src/lib/
├── prisma.ts            # Database client
├── vector-service.ts    # Pinecone integration
│   ├── generateEmbedding()
│   ├── upsertContent()
│   ├── queryContent()
│   └── deleteContent()
├── realtime-service.ts  # OpenAI Real-time
│   ├── createSession()
│   ├── initializeOpenAI()
│   ├── handleIncomingAudio()
│   ├── handleFunctionCall()
│   └── endSession()
└── websocket-server.ts  # Twilio WebSocket
    └── setupWebSocketServer()
```

## Database Schema

```
┌──────────────┐       ┌──────────────┐
│     User     │       │   Business   │
├──────────────┤       ├──────────────┤
│ id           │◀──────│ id           │
│ email        │  1:N  │ name         │
│ password     │       │ domain       │
│ name         │       │ description  │
│ role         │       │ isActive     │
└──────────────┘       │ userId       │
                       └──────────────┘
                              │ 1:N
                    ┌─────────┴─────────┬──────────────┐
                    ▼                   ▼              ▼
            ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
            │  RAGContent  │   │Configuration │   │   CallLog    │
            ├──────────────┤   ├──────────────┤   ├──────────────┤
            │ id           │   │ id           │   │ id           │
            │ title        │   │ key          │   │ callSid      │
            │ content      │   │ value        │   │ fromNumber   │
            │ category     │   │ type         │   │ toNumber     │
            │ vectorId     │   │ businessId   │   │ duration     │
            │ businessId   │   └──────────────┘   │ status       │
            └──────────────┘                      │ transcript   │
                                                  │ sentiment    │
                                                  │ businessId   │
                                                  └──────────────┘
```

## Technology Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **UI**: React 18 with TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React Hooks

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Next.js API Routes
- **WebSocket**: ws library
- **Validation**: Zod

### Database
- **Primary**: PostgreSQL
- **ORM**: Prisma
- **Vector DB**: Pinecone

### External Services
- **Voice**: Twilio (Voice API + Media Streams)
- **AI**: OpenAI Real-time API
- **Embeddings**: OpenAI text-embedding-3-small

## Security Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Security Layers                       │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  1. Transport Layer                                      │
│     - HTTPS/TLS for all HTTP traffic                   │
│     - WSS for WebSocket connections                     │
│                                                          │
│  2. Authentication & Authorization                       │
│     - JWT tokens for admin access                       │
│     - Twilio signature validation                       │
│     - API key rotation                                  │
│                                                          │
│  3. Data Layer                                          │
│     - Encrypted database connections                    │
│     - Hashed passwords (bcrypt)                         │
│     - Environment variable protection                   │
│                                                          │
│  4. Application Layer                                    │
│     - Input validation (Zod schemas)                    │
│     - SQL injection prevention (Prisma ORM)             │
│     - XSS protection (React)                            │
│     - CSRF protection                                   │
│                                                          │
│  5. Rate Limiting                                        │
│     - API endpoint throttling                           │
│     - WebSocket connection limits                       │
│     - Database query optimization                       │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## Scaling Strategy

### Horizontal Scaling

```
                    ┌─────────────┐
                    │Load Balancer│
                    └──────┬──────┘
                           │
        ┏━━━━━━━━━━━━━━━━━┻━━━━━━━━━━━━━━━━━┓
        ▼                  ▼                  ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   App       │    │   App       │    │   App       │
│ Instance 1  │    │ Instance 2  │    │ Instance 3  │
└──────┬──────┘    └──────┬──────┘    └──────┬──────┘
       │                  │                  │
       └──────────────────┴──────────────────┘
                          │
                          ▼
                  ┌───────────────┐
                  │  PostgreSQL   │
                  │ Primary + Read│
                  │   Replicas    │
                  └───────────────┘
```

### Caching Strategy

```
┌──────────────┐
│   Request    │
└──────┬───────┘
       │
       ▼
┌──────────────┐    Hit    ┌──────────────┐
│    Redis     │◀──────────│  App Server  │
│    Cache     │            └──────────────┘
└──────┬───────┘
       │ Miss
       ▼
┌──────────────┐
│  PostgreSQL  │
│   Database   │
└──────────────┘
```

## Deployment Architecture

### Production Deployment

```
┌─────────────────────────────────────────────────────┐
│                     Region: US-East                  │
│                                                      │
│  ┌──────────────┐          ┌──────────────┐        │
│  │     CDN      │          │  DNS/Route53 │        │
│  │  (Static)    │          │              │        │
│  └──────────────┘          └──────────────┘        │
│                                                      │
│  ┌────────────────────────────────────────┐        │
│  │        Application Layer                │        │
│  │  ┌────────┐  ┌────────┐  ┌────────┐   │        │
│  │  │  App1  │  │  App2  │  │  App3  │   │        │
│  │  └────────┘  └────────┘  └────────┘   │        │
│  └────────────────────────────────────────┘        │
│                                                      │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────┐   │
│  │ PostgreSQL  │  │   Pinecone  │  │  Redis   │   │
│  │  (Primary)  │  │             │  │  Cache   │   │
│  └─────────────┘  └─────────────┘  └──────────┘   │
│         │                                           │
│         ▼                                           │
│  ┌─────────────┐                                   │
│  │ PostgreSQL  │                                   │
│  │  (Replica)  │                                   │
│  └─────────────┘                                   │
└─────────────────────────────────────────────────────┘
```

## Monitoring Architecture

```
┌──────────────────────────────────────────────────────┐
│                 Monitoring Stack                      │
├──────────────────────────────────────────────────────┤
│                                                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │   Metrics   │  │     Logs    │  │   Traces    │ │
│  │ (Prometheus)│  │  (Loki/ELK) │  │   (Jaeger)  │ │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘ │
│         │                │                │         │
│         └────────────────┴────────────────┘         │
│                          │                           │
│                          ▼                           │
│                 ┌─────────────────┐                 │
│                 │    Grafana      │                 │
│                 │   Dashboards    │                 │
│                 └─────────────────┘                 │
│                          │                           │
│                          ▼                           │
│                 ┌─────────────────┐                 │
│                 │  AlertManager   │                 │
│                 │   + PagerDuty   │                 │
│                 └─────────────────┘                 │
└──────────────────────────────────────────────────────┘
```

## Cost Optimization

### Resource Usage by Component

```
Component          | Cost/Month | Scaling Factor
-------------------|------------|---------------
App Hosting        | $50-200    | Linear
PostgreSQL         | $25-150    | Database size
Pinecone           | $70+       | Vector count
OpenAI API         | Variable   | Call volume
Twilio             | Variable   | Call minutes
Total Estimated    | $200-500+  | Based on usage
```

### Cost Reduction Strategies

1. **Caching**: Reduce database queries by 60-80%
2. **Query Optimization**: Batch operations where possible
3. **Right-sizing**: Monitor and adjust instance sizes
4. **Reserved Instances**: Commit for 1-3 years for 30-50% savings

## Performance Characteristics

### Expected Latency

- **HTTP API**: < 100ms (p95)
- **WebSocket Setup**: < 500ms
- **AI Response Time**: 1-3 seconds (first token)
- **RAG Query**: < 200ms
- **Database Query**: < 50ms

### Throughput

- **Concurrent Calls**: 50-100 per instance
- **API Requests**: 1000/second
- **WebSocket Connections**: 100/instance

## Disaster Recovery

### Backup Strategy

```
Daily Backups
    ├── PostgreSQL: Full backup @ 2 AM UTC
    ├── Retention: 30 days
    └── S3 Storage: Encrypted

Configuration Backup
    ├── Environment Variables
    ├── Pinecone Indexes
    └── Twilio Settings
```

### Recovery Procedures

1. Database restore: < 1 hour
2. Application redeployment: < 15 minutes
3. Full system recovery: < 2 hours

## Future Architecture Enhancements

1. **Multi-region Deployment**: For global availability
2. **Message Queue**: For asynchronous processing (Bull/Redis)
3. **Microservices**: Split monolith into services
4. **GraphQL API**: For flexible data querying
5. **Real-time Dashboard**: WebSocket-based live monitoring
