# Implementation Guide - Using OpenAI RealtimeClient SDK

This guide walks you through implementing the AI call center agent using the **`@openai/realtime-api-beta`** SDK, which provides a higher-level abstraction over the Real-time API.

## 🎯 Key Benefits of Using RealtimeClient

✅ **Simplified API** - No manual WebSocket management
✅ **Built-in tool handling** - Automatic function call execution
✅ **Type safety** - Full TypeScript support
✅ **Error handling** - Better error recovery
✅ **Event abstractions** - Clean event-driven architecture

## 📚 Prerequisites

Before you start, familiarize yourself with:
- [OpenAI Voice Agents Guide](https://platform.openai.com/docs/guides/voice-agents)
- [RealtimeClient SDK Docs](https://github.com/openai/openai-realtime-api-beta)
- [Twilio Media Streams](https://www.twilio.com/docs/voice/tutorials/consume-real-time-media-stream-using-websockets-python-and-flask)
- [Pinecone Documentation](https://docs.pinecone.io/)

## 🔧 Setup

### Install Dependencies

```bash
npm install
```

The key package is:
```json
"@openai/realtime-api-beta": "^0.4.0"
```

## 🎯 Implementation Order

Follow this order for best results:

### Phase 1: Vector/RAG System (Easiest) ⭐
### Phase 2: API Routes (Medium) ⭐⭐
### Phase 3: Real-time Services with RealtimeClient (Medium) ⭐⭐⭐

---

## Phase 1: Vector Service & RAG System

**(Same as before - No changes needed)**

See original `IMPLEMENTATION_GUIDE.md` Phase 1 for details on implementing:
- `generateEmbedding()`
- `upsertContent()`
- `queryContent()`
- `deleteContent()` and `updateContent()`

---

## Phase 2: Configuration & API Routes

**(Same as before - No changes needed)**

See original `IMPLEMENTATION_GUIDE.md` Phase 2 for details on implementing:
- RAG API (`/api/rag`)
- Configuration API (`/api/config`)
- Calls API (`/api/calls`)

---

## Phase 3: Real-time System with RealtimeClient

### 🚀 Architecture Overview

**Old Approach (Manual WebSockets):**
```
Your Code → Raw WebSocket → Manual event handling → Manual tool execution
```

**New Approach (RealtimeClient SDK):**
```
Your Code → RealtimeClient SDK → Automatic event handling → Tool handlers
```

### Key Differences

| Feature | Manual WebSocket | RealtimeClient SDK |
|---------|-----------------|-------------------|
| Connection | Manual `new WebSocket()` | `client.connect()` |
| Session config | Manual JSON messages | `client.updateSession()` |
| Audio send | Manual `ws.send(JSON.stringify())` | `client.appendInputAudio()` |
| Tool registration | Manual event parsing | `client.addTool({ handler })` |
| Tool execution | Manual response handling | Automatic via handler |
| Event handling | Manual `ws.on('message')` | `client.on('event.name')` |

---

### Step 3.1: Implement RealtimeClient Service

**File:** `src/lib/realtime-service.ts`

#### Task 1: Create Session

```typescript
async createSession(callSid: string, businessId: string, twilioWs: WebSocket) {
  const session: RealtimeSession = {
    callSid,
    businessId,
    twilioWs,
    transcript: []
  };

  this.sessions.set(callSid, session);
  await this.initializeRealtimeClient(session);

  return session;
}
```

#### Task 2: Initialize RealtimeClient (Core Implementation)

```typescript
private async initializeRealtimeClient(session: RealtimeSession) {
  // 1. Create RealtimeClient
  const client = new RealtimeClient({
    apiKey: process.env.OPENAI_API_KEY!,
    model: 'gpt-4o-realtime-preview-2024-12-17'
  });

  // 2. Get system instructions
  const instructions = await this.buildSystemInstructions(session.businessId);

  // 3. Update session configuration
  client.updateSession({
    modalities: ['text', 'audio'],
    instructions,
    voice: 'alloy',
    input_audio_format: 'g711_ulaw',  // Twilio format
    output_audio_format: 'g711_ulaw', // Twilio format
    input_audio_transcription: {
      model: 'whisper-1'
    },
    turn_detection: {
      type: 'server_vad',
      threshold: 0.5,
      prefix_padding_ms: 300,
      silence_duration_ms: 500
    },
    temperature: 0.7,
    max_response_output_tokens: 4096
  });

  // 4. Register RAG tool with automatic handler
  client.addTool(
    {
      name: 'query_knowledge_base',
      description: 'Search the company knowledge base for relevant information about products, policies, and FAQs',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The search query to find relevant information'
          }
        },
        required: ['query']
      }
    },
    async ({ query }: { query: string }) => {
      // This handler is called automatically when AI invokes the tool
      console.log(`RAG query: ${query}`);

      // Query vector database
      const results = await vectorService.queryContent(
        query,
        session.businessId,
        3 // Top 3 results
      );

      // Format results
      const knowledge = results
        .map((r, i) => `Result ${i + 1}: ${r.metadata?.title}\n${r.metadata?.content}`)
        .join('\n\n');

      // Return results - SDK handles sending back to OpenAI
      return {
        success: true,
        knowledge: knowledge || 'No relevant information found.'
      };
    }
  );

  // 5. Set up event listeners

  // User transcription
  client.on('conversation.item.input_audio_transcription.completed', (event: any) => {
    const transcript = event.transcript;
    session.transcript.push(`User: ${transcript}`);
    console.log(`User said: ${transcript}`);
  });

  // AI audio response - forward to Twilio
  client.on('response.audio.delta', (event: any) => {
    if (session.twilioWs.readyState === WebSocket.OPEN) {
      session.twilioWs.send(JSON.stringify({
        event: 'media',
        streamSid: session.callSid,
        media: {
          payload: event.delta
        }
      }));
    }
  });

  // AI response completed
  client.on('response.done', (event: any) => {
    if (event.response?.output) {
      const aiText = event.response.output
        .map((o: any) => o.content?.[0]?.transcript || '')
        .filter((t: string) => t)
        .join(' ');

      if (aiText) {
        session.transcript.push(`AI: ${aiText}`);
        console.log(`AI said: ${aiText}`);
      }
    }
  });

  // Error handling
  client.on('error', (error: any) => {
    console.error('RealtimeClient error:', error);
  });

  // 6. Connect to OpenAI
  await client.connect();
  console.log(`RealtimeClient connected for call: ${session.callSid}`);

  // 7. Store in session
  session.realtimeClient = client;
}
```

#### Task 3: Build System Instructions

```typescript
private async buildSystemInstructions(businessId: string): Promise<string> {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    include: { configurations: true }
  });

  if (!business) {
    return 'You are a helpful customer service agent.';
  }

  // Get configs
  const personalityConfig = business.configurations.find(
    c => c.key === 'ai_personality'
  );
  const greetingConfig = business.configurations.find(
    c => c.key === 'greeting_message'
  );

  const personality = (personalityConfig?.value as any)?.text || 'professional and helpful';
  const greeting = (greetingConfig?.value as any)?.text ||
    `Hello! Thank you for calling ${business.name}. How can I help you today?`;

  return `You are an AI customer service agent for ${business.name} in the ${business.domain} industry.

Your personality: ${personality}

Greeting: ${greeting}

Guidelines:
- Be conversational and natural in your responses
- Listen carefully to the customer's needs
- Use the query_knowledge_base tool to search for specific information when needed
- Keep responses concise and clear (2-3 sentences usually)
- Show empathy and understanding
- If you don't know something after checking the knowledge base, admit it politely
- Offer to transfer to a human agent for complex issues
- Always end calls professionally and ensure customer satisfaction

Remember: You represent ${business.name}, so maintain their brand voice and values at all times.`;
}
```

#### Task 4: Handle Incoming Audio

```typescript
handleIncomingAudio(callSid: string, audioPayload: string) {
  const session = this.sessions.get(callSid);

  if (!session || !session.realtimeClient) {
    console.warn(`No session found for call: ${callSid}`);
    return;
  }

  // Send audio to OpenAI - SDK handles everything
  session.realtimeClient.appendInputAudio(audioPayload);
}
```

**That's it!** Much simpler than manual WebSocket handling.

#### Task 5: End Session

```typescript
async endSession(callSid: string) {
  const session = this.sessions.get(callSid);

  if (!session) {
    return;
  }

  try {
    // Save transcript to database
    await prisma.callLog.update({
      where: { callSid },
      data: {
        transcript: session.transcript.join('\n')
      }
    });

    // Disconnect RealtimeClient
    if (session.realtimeClient) {
      session.realtimeClient.disconnect();
    }

    // Remove from sessions
    this.sessions.delete(callSid);

    console.log(`Session ended for call: ${callSid}`);
  } catch (error) {
    console.error('Error ending session:', error);
  }
}
```

---

### Step 3.2: WebSocket Server (Twilio Handler)

**File:** `src/lib/websocket-server.ts`

**(No changes - same as before)**

```typescript
export function setupWebSocketServer(server: Server) {
  const wss = new WebSocket.Server({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const { pathname } = parse(request.url || '', true);

    if (pathname === '/api/twilio/stream') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  wss.on('connection', async (ws: WebSocket) => {
    console.log('New Twilio WebSocket connection');
    let callSid: string | null = null;

    ws.on('message', async (message: WebSocket.Data) => {
      try {
        const data = JSON.parse(message.toString());

        switch (data.event) {
          case 'start':
            callSid = data.start.callSid;
            const businessId = data.start.customParameters.businessId;
            await realtimeService.createSession(callSid, businessId, ws);
            console.log(`Session started: ${callSid}`);
            break;

          case 'media':
            if (callSid && data.media?.payload) {
              realtimeService.handleIncomingAudio(callSid, data.media.payload);
            }
            break;

          case 'stop':
            if (callSid) {
              await realtimeService.endSession(callSid);
              console.log(`Session stopped: ${callSid}`);
            }
            break;
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', async () => {
      if (callSid) {
        await realtimeService.endSession(callSid);
      }
      console.log('Twilio WebSocket closed');
    });

    ws.on('error', (error) => {
      console.error('Twilio WebSocket error:', error);
    });
  });

  return wss;
}
```

---

### Step 3.3: Twilio Webhooks

**File:** `src/app/api/twilio/voice/route.ts`

**(No changes - same as before)**

See original `IMPLEMENTATION_GUIDE.md` for implementation.

---

## 🧪 Testing Your Implementation

### Test Progression

1. **Test Vector Service** (Phase 1)
2. **Test RAG APIs** (Phase 2)
3. **Test RealtimeClient Integration** (Phase 3)

### Phase 3 Testing with Ngrok

```bash
# Terminal 1: Start Next.js
npm run dev

# Terminal 2: Start ngrok
ngrok http 3000

# Terminal 3: Watch logs
# Your server console will show all events
```

**Test Flow:**
1. Configure Twilio webhook to ngrok URL
2. Call your Twilio number
3. Watch console for:
   - "New Twilio WebSocket connection"
   - "RealtimeClient connected for call: ..."
   - "User said: ..." (transcriptions)
   - "AI said: ..." (responses)
   - "RAG query: ..." (when tool is used)

---

## 🐛 Common Issues & Solutions

### Issue 1: "RealtimeClient is not a constructor"

**Solution:** Check your import:
```typescript
import { RealtimeClient } from '@openai/realtime-api-beta';
```

Make sure you ran `npm install` after updating package.json.

### Issue 2: No audio flowing

**Solution:** Verify audio formats:
```typescript
input_audio_format: 'g711_ulaw',  // Must match Twilio
output_audio_format: 'g711_ulaw'
```

### Issue 3: Tool not being called

**Solution:** Check tool definition matches exactly:
```typescript
// Must have proper JSON schema
parameters: {
  type: 'object',
  properties: { ... },
  required: [ ... ]
}
```

### Issue 4: "Cannot read property 'appendInputAudio' of undefined"

**Solution:** Ensure client is connected before sending audio:
```typescript
await client.connect();  // Wait for connection
session.realtimeClient = client;
```

---

## 📊 Comparison: Before vs After

### Before (Manual WebSocket)

```typescript
// Manual connection
const openaiWs = new WebSocket('wss://api.openai.com/...');

// Manual session config
openaiWs.send(JSON.stringify({ type: 'session.update', ... }));

// Manual audio send
openaiWs.send(JSON.stringify({
  type: 'input_audio_buffer.append',
  audio: payload
}));

// Manual tool handling
case 'response.function_call_arguments.done':
  const results = await vectorService.queryContent(...);
  openaiWs.send(JSON.stringify({
    type: 'conversation.item.create',
    item: { type: 'function_call_output', ... }
  }));
  openaiWs.send(JSON.stringify({ type: 'response.create' }));
```

### After (RealtimeClient)

```typescript
// Simple connection
await client.connect();

// Simple config
client.updateSession({ ... });

// Simple audio send
client.appendInputAudio(payload);

// Automatic tool handling
client.addTool(
  { name: 'query_knowledge_base', ... },
  async ({ query }) => {
    return await vectorService.queryContent(query, ...);
  }
);
```

**Result:** ~50% less code, cleaner, more maintainable!

---

## ✅ Completion Checklist

- [ ] Vector service works (Phase 1)
- [ ] RAG API endpoints work (Phase 2)
- [ ] RealtimeClient initializes successfully
- [ ] Session configuration applied
- [ ] Tool handler registered
- [ ] Twilio audio → RealtimeClient working
- [ ] RealtimeClient audio → Twilio working
- [ ] Transcriptions being captured
- [ ] RAG tool being called when needed
- [ ] Knowledge base results injected into responses
- [ ] Transcripts saved to database
- [ ] End-to-end test call successful!

---

## 📚 Additional Resources

- [OpenAI Voice Agents Guide](https://platform.openai.com/docs/guides/voice-agents)
- [RealtimeClient GitHub](https://github.com/openai/openai-realtime-api-beta)
- [Twilio Media Streams](https://www.twilio.com/docs/voice/twiml/stream)
- [Pinecone Docs](https://docs.pinecone.io/)

---

Good luck! The RealtimeClient SDK makes this implementation much cleaner and easier to maintain. 🚀
