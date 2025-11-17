# 🚀 Getting Started - AI Call Center Agent

Welcome! This repository is a **starter template** for building an AI-powered call center agent. All the implementation code has been removed and replaced with guided TODOs to help you learn by building.

## 📖 What's in This Repo?

✅ **Complete project structure** - Database schema, types, interfaces
✅ **Detailed implementation guides** - Step-by-step instructions
✅ **Starter code templates** - TODOs showing exactly what to implement
✅ **Modern architecture** - Using OpenAI RealtimeClient SDK
✅ **Production-ready setup** - Twilio, Pinecone, PostgreSQL, Next.js

## 🎯 Choose Your Implementation Guide

### **Option 1: RealtimeClient SDK (RECOMMENDED)** ⭐

**File:** [`IMPLEMENTATION_GUIDE_AGENTS.md`](./IMPLEMENTATION_GUIDE_AGENTS.md)

**Best for:**
- Cleaner, more maintainable code
- ~50% less code to write
- Built-in tool handling
- Better TypeScript support
- Official OpenAI SDK

**Technology:**
- `@openai/realtime-api-beta` package
- High-level abstractions
- Automatic function execution

**Start here if:** You want the simplest, most modern approach.

---

### **Option 2: Manual WebSocket Implementation**

**File:** [`IMPLEMENTATION_GUIDE.md`](./IMPLEMENTATION_GUIDE.md)

**Best for:**
- Learning low-level Real-time API details
- Full control over WebSocket communication
- Understanding protocol internals

**Technology:**
- Raw WebSocket connections
- Manual event handling
- Manual function call execution

**Start here if:** You want to deeply understand the Real-time API protocol.

---

## 🏗️ Architecture Comparison

See [`ARCHITECTURE_UPDATES.md`](./ARCHITECTURE_UPDATES.md) for detailed comparison between the two approaches.

**TL;DR:** Both achieve the same result, but RealtimeClient SDK is simpler and recommended for most use cases.

## 📋 Prerequisites

Before starting, you need:

- [ ] **Node.js 18+** installed
- [ ] **PostgreSQL** database
- [ ] **Twilio account** with phone number
- [ ] **OpenAI API key** with Real-time API access
- [ ] **Pinecone account** (free tier works)
- [ ] **Ngrok** for local testing (free)

## ⚡ Quick Start (15 minutes)

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your credentials:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/callcenter"
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890
OPENAI_API_KEY=sk-...
PINECONE_API_KEY=...
PINECONE_INDEX_NAME=callcenter-rag
```

### 3. Setup Database

```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:studio  # Optional: view database
```

### 4. Create Pinecone Index

1. Go to https://www.pinecone.io/
2. Create index:
   - **Name:** `callcenter-rag`
   - **Dimensions:** `1536` (for text-embedding-3-small)
   - **Metric:** `cosine`

### 5. Start Implementing!

**Choose your path:**

**Path A: RealtimeClient SDK (Recommended)**
```bash
# Follow IMPLEMENTATION_GUIDE_AGENTS.md
# Start with Phase 1: Vector Service
code src/lib/vector-service.ts
```

**Path B: Manual WebSocket**
```bash
# Follow IMPLEMENTATION_GUIDE.md
# Start with Phase 1: Vector Service
code src/lib/vector-service.ts
```

## 📚 Implementation Phases

### Phase 1: Vector/RAG System ⭐ (Easiest)
**Files:** `src/lib/vector-service.ts`, `src/app/api/rag/route.ts`
- Implement OpenAI embeddings
- Integrate Pinecone vector database
- Create RAG CRUD APIs
- **Estimated time:** 2-3 hours

### Phase 2: Configuration & APIs ⭐⭐ (Medium)
**Files:** `src/app/api/config/route.ts`, `src/app/api/calls/route.ts`
- Configuration management
- Call logs and analytics
- Business settings
- **Estimated time:** 2-3 hours

### Phase 3: Real-time Voice System ⭐⭐⭐ (Advanced)
**Files:** `src/lib/realtime-service.ts`, `src/lib/websocket-server.ts`, `src/app/api/twilio/**`
- Twilio integration
- OpenAI Real-time API (via SDK or manual)
- Audio streaming
- Session management
- **Estimated time:** 4-6 hours

## 🧪 Testing with Ngrok

Once you've implemented Phase 3, test with real calls:

```bash
# Terminal 1: Start app
npm run dev

# Terminal 2: Start ngrok
ngrok http 3000

# Copy your ngrok URL (e.g., https://abc123.ngrok.io)
```

**Configure Twilio:**
1. Go to Twilio Console → Phone Numbers
2. Set webhook: `https://abc123.ngrok.io/api/twilio/voice`
3. Call your Twilio number!

## 📊 Project Structure

```
ai-callcenter-agent/
├── src/
│   ├── lib/
│   │   ├── vector-service.ts       # TODO: Implement RAG
│   │   ├── realtime-service.ts     # TODO: Implement voice AI
│   │   └── websocket-server.ts     # TODO: Implement Twilio handler
│   └── app/api/
│       ├── rag/route.ts            # TODO: Knowledge base API
│       ├── config/route.ts         # TODO: Configuration API
│       ├── calls/route.ts          # TODO: Analytics API
│       └── twilio/                 # TODO: Twilio webhooks
├── prisma/
│   └── schema.prisma               # ✅ Complete (database schema)
├── IMPLEMENTATION_GUIDE_AGENTS.md  # 📖 RealtimeClient guide
├── IMPLEMENTATION_GUIDE.md         # 📖 Manual WebSocket guide
└── ARCHITECTURE_UPDATES.md         # 📖 Architecture comparison
```

## ✅ Success Checklist

- [ ] Phase 1: Vector service generates embeddings
- [ ] Phase 1: Pinecone queries working
- [ ] Phase 1: RAG API CRUD operations
- [ ] Phase 2: Configuration API working
- [ ] Phase 2: Call logs with pagination
- [ ] Phase 3: Twilio webhook creates calls
- [ ] Phase 3: WebSocket connections established
- [ ] Phase 3: Audio flows bidirectionally
- [ ] Phase 3: AI responds to voice
- [ ] Phase 3: RAG queries knowledge base
- [ ] Phase 3: Transcripts saved
- [ ] **🎉 End-to-end test call successful!**

## 🐛 Troubleshooting

### "Module not found: @openai/realtime-api-beta"
```bash
npm install
```

### Ngrok connection refused
```bash
# Make sure Next.js is running first
npm run dev
# Then start ngrok in another terminal
ngrok http 3000
```

### Pinecone dimension mismatch
- Index must be **1536 dimensions** for `text-embedding-3-small`
- Delete and recreate index if wrong

### No audio in calls
- Check audio format is `g711_ulaw` (Twilio format)
- Verify WebSocket connections in console logs

## 📚 Documentation Files

| File | Purpose |
|------|---------|
| [`START_HERE.md`](./START_HERE.md) | Quick navigation guide |
| [`README.md`](./README.md) | Full project overview |
| [`QUICKSTART.md`](./QUICKSTART.md) | 15-minute setup |
| [`IMPLEMENTATION_GUIDE_AGENTS.md`](./IMPLEMENTATION_GUIDE_AGENTS.md) | **RealtimeClient SDK guide** ⭐ |
| [`IMPLEMENTATION_GUIDE.md`](./IMPLEMENTATION_GUIDE.md) | Manual WebSocket guide |
| [`ARCHITECTURE_UPDATES.md`](./ARCHITECTURE_UPDATES.md) | Architecture comparison |
| [`API.md`](./API.md) | API reference |
| [`DEPLOYMENT.md`](./DEPLOYMENT.md) | Production deployment |

## 💡 Tips for Success

1. **Start with Phase 1** - Don't skip ahead!
2. **Test as you go** - Verify each function works before moving on
3. **Read the docs** - OpenAI and Twilio docs are your friends
4. **Use console.log** - Debug WebSocket connections liberally
5. **Follow the guide** - Each TODO has step-by-step instructions

## 🤝 Need Help?

- Check the implementation guides (detailed instructions)
- Review code comments (hints inline)
- Read external documentation (OpenAI, Twilio, Pinecone)
- Check troubleshooting sections

## 🎓 What You'll Learn

By completing this project, you'll learn:
- ✅ Real-time voice AI with OpenAI
- ✅ RAG (Retrieval-Augmented Generation)
- ✅ Vector databases (Pinecone)
- ✅ WebSocket communication
- ✅ Twilio telephony integration
- ✅ Next.js API routes
- ✅ Prisma ORM
- ✅ TypeScript best practices

## 🚀 Ready to Start?

1. **Choose your path**: RealtimeClient SDK (recommended) or Manual WebSocket
2. **Open the guide**: `IMPLEMENTATION_GUIDE_AGENTS.md` or `IMPLEMENTATION_GUIDE.md`
3. **Start coding**: Begin with `src/lib/vector-service.ts`

**Good luck building your AI call center agent!** 🎉

---

**Questions?** Check the implementation guides - they have detailed examples and solutions to common problems.
