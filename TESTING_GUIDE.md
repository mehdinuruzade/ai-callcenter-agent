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

# Check if ngrok is installed
ngrok version

# If not installed:
# Download from https://ngrok.com/download
# Or: brew install ngrok (macOS)
```

**Required accounts:**
- Supabase account (free tier: https://supabase.com)
- OpenAI API key (https://platform.openai.com)
- Twilio account with phone number (https://console.twilio.com)

---

## 🚀 Initial Setup

### 1. Install Dependencies

```bash
cd ai-callcenter-agent
npm install
```

### 2. Setup Supabase

Follow the complete guide in `SUPABASE_SETUP.md`:

1. Create Supabase project at https://supabase.com
2. Enable **pgvector** extension (Database → Extensions)
3. Copy your database connection string (Project Settings → Database)

### 3. Setup Environment Variables

```bash
cp .env.example .env
```

Edit `.env`:
```env
# Database (Supabase PostgreSQL with pgvector)
DATABASE_URL="postgresql://postgres.[project-ref]:[PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres"

# Twilio (get from https://console.twilio.com)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# OpenAI (get from https://platform.openai.com)
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxx

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

### 4. Setup Database

```bash
# Generate Prisma client
npx prisma generate

# Run migrations to Supabase
npx prisma migrate dev --name init

# Open Prisma Studio (optional - great for viewing data)
npm run prisma:studio
# Opens at http://localhost:5555
```

### 5. Create Test Data

Run the setup script to create test business, phone number, and configurations:

```bash
npm run setup-test
```

This will create:
- Test user (test@example.com)
- Test business (Test Coffee Shop)
- Your Twilio phone number in the database
- Default AI personality and greeting configurations

**Important:** Make sure `TWILIO_PHONE_NUMBER` in `.env` matches your actual Twilio number!

---

## 🧪 Phase 1: Testing Vector Service & RAG

**What you're testing:** OpenAI embeddings + Supabase pgvector similarity search

**Note:** You'll need to implement the TODOs in `src/lib/vector-service.ts` first!

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
  await vectorService.upsertContent(
    'test-1',
    'Our product costs $99 per month and includes 24/7 support.',
    {
      businessId: 'test-business-1',
      title: 'Pricing Information',
      category: 'FAQ'
    }
  );
  console.log('✅ Content upserted: test-1');

  // Test 3: Query content
  console.log('\n3️⃣ Testing queryContent...');
  const results = await vectorService.queryContent(
    'how much does it cost',
    'test-business-1',
    3
  );
  console.log(`✅ Found ${results.length} results`);
  results.forEach((r, i) => {
    console.log(`   ${i + 1}. ${r.title} (distance: ${r.distance?.toFixed(4)})`);
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
   1. Pricing Information (distance: 0.1234)

4️⃣ Testing deleteContent...
✅ Content deleted

🎉 All vector service tests passed!
```

**Note:** Lower distance = more similar. Cosine distance of 0 = identical.

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

If you haven't already, run the setup script:

```bash
npm run setup-test
```

This creates:
- Test user
- Test Coffee Shop business
- Phone number mapping to your Twilio number
- Default configurations

**Verify in Prisma Studio:**

```bash
npm run prisma:studio
```

Check that you have:
- Business with id: `test-business-1`
- PhoneNumber matching your TWILIO_PHONE_NUMBER
- Configurations for `ai_personality` and `greeting_message`

### Make a Test Call

**Option 1: Call from your phone**

```bash
# Just dial your Twilio number from your phone!
```

**What to watch:**

**Terminal 1 (Custom server logs):**
```
📞 Incoming call webhook triggered
Call details - SID: CAxxxxx, From: +1234567890, To: +1234567890
✅ Found business: Test Coffee Shop (test-business-1)
✅ Call log created
🔗 Stream URL: wss://abc123.ngrok-free.app/api/twilio/stream
✅ TwiML response generated with Stream
✅ New Twilio WebSocket connection established
📨 Received event: start
🎬 Call started - SID: CAxxxxx, Business: test-business-1
📨 Received event: media
...
🛑 Call ended - SID: CAxxxxx
```

**Note:** You'll see TODOs for OpenAI integration since realtime-service.ts needs to be implemented.

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

**Current Status:** The WebSocket infrastructure is complete. You can test call routing and WebSocket connectivity now!

**Scenario 1: Call Routing Test** (Works now!)
```
Action: Call your Twilio number
Expected logs:
- "📞 Incoming call webhook triggered"
- "✅ Found business: Test Coffee Shop"
- "✅ Call log created"
- "✅ TwiML response generated with Stream"
✅ Check: Call is received and routed correctly
```

**Scenario 2: WebSocket Connection** (Works now!)
```
Action: Call stays connected
Expected logs:
- "✅ New Twilio WebSocket connection established"
- "📨 Received event: start"
- "🎬 Call started - SID: CAxxxxx, Business: test-business-1"
- Multiple "📨 Received event: media" (audio chunks)
✅ Check: WebSocket connection established and receiving audio
```

**Scenario 3: Call Termination** (Works now!)
```
Action: Hang up the call
Expected logs:
- "📨 Received event: stop"
- "🛑 Call ended - SID: CAxxxxx"
- "🔌 WebSocket connection closed"
✅ Check: Call ends gracefully
```

**Future Scenarios** (After implementing realtime-service.ts):
- AI greeting and conversation
- RAG knowledge base queries
- Transcript capture
- Full conversation flow

### Verify in Database

```bash
npm run prisma:studio
```

**Current Status:** Call logs are created automatically

Check:
- **CallLog** table → See your test call
- **callSid** field → Twilio call ID
- **fromNumber** / **toNumber** → Phone numbers
- **status** field → "initiated"
- **businessId** field → Links to test-business-1

**After implementing realtime-service.ts:**
- **transcript** field → Full conversation JSON
- **duration** field → Call length in seconds
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
# Verify Supabase connection string in .env
cat .env | grep DATABASE_URL

# Test connection with Prisma
npx prisma db pull

# Check Supabase project is active at https://app.supabase.com
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

**4. "WebSocket connection refused"**
```bash
# Make sure custom server is running
npm run dev

# Check server.js has WebSocket handling
# Verify NEXT_PUBLIC_APP_URL in .env
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
- [ ] `upsertContent()` stores vector in Supabase pgvector
- [ ] `queryContent()` finds similar content using cosine distance
- [ ] `deleteContent()` removes from Supabase
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
- [ ] WebSocket connections established (server.js)
- [ ] Call webhook receives calls (/api/twilio/voice)
- [ ] WebSocket receives 'start' event
- [ ] WebSocket receives 'media' events (audio chunks)
- [ ] WebSocket receives 'stop' event
- [ ] Call logs created in database
- [ ] After implementing realtime-service.ts:
  - [ ] Audio forwarded to OpenAI Real-time API
  - [ ] AI responses sent back to Twilio
  - [ ] Transcriptions captured
  - [ ] RAG queries triggered
  - [ ] Transcripts saved to database

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
# - "📞 Incoming call webhook triggered"
# - "✅ Found business: ..."
# - "✅ New Twilio WebSocket connection established"
# - "📨 Received event: start/media/stop"
# - "🎬 Call started - SID: ..."
# - "🛑 Call ended - SID: ..."
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
