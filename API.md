# API Documentation

Complete API reference for the AI Call Center Agent.

## Base URL

```
Production: https://your-domain.com
Development: http://localhost:3000
```

## Authentication

Most admin endpoints require JWT authentication (to be implemented).

```typescript
// Add to request headers
Authorization: Bearer <your-jwt-token>
```

## Endpoints

### Twilio Webhooks

#### POST /api/twilio/voice

Handle incoming call from Twilio.

**Request (from Twilio):**
```
Content-Type: application/x-www-form-urlencoded

CallSid=CAxxxxx
From=+1234567890
To=+0987654321
CallStatus=ringing
```

**Response:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="wss://your-domain.com/api/twilio/stream">
      <Parameter name="callSid" value="CAxxxxx"/>
      <Parameter name="businessId" value="business-id"/>
    </Stream>
  </Connect>
</Response>
```

---

#### POST /api/twilio/status

Receive call status updates from Twilio.

**Request (from Twilio):**
```
CallSid=CAxxxxx
CallStatus=completed
CallDuration=125
RecordingUrl=https://...
```

**Response:**
```json
{
  "success": true
}
```

---

#### WS /api/twilio/stream

WebSocket endpoint for Twilio Media Streams.

**Messages from Twilio:**

```json
// Start event
{
  "event": "start",
  "start": {
    "callSid": "CAxxxxx",
    "streamSid": "MZxxxxx",
    "customParameters": {
      "businessId": "business-id"
    }
  }
}

// Media event (audio data)
{
  "event": "media",
  "media": {
    "payload": "base64-encoded-audio"
  }
}

// Stop event
{
  "event": "stop"
}
```

**Messages to Twilio:**

```json
{
  "event": "media",
  "streamSid": "MZxxxxx",
  "media": {
    "payload": "base64-encoded-audio"
  }
}
```

---

### RAG Content Management

#### GET /api/rag

Get all RAG contents for a business.

**Parameters:**
- `businessId` (required): Business ID

**Example:**
```bash
curl "https://your-domain.com/api/rag?businessId=biz123"
```

**Response:**
```json
[
  {
    "id": "rag1",
    "title": "Return Policy",
    "content": "Our return policy allows...",
    "category": "Policy",
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
]
```

---

#### POST /api/rag

Create new RAG content.

**Request Body:**
```json
{
  "businessId": "biz123",
  "title": "Shipping Information",
  "content": "We offer free shipping on orders over $50...",
  "category": "FAQ",
  "metadata": {
    "tags": ["shipping", "delivery"]
  }
}
```

**Response:**
```json
{
  "id": "rag2",
  "businessId": "biz123",
  "title": "Shipping Information",
  "content": "We offer free shipping on orders over $50...",
  "category": "FAQ",
  "metadata": {
    "tags": ["shipping", "delivery"]
  },
  "vectorId": "rag2",
  "isActive": true,
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

---

#### PUT /api/rag

Update existing RAG content.

**Request Body:**
```json
{
  "id": "rag2",
  "title": "Updated Shipping Information",
  "content": "We now offer free shipping on orders over $35...",
  "category": "FAQ",
  "isActive": true
}
```

**Response:**
```json
{
  "id": "rag2",
  "title": "Updated Shipping Information",
  "content": "We now offer free shipping on orders over $35...",
  "category": "FAQ",
  "isActive": true,
  "updatedAt": "2024-01-15T14:00:00Z"
}
```

---

#### DELETE /api/rag

Delete RAG content.

**Parameters:**
- `id` (required): Content ID

**Example:**
```bash
curl -X DELETE "https://your-domain.com/api/rag?id=rag2"
```

**Response:**
```json
{
  "success": true
}
```

---

### Configuration Management

#### GET /api/config

Get all configurations for a business.

**Parameters:**
- `businessId` (required): Business ID

**Example:**
```bash
curl "https://your-domain.com/api/config?businessId=biz123"
```

**Response:**
```json
{
  "ai_personality": {
    "text": "You are a friendly and helpful customer service agent..."
  },
  "greeting_message": {
    "text": "Hello! Thanks for calling. How can I help you today?"
  },
  "max_call_duration": {
    "text": "600"
  },
  "enable_recording": {
    "text": "true"
  }
}
```

---

#### POST /api/config

Update or create a single configuration.

**Request Body:**
```json
{
  "businessId": "biz123",
  "key": "greeting_message",
  "value": {
    "text": "Hi! Welcome to our store. How may I assist you?"
  },
  "type": "json"
}
```

**Response:**
```json
{
  "id": "config1",
  "businessId": "biz123",
  "key": "greeting_message",
  "value": {
    "text": "Hi! Welcome to our store. How may I assist you?"
  },
  "type": "json",
  "createdAt": "2024-01-15T10:00:00Z",
  "updatedAt": "2024-01-15T10:00:00Z"
}
```

---

#### PUT /api/config

Bulk update configurations.

**Request Body:**
```json
{
  "businessId": "biz123",
  "configurations": {
    "ai_personality": {
      "text": "You are professional and concise..."
    },
    "max_call_duration": {
      "text": "300"
    },
    "enable_recording": {
      "text": "false"
    }
  }
}
```

**Response:**
```json
{
  "success": true
}
```

---

### Call Logs & Analytics

#### GET /api/calls

Get call logs with filtering and pagination.

**Parameters:**
- `businessId` (required): Business ID
- `status` (optional): Filter by status
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 50)

**Example:**
```bash
curl "https://your-domain.com/api/calls?businessId=biz123&status=completed&page=1&limit=20"
```

**Response:**
```json
{
  "callLogs": [
    {
      "id": "call1",
      "callSid": "CAxxxxx",
      "fromNumber": "+1234567890",
      "toNumber": "+0987654321",
      "duration": 125,
      "status": "completed",
      "transcript": "User: Hello\nAI: Hi! How can I help you?",
      "summary": "Customer inquired about shipping policies",
      "sentiment": "positive",
      "resolvedIssue": true,
      "createdAt": "2024-01-15T10:00:00Z",
      "updatedAt": "2024-01-15T10:03:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

---

#### POST /api/calls

Get analytics and statistics.

**Request Body:**
```json
{
  "businessId": "biz123",
  "startDate": "2024-01-01",
  "endDate": "2024-01-31"
}
```

**Response:**
```json
{
  "totalCalls": 500,
  "completedCalls": 475,
  "averageDuration": 145,
  "sentiment": {
    "positive": 350,
    "neutral": 100,
    "negative": 50
  },
  "callsByStatus": {
    "completed": 475,
    "failed": 15,
    "busy": 10
  },
  "dailyCallVolume": [
    {
      "date": "2024-01-31",
      "count": 25
    },
    {
      "date": "2024-01-30",
      "count": 30
    }
  ]
}
```

---

## Data Models

### Business

```typescript
interface Business {
  id: string;
  name: string;
  domain: string; // e.g., "healthcare", "retail"
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
}
```

### RAG Content

```typescript
interface RAGContent {
  id: string;
  title: string;
  content: string;
  category: string;
  metadata?: object;
  vectorId?: string;
  embedding?: string;
  isActive: boolean;
  businessId: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Configuration

```typescript
interface Configuration {
  id: string;
  key: string;
  value: any; // JSON value
  type: string; // "string", "number", "boolean", "json"
  businessId: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Call Log

```typescript
interface CallLog {
  id: string;
  callSid: string;
  fromNumber: string;
  toNumber: string;
  duration?: number;
  status: string;
  recordingUrl?: string;
  transcript?: string;
  summary?: string;
  sentiment?: "positive" | "neutral" | "negative";
  resolvedIssue?: boolean;
  metadata?: object;
  businessId: string;
  createdAt: Date;
  updatedAt: Date;
}
```

---

## Error Responses

All endpoints return standard error responses:

```json
{
  "error": "Error message description",
  "code": "ERROR_CODE",
  "details": {
    // Additional error details
  }
}
```

### Common HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `404` - Not Found
- `500` - Internal Server Error

---

## Rate Limiting

API rate limits (to be implemented):

- **Admin APIs**: 1000 requests/hour
- **Webhook APIs**: Unlimited (from Twilio)

Rate limit headers:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640000000
```

---

## Webhooks

### Outgoing Webhooks

Configure webhooks to receive notifications about events.

#### Call Completed

```json
POST https://your-webhook-url.com/call-completed

{
  "event": "call.completed",
  "callId": "call1",
  "callSid": "CAxxxxx",
  "duration": 125,
  "transcript": "...",
  "sentiment": "positive"
}
```

#### Call Failed

```json
POST https://your-webhook-url.com/call-failed

{
  "event": "call.failed",
  "callId": "call1",
  "callSid": "CAxxxxx",
  "error": "Connection timeout"
}
```

---

## SDK Examples

### JavaScript/TypeScript

```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: 'https://your-domain.com',
  headers: {
    'Authorization': `Bearer ${YOUR_TOKEN}`,
    'Content-Type': 'application/json'
  }
});

// Create RAG content
const createContent = async () => {
  const response = await api.post('/api/rag', {
    businessId: 'biz123',
    title: 'FAQ Item',
    content: 'Content here...',
    category: 'FAQ'
  });
  return response.data;
};

// Get call logs
const getCallLogs = async () => {
  const response = await api.get('/api/calls', {
    params: {
      businessId: 'biz123',
      page: 1,
      limit: 20
    }
  });
  return response.data;
};
```

### Python

```python
import requests

BASE_URL = "https://your-domain.com"
TOKEN = "your-jwt-token"

headers = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json"
}

# Create RAG content
response = requests.post(
    f"{BASE_URL}/api/rag",
    headers=headers,
    json={
        "businessId": "biz123",
        "title": "FAQ Item",
        "content": "Content here...",
        "category": "FAQ"
    }
)
data = response.json()

# Get call logs
response = requests.get(
    f"{BASE_URL}/api/calls",
    headers=headers,
    params={
        "businessId": "biz123",
        "page": 1,
        "limit": 20
    }
)
logs = response.json()
```

### cURL

```bash
# Create RAG content
curl -X POST https://your-domain.com/api/rag \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "businessId": "biz123",
    "title": "FAQ Item",
    "content": "Content here...",
    "category": "FAQ"
  }'

# Get call logs
curl -X GET "https://your-domain.com/api/calls?businessId=biz123&page=1&limit=20" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Testing

### Test Twilio Webhook Locally

Use ngrok to expose local server:

```bash
# Start ngrok
ngrok http 3000

# Use the ngrok URL in Twilio console
# e.g., https://abc123.ngrok.io/api/twilio/voice
```

### Test with Postman

Import the Postman collection (to be created):

```bash
# Download collection
curl -O https://your-domain.com/postman-collection.json

# Import in Postman
```

---

## Versioning

API versioning (future):

```
/api/v1/rag
/api/v2/rag
```

Current version: v1 (implicit)

---

## Support

For API support:
- Email: api-support@example.com
- Documentation: https://docs.your-domain.com
- Status Page: https://status.your-domain.com
