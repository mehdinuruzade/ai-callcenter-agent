# Development Environment Testing Guide

Complete guide for testing your AI Call Center Agent locally with ngrok.

## 🎯 Testing Strategy

Test in phases as you implement:
1. **Phase 1**: Vector Service & RAG (Local only)
2. **Phase 2**: API Routes (Local only)
3. **Phase 3**: Real-time Voice (Requires ngrok)

---

## 📋 Prerequisites Checklist

Before starting, ensure you have:

```bash
# Check Node.js version (need 18+)
node --version

# Check PostgreSQL is running
psql --version

# Check if ngrok is installed
ngrok version

# If not installed:
# Download from https://ngrok.com/download
# Or: brew install ngrok (macOS)
```

---

## 🚀 Initial Setup

### 1. Install Dependencies

```bash
cd ai-callcenter-agent
npm install
```

### 2. Setup Environment Variables

```bash
cp .env.example .env
```

Edit `.env`:
```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/callcenter?schema=public"

# Twilio (get from https://console.twilio.com)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# OpenAI (get from https://platform.openai.com)
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxx

# Pinecone (get from https://app.pinecone.io)
PINECONE_API_KEY=xxxxxxxxxxxxx
PINECONE_INDEX_NAME=callcenter-rag

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

### 3. Setup Database

```bash
# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Open Prisma Studio (optional - great for viewing data)
npm run prisma:studio
# Opens at http://localhost:5555
```

### 4. Create Pinecone Index

1. Go to https://app.pinecone.io
2. Click "Create Index"
3. Settings:
   - **Name**: `callcenter-rag`
   - **Dimensions**: `1536`
   - **Metric**: `cosine`
   - **Cloud**: AWS (free tier)
   - **Region**: us-east-1 (or closest to you)

---

## 🧪 Phase 1: Testing Vector Service & RAG

**What you're testing:** OpenAI embeddings + Pinecone vector search

### Test 1: Vector Service Functions

Create a test file: `src/lib/__test-vector.ts`

```typescript
import { vectorService } from './vector-service';

async function testVectorService() {
  console.log('🧪 Testing Vector Service...\n');

  // Test 1: Generate embedding
  console.log('1️⃣ Testing generateEmbedding...');
  const embedding = await vectorService.generateEmbedding('Hello world');
  console.log(`✅ Embedding length: ${embedding.length}`); // Should be 1536
  console.log(`✅ First values: [${embedding.slice(0, 3).join(', ')}...]`);

  // Test 2: Upsert content
  console.log('\n2️⃣ Testing upsertContent...');
  const result = await vectorService.upsertContent(
    'test-1',
    'Our product costs $99 per month and includes 24/7 support.',
    {
      businessId: 'test-business',
      title: 'Pricing Information',
      category: 'FAQ'
    }
  );
  console.log('✅ Content upserted:', result.id);

  // Test 3: Query content
  console.log('\n3️⃣ Testing queryContent...');
  const results = await vectorService.queryContent(
    'how much does it cost',
    'test-business',
    3
  );
  console.log(`✅ Found ${results.length} results`);
  results.forEach((r, i) => {
    console.log(`   ${i + 1}. ${r.metadata?.title} (score: ${r.score})`);
  });

  // Test 4: Delete content
  console.log('\n4️⃣ Testing deleteContent...');
  await vectorService.deleteContent('test-1');
  console.log('✅ Content deleted');

  console.log('\n🎉 All vector service tests passed!');
}

testVectorService().catch(console.error);
```

**Run the test:**

```bash
# Start your dev server
npm run dev

# In another terminal, run the test
npx tsx src/lib/__test-vector.ts
```

**Expected output:**
```
🧪 Testing Vector Service...

1️⃣ Testing generateEmbedding...
✅ Embedding length: 1536
✅ First values: [0.0123, -0.0456, 0.0789...]

2️⃣ Testing upsertContent...
✅ Content upserted: test-1

3️⃣ Testing queryContent...
✅ Found 1 results
   1. Pricing Information (score: 0.89)

4️⃣ Testing deleteContent...
✅ Content deleted

🎉 All vector service tests passed!
```

### Test 2: RAG API Routes

**Using curl or Postman:**

```bash
# Test 1: Create RAG content (POST)
curl -X POST http://localhost:3000/api/rag \
  -H "Content-Type: application/json" \
  -d '{
    "businessId": "test-biz-1",
    "title": "Product Pricing",
    "content": "Our basic plan is $49/month, pro plan is $99/month.",
    "category": "FAQ"
  }'

# Test 2: List RAG content (GET)
curl "http://localhost:3000/api/rag?businessId=test-biz-1"

# Test 3: Update RAG content (PUT)
curl -X PUT http://localhost:3000/api/rag \
  -H "Content-Type: application/json" \
  -d '{
    "id": "clxxx...",
    "title": "Updated Pricing",
    "content": "New prices: Basic $39/mo, Pro $89/mo",
    "category": "FAQ"
  }'

# Test 4: Delete RAG content (DELETE)
curl -X DELETE "http://localhost:3000/api/rag?id=clxxx..."
```

**Using Prisma Studio:**

```bash
npm run prisma:studio
```

Navigate to `RAGContent` table to see your data.

---

## 🧪 Phase 2: Testing Configuration & Calls APIs

### Test Configuration API

```bash
# Create configuration
curl -X POST http://localhost:3000/api/config \
  -H "Content-Type: application/json" \
  -d '{
    "businessId": "test-biz-1",
    "key": "ai_personality",
    "value": {"text": "friendly and professional"},
    "type": "json"
  }'

# Get configurations
curl "http://localhost:3000/api/config?businessId=test-biz-1"

# Bulk update
curl -X PUT http://localhost:3000/api/config \
  -H "Content-Type: application/json" \
  -d '{
    "businessId": "test-biz-1",
    "configurations": {
      "ai_personality": {"text": "friendly and professional"},
      "greeting_message": {"text": "Hello! Thanks for calling."},
      "max_call_duration": {"seconds": 300}
    }
  }'
```

### Test Calls API

```bash
# Get call logs
curl "http://localhost:3000/api/calls?businessId=test-biz-1&page=1&limit=10"

# Get analytics
curl -X POST http://localhost:3000/api/calls \
  -H "Content-Type: application/json" \
  -d '{
    "businessId": "test-biz-1",
    "startDate": "2024-01-01",
    "endDate": "2024-12-31"
  }'
```

---

## 🧪 Phase 3: Testing Real-time Voice (The Big One!)

### Setup Ngrok

**Terminal 1: Start Next.js**
```bash
npm run dev
```

**Terminal 2: Start ngrok**
```bash
ngrok http 3000
```

**Output:**
```
ngrok

Session Status                online
Account                       Your Name (Plan: Free)
Version                       3.x.x
Region                        United States (us)
Latency                       20ms
Web Interface                 http://127.0.0.1:4040
Forwarding                    https://abc123.ngrok-free.app -> http://localhost:3000

Connections                   ttl     opn     rt1     rt5     p50     p90
                              0       0       0.00    0.00    0.00    0.00
```

**Copy your ngrok URL:** `https://abc123.ngrok-free.app`

### Update Environment Variable

```bash
# .env
NEXT_PUBLIC_APP_URL=https://abc123.ngrok-free.app
```

**Restart your dev server** (Terminal 1)

### Configure Twilio

1. Go to https://console.twilio.com
2. Navigate to **Phone Numbers** → **Manage** → **Active Numbers**
3. Click your phone number
4. Under **Voice Configuration**:
   - **A CALL COMES IN**:
     - Webhook: `https://abc123.ngrok-free.app/api/twilio/voice`
     - HTTP POST
   - **CALL STATUS CHANGES**:
     - Webhook: `https://abc123.ngrok-free.app/api/twilio/status`
     - HTTP POST
5. Click **Save**

### Create Test Data

**Add a business and phone number:**

```typescript
// Run in Prisma Studio or create a seed script
// src/lib/__test-data.ts

import { prisma } from './prisma';

async function createTestData() {
  // Create business
  const business = await prisma.business.create({
    data: {
      name: 'Test Coffee Shop',
      domain: 'restaurant',
      description: 'A test coffee shop',
      userId: 'test-user' // You'll need to create a user first
    }
  });

  console.log('✅ Business created:', business.id);

  // Add phone number
  const phoneNumber = await prisma.phoneNumber.create({
    data: {
      number: '+1234567890', // Your Twilio number
      friendlyName: 'Main Line',
      businessId: business.id
    }
  });

  console.log('✅ Phone number added:', phoneNumber.number);

  // Add configuration
  await prisma.configuration.createMany({
    data: [
      {
        businessId: business.id,
        key: 'ai_personality',
        value: { text: 'friendly, warm, and helpful' },
        type: 'json'
      },
      {
        businessId: business.id,
        key: 'greeting_message',
        value: { text: 'Hello! Thanks for calling Test Coffee Shop. How can I help you today?' },
        type: 'json'
      }
    ]
  });

  console.log('✅ Configurations added');

  // Add some RAG content (after implementing vector service)
  const content = await prisma.rAGContent.create({
    data: {
      businessId: business.id,
      title: 'Menu Items',
      content: 'We serve espresso ($3), latte ($4), and cappuccino ($4.50). We also have pastries and sandwiches.',
      category: 'FAQ'
    }
  });

  console.log('✅ RAG content added:', content.id);

  // Don't forget to add to Pinecone too!
  // (This requires your vector service to be implemented)
}

createTestData().catch(console.error);
```

### Make a Test Call

**Option 1: Call from your phone**

```bash
# Just dial your Twilio number from your phone!
```

**What to watch:**

**Terminal 1 (Next.js dev server):**
```
New Twilio WebSocket connection
Session started: CAxxxxxxxxxxxxx
RealtimeClient connected for call: CAxxxxxxxxxxxxx
User said: hello
AI said: Hello! Thanks for calling Test Coffee Shop. How can I help you today?
User said: what do you serve
RAG query: what do you serve
AI said: We serve espresso for $3, latte for $4, and cappuccino for $4.50...
```

**Terminal 3 (ngrok inspector):**
```bash
# Open in browser
http://127.0.0.1:4040
```

This shows all HTTP requests to your server:
- POST /api/twilio/voice
- POST /api/twilio/status
- WebSocket upgrade to /api/twilio/stream

### Test Scenarios

**Scenario 1: Basic Conversation**
```
You: "Hello"
AI: "Hello! Thanks for calling Test Coffee Shop..."
✅ Check: AI responds with greeting from config
```

**Scenario 2: RAG Query**
```
You: "What coffee drinks do you have?"
AI: "We serve espresso, latte, and cappuccino..."
✅ Check: AI uses knowledge base (check console for "RAG query")
```

**Scenario 3: Complex Question**
```
You: "How much is a latte and do you have WiFi?"
AI: "A latte is $4. Let me check about WiFi..."
✅ Check: Multiple RAG queries if needed
```

**Scenario 4: Call Completion**
```
You: Hang up
✅ Check: Transcript saved in database
✅ Check: Call log updated with duration
```

### Verify in Database

```bash
npm run prisma:studio
```

Check:
- **CallLog** table → See your test call
- **transcript** field → Full conversation
- **duration** field → Call length
- **status** field → "completed"

---

## 🐛 Debugging Tips

### Enable Verbose Logging

Add to your code:

```typescript
// src/lib/realtime-service.ts

console.log('🔵 Session created:', session.callSid);
console.log('🟢 RealtimeClient connected');
console.log('🗣️ User said:', transcript);
console.log('🤖 AI said:', aiResponse);
console.log('🔍 RAG query:', query);
```

### Common Issues

**1. "Cannot connect to database"**
```bash
# Check PostgreSQL is running
psql -U postgres -c "SELECT 1"

# Check DATABASE_URL in .env
echo $DATABASE_URL
```

**2. "ngrok tunnel not found"**
```bash
# Free ngrok tunnels expire after 2 hours
# Just restart ngrok and update Twilio webhooks
ngrok http 3000
```

**3. "No audio in call"**
```typescript
// Check audio format
input_audio_format: 'g711_ulaw',  // Must be g711_ulaw for Twilio
output_audio_format: 'g711_ulaw'
```

**4. "RealtimeClient not defined"**
```bash
# Install dependencies
npm install
# Check import
import { RealtimeClient } from '@openai/realtime-api-beta';
```

**5. "Twilio webhook 403 Forbidden"**
```bash
# ngrok free tier requires manual webhook updates
# Each time you restart ngrok, update Twilio webhooks
```

### Ngrok Inspector

**Super helpful for debugging!**

```bash
# Open in browser
http://127.0.0.1:4040
```

You'll see:
- All HTTP requests to your server
- Request/response bodies
- Timing information
- Great for debugging webhook issues

---

## 📊 Testing Checklist

### Phase 1: Vector Service ✅
- [ ] `generateEmbedding()` returns 1536-dimension array
- [ ] `upsertContent()` adds to Pinecone
- [ ] `queryContent()` finds similar content
- [ ] `deleteContent()` removes from Pinecone
- [ ] RAG API POST creates content
- [ ] RAG API GET lists content
- [ ] RAG API PUT updates content
- [ ] RAG API DELETE removes content

### Phase 2: Configuration & Calls APIs ✅
- [ ] Config API POST creates/updates config
- [ ] Config API GET retrieves configs
- [ ] Config API PUT bulk updates
- [ ] Calls API GET returns paginated logs
- [ ] Calls API POST returns analytics

### Phase 3: Real-time Voice ✅
- [ ] ngrok tunnel working
- [ ] Twilio webhooks configured
- [ ] WebSocket connections established
- [ ] Audio flowing: You → Twilio → Server → OpenAI
- [ ] Audio flowing: OpenAI → Server → Twilio → You
- [ ] Transcriptions captured
- [ ] RAG queries triggered
- [ ] Knowledge base results used in responses
- [ ] Transcripts saved to database
- [ ] Call logs created/updated
- [ ] Can end call gracefully

---

## 🎯 Quick Test Commands

**Start everything:**
```bash
# Terminal 1
npm run dev

# Terminal 2
ngrok http 3000

# Terminal 3 (optional)
npm run prisma:studio

# Browser
open http://127.0.0.1:4040  # ngrok inspector
```

**Test APIs:**
```bash
# Quick health check
curl http://localhost:3000/api/health

# Test RAG
curl http://localhost:3000/api/rag?businessId=test

# Test config
curl http://localhost:3000/api/config?businessId=test
```

**Monitor logs:**
```bash
# Watch server logs in Terminal 1
# Look for:
# - "New Twilio WebSocket connection"
# - "RealtimeClient connected"
# - "User said: ..."
# - "AI said: ..."
# - "RAG query: ..."
```

---

## 🚀 Pro Tips

1. **Use VS Code's REST Client extension** for testing APIs
   ```http
   ### Create RAG Content
   POST http://localhost:3000/api/rag
   Content-Type: application/json

   {
     "businessId": "test",
     "title": "Test",
     "content": "Test content"
   }
   ```

2. **Keep ngrok inspector open** - invaluable for debugging webhooks

3. **Use Prisma Studio** - visual database browser is super helpful

4. **Test incrementally** - Don't implement everything then test

5. **Save your ngrok URL** - Use reserved domain (paid) to avoid updating webhooks

6. **Record test calls** - Enable recording in Twilio to review calls

7. **Monitor OpenAI costs** - Check https://platform.openai.com/usage

---

## 🎓 Next Steps

Once basic tests pass:

1. **Add more RAG content** - Build up knowledge base
2. **Test edge cases** - Long calls, interruptions, etc.
3. **Load test** - Multiple concurrent calls
4. **Admin panel** - Test the UI (if implemented)
5. **Production deployment** - Deploy to Railway/Render

---

Happy testing! 🎉

**Remember:** Test each phase completely before moving to the next. Phase 3 is easiest to debug when Phases 1 & 2 are solid.
