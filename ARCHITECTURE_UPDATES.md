# Architecture Updates - RealtimeClient SDK Integration

## 🎯 Summary of Changes

This document outlines the architectural changes made to use the **`@openai/realtime-api-beta`** SDK instead of manual WebSocket management.

## 📦 New Dependency

```json
"@openai/realtime-api-beta": "^0.4.0"
```

## 🏗️ Architecture Comparison

### Old Architecture (Manual WebSockets)

```
┌─────────────────────────────────────────────────────────┐
│                  Your Application                        │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │         Manual WebSocket Management             │    │
│  │                                                  │    │
│  │  • Raw WebSocket connection                     │    │
│  │  • Manual JSON message construction             │    │
│  │  • Manual event parsing                         │    │
│  │  • Manual function call handling                │    │
│  │  • Manual audio buffer management               │    │
│  └────────────────────────────────────────────────┘    │
│                        ▼                                 │
│         Direct WebSocket to OpenAI API                   │
└─────────────────────────────────────────────────────────┘
```

### New Architecture (RealtimeClient SDK)

```
┌─────────────────────────────────────────────────────────┐
│                  Your Application                        │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │           High-Level SDK Usage                  │    │
│  │                                                  │    │
│  │  • client.connect()                             │    │
│  │  • client.updateSession()                       │    │
│  │  • client.addTool({ handler })                  │    │
│  │  • client.appendInputAudio()                    │    │
│  │  • client.on('event', handler)                  │    │
│  └────────────────────────────────────────────────┘    │
│                        ▼                                 │
│              RealtimeClient SDK                          │
│         (Handles WebSocket, events, tools)               │
│                        ▼                                 │
│              OpenAI Real-time API                        │
└─────────────────────────────────────────────────────────┘
```

## 🔄 Component Changes

### 1. RealtimeSession Interface

**Before:**
```typescript
export interface RealtimeSession {
  callSid: string;
  businessId: string;
  ws: WebSocket;              // Twilio WebSocket
  openaiWs?: WebSocket;       // OpenAI WebSocket (manual)
  transcript: string[];
}
```

**After:**
```typescript
export interface RealtimeSession {
  callSid: string;
  businessId: string;
  twilioWs: WebSocket;        // Twilio WebSocket
  realtimeClient?: RealtimeClient;  // SDK instance
  transcript: string[];
}
```

### 2. Initialization

**Before (Manual):**
```typescript
const openaiWs = new WebSocket(
  'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01',
  { headers: { Authorization: `Bearer ${apiKey}`, ... } }
);

openaiWs.on('open', () => {
  openaiWs.send(JSON.stringify({
    type: 'session.update',
    session: { modalities: [...], instructions: '...', ... }
  }));
});
```

**After (SDK):**
```typescript
const client = new RealtimeClient({
  apiKey: process.env.OPENAI_API_KEY!,
  model: 'gpt-4o-realtime-preview-2024-12-17'
});

client.updateSession({
  modalities: ['text', 'audio'],
  instructions: '...',
  ...
});

await client.connect();
```

### 3. Tool Registration

**Before (Manual):**
```typescript
// In session.update
tools: [{
  type: 'function',
  name: 'query_knowledge_base',
  parameters: { ... }
}]

// Later, manual handling
case 'response.function_call_arguments.done':
  const results = await vectorService.queryContent(...);
  openaiWs.send(JSON.stringify({
    type: 'conversation.item.create',
    item: { type: 'function_call_output', call_id: ..., output: ... }
  }));
  openaiWs.send(JSON.stringify({ type: 'response.create' }));
```

**After (SDK):**
```typescript
client.addTool(
  {
    name: 'query_knowledge_base',
    description: '...',
    parameters: { ... }
  },
  async ({ query }) => {
    // Handler called automatically
    const results = await vectorService.queryContent(query, ...);
    return { knowledge: results };
    // SDK handles response automatically
  }
);
```

### 4. Audio Handling

**Before (Manual):**
```typescript
openaiWs.send(JSON.stringify({
  type: 'input_audio_buffer.append',
  audio: audioPayload
}));
```

**After (SDK):**
```typescript
client.appendInputAudio(audioPayload);
```

### 5. Event Handling

**Before (Manual):**
```typescript
openaiWs.on('message', (data) => {
  const response = JSON.parse(data.toString());

  switch (response.type) {
    case 'response.audio.delta':
      // Forward to Twilio
      break;
    case 'conversation.item.input_audio_transcription.completed':
      // Store transcript
      break;
    // ... many cases
  }
});
```

**After (SDK):**
```typescript
client.on('response.audio.delta', (event) => {
  // Forward to Twilio
});

client.on('conversation.item.input_audio_transcription.completed', (event) => {
  // Store transcript
});

// Type-safe, clean event handlers
```

## 📊 Benefits

### Code Reduction
- **~50% less code** in realtime-service.ts
- Removed ~200 lines of manual WebSocket handling
- No manual JSON message construction

### Better Developer Experience
- ✅ **Type safety** - Full TypeScript support
- ✅ **Error handling** - SDK handles reconnection, errors
- ✅ **Cleaner code** - High-level abstractions
- ✅ **Automatic tool execution** - No manual function call handling
- ✅ **Event-driven** - Clean event listeners

### Maintainability
- ✅ **Less boilerplate** - SDK handles complexity
- ✅ **Easier testing** - Mock SDK vs. WebSocket
- ✅ **Better debugging** - SDK provides better error messages
- ✅ **Future-proof** - SDK updates handle API changes

## 🗂️ File Changes Summary

### Modified Files

1. **package.json**
   - Added: `"@openai/realtime-api-beta": "^0.4.0"`

2. **src/lib/realtime-service.ts**
   - Changed: Import from `@openai/realtime-api-beta`
   - Changed: Session interface (`realtimeClient` vs `openaiWs`)
   - Simplified: All methods use SDK instead of raw WebSocket
   - Removed: `handleFunctionCall()` - now automatic

3. **IMPLEMENTATION_GUIDE_AGENTS.md** (NEW)
   - Complete guide for RealtimeClient implementation
   - Simplified instructions
   - Better examples

### Unchanged Files

- `src/lib/vector-service.ts` - No changes
- `src/lib/websocket-server.ts` - No changes
- `src/app/api/**` - No changes
- Database schema - No changes

## 🚀 Migration Path

For anyone updating from the old architecture:

1. **Update package.json** - Add RealtimeClient dependency
2. **Run** `npm install`
3. **Update realtime-service.ts** - Follow `IMPLEMENTATION_GUIDE_AGENTS.md`
4. **Test** - Everything else stays the same!

## 📝 Implementation Notes

### Audio Format
Still use `g711_ulaw` for Twilio compatibility:
```typescript
input_audio_format: 'g711_ulaw',
output_audio_format: 'g711_ulaw'
```

### Session Configuration
All the same options, just cleaner API:
- modalities
- instructions
- voice
- turn_detection
- temperature
- max_response_output_tokens

### Twilio Integration
No changes needed - WebSocket server stays the same.

## 🎓 Learning Resources

1. **Primary Guide**: `IMPLEMENTATION_GUIDE_AGENTS.md`
2. **OpenAI Docs**: https://platform.openai.com/docs/guides/voice-agents
3. **SDK Repository**: https://github.com/openai/openai-realtime-api-beta

---

**The new architecture is simpler, cleaner, and easier to maintain while providing the exact same functionality!** 🎉
