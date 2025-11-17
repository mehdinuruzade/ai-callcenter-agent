# Implementation Guide - Build Your AI Call Center Agent

This guide walks you through implementing the AI call center agent **step by step**. All implementation code has been removed and replaced with TODOs. Follow this guide to build it yourself!

## 📚 Learning Resources

Before you start, familiarize yourself with:
- [OpenAI Real-time API Docs](https://platform.openai.com/docs/guides/realtime)
- [Twilio Media Streams Docs](https://www.twilio.com/docs/voice/tutorials/consume-real-time-media-stream-using-websockets-python-and-flask)
- [Pinecone Documentation](https://docs.pinecone.io/)
- [Prisma Documentation](https://www.prisma.io/docs)

## 🎯 Implementation Order

Follow this order for best results:

### Phase 1: Vector/RAG System (Easiest)
### Phase 2: API Routes (Medium)
### Phase 3: Real-time Services (Hardest)

---

## Phase 1: Vector Service & RAG System

Start here because it's self-contained and tests your understanding of embeddings.

### Step 1.1: Implement Vector Service

**File:** `src/lib/vector-service.ts`

#### Task 1: `generateEmbedding()`
```typescript
// What you need to do:
// 1. Call openai.embeddings.create()
// 2. Use model: 'text-embedding-3-small'
// 3. Pass text as input
// 4. Return response.data[0].embedding

// Example structure:
const response = await openai.embeddings.create({
  model: 'text-embedding-3-small',
  input: text,
});
return response.data[0].embedding; // Array of 1536 numbers
```

**Test it:**
```typescript
const embedding = await vectorService.generateEmbedding("Hello world");
console.log(embedding.length); // Should be 1536
```

#### Task 2: `upsertContent()`
```typescript
// What you need to do:
// 1. Call generateEmbedding(content) to get vector
// 2. Call this.index.upsert([{ id, values, metadata }])
// 3. Store content in metadata along with other fields
// 4. Return { id, embedding }

// Pinecone upsert structure:
await this.index.upsert([
  {
    id: string,
    values: number[], // The embedding
    metadata: {
      businessId: string,
      title: string,
      category: string,
      content: string,
      ...otherMetadata
    }
  }
]);
```

**Test it:**
```typescript
await vectorService.upsertContent(
  'test-id',
  'Product X costs $99',
  { businessId: 'biz1', title: 'Pricing', category: 'FAQ' }
);
```

#### Task 3: `queryContent()`
```typescript
// What you need to do:
// 1. Generate embedding for the query
// 2. Use this.index.query() with:
//    - vector: queryEmbedding
//    - topK: number of results
//    - filter: { businessId: { $eq: businessId } }
//    - includeMetadata: true
// 3. Return queryResponse.matches

// Example:
const queryResponse = await this.index.query({
  vector: queryEmbedding,
  topK,
  filter: { businessId: { $eq: businessId } },
  includeMetadata: true,
});
```

**Test it:**
```typescript
const results = await vectorService.queryContent(
  'how much does product x cost',
  'biz1',
  3
);
console.log(results); // Should find the pricing content
```

#### Task 4: `deleteContent()` and `updateContent()`
These are straightforward - use `this.index.deleteOne(id)` and combine delete + upsert.

---

### Step 1.2: Implement RAG API Routes

**File:** `src/app/api/rag/route.ts`

#### Task: Implement GET
```typescript
export async function GET(req: NextRequest) {
  // 1. Get businessId from searchParams
  const searchParams = req.nextUrl.searchParams;
  const businessId = searchParams.get('businessId');

  // 2. Validate
  if (!businessId) {
    return NextResponse.json({ error: 'Business ID required' }, { status: 400 });
  }

  // 3. Query database
  const contents = await prisma.rAGContent.findMany({
    where: { businessId },
    orderBy: { createdAt: 'desc' },
  });

  // 4. Return
  return NextResponse.json(contents);
}
```

#### Task: Implement POST
```typescript
export async function POST(req: NextRequest) {
  // 1. Parse body
  const { businessId, title, content, category, metadata } = await req.json();

  // 2. Create in database
  const ragContent = await prisma.rAGContent.create({
    data: { businessId, title, content, category, metadata: metadata || {} },
  });

  // 3. Add to Pinecone
  await vectorService.upsertContent(
    ragContent.id,
    content,
    { businessId, title, category }
  );

  // 4. Update DB with vectorId
  await prisma.rAGContent.update({
    where: { id: ragContent.id },
    data: { vectorId: ragContent.id },
  });

  // 5. Return
  return NextResponse.json(ragContent);
}
```

**Test it:**
Use tools like Postman or curl to test these endpoints.

---

## Phase 2: Configuration & Call Log APIs

**Files:** `src/app/api/config/route.ts` and `src/app/api/calls/route.ts`

### Step 2.1: Configuration API

Follow the TODOs in the file. Key points:

- **GET**: Fetch all configs and convert to key-value object using `reduce()`
- **POST**: Use `prisma.configuration.upsert()` with compound key `{ businessId_key: { businessId, key } }`
- **PUT**: Loop through configs and upsert each one

### Step 2.2: Calls API

- **GET**: Implement pagination with `skip` and `take`
- **POST**: Use Prisma's `aggregate()` and `groupBy()` for analytics

---

## Phase 3: Real-time System (Most Complex)

### Step 3.1: Understand the Architecture

```
Caller → Twilio → Your WebSocket Server → OpenAI Real-time API
                           ↓
                    Query Pinecone for RAG
```

**Three WebSocket connections:**
1. Twilio ↔ Your Server (receives/sends audio)
2. Your Server ↔ OpenAI (sends audio, receives AI responses)
3. Bidirectional audio streaming

### Step 3.2: Implement Twilio WebSocket Handler

**File:** `src/lib/websocket-server.ts`

```typescript
export function setupWebSocketServer(server: Server) {
  const wss = new WebSocket.Server({ noServer: true });

  // 1. Handle upgrade event
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

  // 2. Handle connection
  wss.on('connection', async (ws: WebSocket) => {
    let callSid: string | null = null;

    ws.on('message', async (message: WebSocket.Data) => {
      const data = JSON.parse(message.toString());

      // Handle three event types from Twilio:
      switch (data.event) {
        case 'start':
          callSid = data.start.callSid;
          const businessId = data.start.customParameters.businessId;
          await realtimeService.createSession(callSid, businessId, ws);
          break;

        case 'media':
          realtimeService.handleIncomingAudio(callSid, data.media.payload);
          break;

        case 'stop':
          await realtimeService.endSession(callSid);
          break;
      }
    });

    ws.on('close', async () => {
      if (callSid) await realtimeService.endSession(callSid);
    });
  });

  return wss;
}
```

**Twilio Media Stream Events:**
- `start`: Contains callSid and custom parameters
- `media`: Contains base64-encoded audio (payload)
- `stop`: Signals end of call

### Step 3.3: Implement Realtime Service

**File:** `src/lib/realtime-service.ts`

#### Task 1: `createSession()`
```typescript
async createSession(callSid, businessId, ws) {
  const session = {
    callSid,
    businessId,
    ws,
    transcript: []
  };

  this.sessions.set(callSid, session);
  await this.initializeOpenAI(session);

  return session;
}
```

#### Task 2: `initializeOpenAI()` - The Core Logic

This is the most complex function. Here's the structure:

```typescript
private async initializeOpenAI(session: RealtimeSession) {
  // 1. Create WebSocket to OpenAI
  const openaiWs = new WebSocket(
    'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01',
    {
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'OpenAI-Beta': 'realtime=v1',
      }
    }
  );

  session.openaiWs = openaiWs;

  // 2. On open, send session configuration
  openaiWs.on('open', async () => {
    const systemInstructions = await this.buildSystemInstructions(session.businessId);

    openaiWs.send(JSON.stringify({
      type: 'session.update',
      session: {
        modalities: ['text', 'audio'],
        instructions: systemInstructions,
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
        tools: [
          {
            type: 'function',
            name: 'query_knowledge_base',
            description: 'Search the company knowledge base for relevant information',
            parameters: {
              type: 'object',
              properties: {
                query: { type: 'string', description: 'The search query' }
              },
              required: ['query']
            }
          }
        ],
        temperature: 0.7,
        max_response_output_tokens: 4096
      }
    }));
  });

  // 3. Handle messages from OpenAI
  openaiWs.on('message', async (data) => {
    const response = JSON.parse(data.toString());

    switch (response.type) {
      case 'response.audio.delta':
        // Forward AI audio to Twilio
        if (session.ws.readyState === WebSocket.OPEN) {
          session.ws.send(JSON.stringify({
            event: 'media',
            streamSid: session.callSid,
            media: { payload: response.delta }
          }));
        }
        break;

      case 'conversation.item.input_audio_transcription.completed':
        // User spoke
        session.transcript.push(`User: ${response.transcript}`);
        break;

      case 'response.done':
        // AI finished responding
        if (response.response?.output) {
          const aiText = response.response.output
            .map(o => o.content?.[0]?.transcript || '')
            .join(' ');
          session.transcript.push(`AI: ${aiText}`);
        }
        break;

      case 'response.function_call_arguments.done':
        // AI wants to call a function (RAG query)
        await this.handleFunctionCall(session, response);
        break;

      case 'error':
        console.error('OpenAI error:', response.error);
        break;
    }
  });

  // 4. Handle errors and close
  openaiWs.on('error', (error) => {
    console.error('OpenAI WebSocket error:', error);
  });

  openaiWs.on('close', () => {
    console.log('OpenAI WebSocket closed');
  });
}
```

**Key Points:**
- **g711_ulaw**: Twilio's audio format (8kHz, µ-law encoded)
- **server_vad**: Server-side Voice Activity Detection (detects when user stops speaking)
- **Function calling**: Allows AI to query your knowledge base

#### Task 3: `buildSystemInstructions()`

```typescript
private async buildSystemInstructions(businessId: string) {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    include: { configurations: true }
  });

  const personality = business.configurations.find(c => c.key === 'ai_personality')?.value;
  const greeting = business.configurations.find(c => c.key === 'greeting_message')?.value;

  return `You are an AI customer service agent for ${business.name}.

Your personality: ${personality?.text || 'professional and helpful'}

Greeting: ${greeting?.text || 'Hello! How can I help you?'}

Guidelines:
- Be conversational and natural
- Use the query_knowledge_base function when you need specific information
- Keep responses concise
- Show empathy
- If unsure, admit it or transfer to human

Remember to maintain ${business.name}'s brand voice.`;
}
```

#### Task 4: `handleFunctionCall()` - RAG Integration

```typescript
private async handleFunctionCall(session: RealtimeSession, response: any) {
  if (response.name === 'query_knowledge_base') {
    const args = JSON.parse(response.arguments);
    const query = args.query;

    // 1. Query Pinecone
    const results = await vectorService.queryContent(
      query,
      session.businessId,
      3 // Top 3 results
    );

    // 2. Format results
    const knowledge = results
      .map((r, i) => `Result ${i + 1}: ${r.metadata?.title}\n${r.metadata?.content}`)
      .join('\n\n');

    // 3. Send back to OpenAI
    if (session.openaiWs?.readyState === WebSocket.OPEN) {
      session.openaiWs.send(JSON.stringify({
        type: 'conversation.item.create',
        item: {
          type: 'function_call_output',
          call_id: response.call_id,
          output: JSON.stringify({
            knowledge: knowledge || 'No relevant information found.'
          })
        }
      }));

      // 4. Trigger AI to generate response with this knowledge
      session.openaiWs.send(JSON.stringify({
        type: 'response.create'
      }));
    }
  }
}
```

#### Task 5: `handleIncomingAudio()`

```typescript
handleIncomingAudio(callSid: string, audioPayload: string) {
  const session = this.sessions.get(callSid);
  if (session?.openaiWs?.readyState === WebSocket.OPEN) {
    session.openaiWs.send(JSON.stringify({
      type: 'input_audio_buffer.append',
      audio: audioPayload // Base64 audio from Twilio
    }));
  }
}
```

#### Task 6: `endSession()`

```typescript
async endSession(callSid: string) {
  const session = this.sessions.get(callSid);
  if (session) {
    // Save transcript
    await prisma.callLog.update({
      where: { callSid },
      data: { transcript: session.transcript.join('\n') }
    });

    // Close OpenAI connection
    session.openaiWs?.close();

    // Remove from map
    this.sessions.delete(callSid);
  }
}
```

### Step 3.4: Implement Twilio Voice Webhook

**File:** `src/app/api/twilio/voice/route.ts`

```typescript
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const callSid = formData.get('CallSid') as string;
    const from = formData.get('From') as string;
    const to = formData.get('To') as string;

    // 1. Find business
    const phoneNumber = await prisma.phoneNumber.findUnique({
      where: { number: to },
      include: { business: true }
    });

    if (!phoneNumber || !phoneNumber.business.isActive) {
      const response = new VoiceResponse();
      response.say('This number is not in service.');
      response.hangup();
      return new NextResponse(response.toString(), {
        headers: { 'Content-Type': 'text/xml' }
      });
    }

    // 2. Create call log
    await prisma.callLog.create({
      data: {
        callSid,
        fromNumber: from,
        toNumber: to,
        status: 'initiated',
        businessId: phoneNumber.businessId
      }
    });

    // 3. Create TwiML with Stream
    const response = new VoiceResponse();
    const connect = response.connect();
    connect.stream({
      url: `wss://${process.env.NEXT_PUBLIC_APP_URL?.replace('https://', '')}/api/twilio/stream`,
      parameters: {
        callSid,
        businessId: phoneNumber.businessId
      }
    });

    return new NextResponse(response.toString(), {
      headers: { 'Content-Type': 'text/xml' }
    });
  } catch (error) {
    console.error(error);
    const response = new VoiceResponse();
    response.say('An error occurred.');
    response.hangup();
    return new NextResponse(response.toString(), { status: 500 });
  }
}
```

### Step 3.5: Implement Status Webhook

**File:** `src/app/api/twilio/status/route.ts`

```typescript
export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const callSid = formData.get('CallSid') as string;
  const callStatus = formData.get('CallStatus') as string;
  const callDuration = formData.get('CallDuration') as string;

  await prisma.callLog.update({
    where: { callSid },
    data: {
      status: callStatus,
      duration: callDuration ? parseInt(callDuration) : undefined
    }
  });

  return NextResponse.json({ success: true });
}
```

---

## 🧪 Testing Your Implementation

### Test Order:

1. **Vector Service**
   ```bash
   # Create a test file
   npm run dev
   # Test embeddings and queries
   ```

2. **RAG APIs**
   ```bash
   # Use Postman to POST content
   # Then GET to verify
   ```

3. **Configuration APIs**
   ```bash
   # Create business configs
   # Set ai_personality and greeting_message
   ```

4. **Twilio Integration**
   ```bash
   # Use ngrok to expose localhost
   ngrok http 3000
   # Configure Twilio webhook to ngrok URL
   # Make a test call!
   ```

---

## 🐛 Common Issues & Solutions

### Issue 1: OpenAI WebSocket Immediately Closes
**Solution:** Check your API key has Real-time API access

### Issue 2: No Audio Flowing
**Solution:** Verify audio formats are 'g711_ulaw' (not PCM16)

### Issue 3: Function Calling Not Working
**Solution:** Check tools definition in session.update matches exactly

### Issue 4: Twilio Can't Connect to WebSocket
**Solution:** Ensure your app is publicly accessible (use ngrok for development)

### Issue 5: RAG Returns No Results
**Solution:** Verify Pinecone index dimensions (should be 1536 for text-embedding-3-small)

---

## 📖 Additional Resources

- [OpenAI Real-time API Quickstart](https://platform.openai.com/docs/guides/realtime)
- [Twilio Media Streams Reference](https://www.twilio.com/docs/voice/twiml/stream)
- [WebSocket MDN Docs](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [Prisma Client API](https://www.prisma.io/docs/reference/api-reference/prisma-client-reference)

---

## ✅ Completion Checklist

- [ ] Vector service generates embeddings
- [ ] Vector service queries Pinecone correctly
- [ ] RAG API endpoints work (CRUD)
- [ ] Configuration API endpoints work
- [ ] Call logs API works with pagination
- [ ] Twilio webhook creates call logs
- [ ] WebSocket server accepts Twilio connections
- [ ] OpenAI Real-time API connects successfully
- [ ] Audio flows bidirectionally (Caller ↔ AI)
- [ ] AI can call query_knowledge_base function
- [ ] RAG results are injected into AI responses
- [ ] Transcripts are saved to database
- [ ] End-to-end test call works!

---

Good luck building your AI call center agent! Take it step by step, test thoroughly, and refer to the official documentation when stuck. 🚀
