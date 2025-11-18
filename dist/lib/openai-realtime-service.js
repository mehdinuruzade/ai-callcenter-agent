"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAIRealtimeService = void 0;
const ws_1 = __importDefault(require("ws"));
const events_1 = require("events");
const vector_service_supabase_1 = require("./vector-service-supabase");
class OpenAIRealtimeService extends events_1.EventEmitter {
    constructor(config) {
        super();
        this.ws = null;
        this.transcript = [];
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 3;
        this.max_tokens = 4096;
        this.enableTranscription = true;
        this.transcriptionModel = 'whisper-1';
        this.turnDetectionType = 'server_vad';
        this.vadThreshold = 0.5;
        this.vadPrefixPadding = 300;
        this.vadSilenceDuration = 500;
        this.enableFunctionCalls = true;
        this.config = config;
        this.max_tokens = config.maxTokens ?? this.max_tokens;
        this.enableFunctionCalls = config.enableFunctionCalls ?? this.enableFunctionCalls;
        this.enableTranscription = config.enableTranscription ?? this.enableTranscription;
        this.transcriptionModel = config.transcriptionModel ?? this.transcriptionModel;
        this.turnDetectionType = config.turnDetectionType ?? this.turnDetectionType;
        this.vadThreshold = config.vadThreshold ?? this.vadThreshold;
        this.vadPrefixPadding = config.vadPrefixPadding ?? this.vadPrefixPadding;
        this.vadSilenceDuration = config.vadSilenceDuration ?? this.vadSilenceDuration;
    }
    async connect() {
        return new Promise((resolve, reject) => {
            console.log('🤖 Connecting to OpenAI Realtime API...');
            const url = 'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17';
            this.ws = new ws_1.default(url, {
                headers: {
                    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                    'OpenAI-Beta': 'realtime=v1',
                },
            });
            this.ws.on('open', () => {
                console.log('✅ Connected to OpenAI Realtime API');
                this.isConnected = true;
                this.reconnectAttempts = 0;
                this.initializeSession();
                resolve();
            });
            this.ws.on('message', (data) => {
                this.handleOpenAIMessage(data);
            });
            this.ws.on('error', (error) => {
                console.error('❌ OpenAI WebSocket error:', error);
                this.emit('error', error);
                reject(error);
            });
            this.ws.on('close', () => {
                console.log('🔌 OpenAI WebSocket closed');
                this.isConnected = false;
                this.handleReconnect();
            });
        });
    }
    initializeSession() {
        console.log('⚙️ Initializing OpenAI session...');
        // Get config from business (passed in constructor)
        const sessionConfig = {
            modalities: ['text', 'audio'],
            instructions: this.config.systemPrompt,
            voice: this.config.voice || 'alloy',
            input_audio_format: 'g711_ulaw',
            output_audio_format: 'g711_ulaw',
            temperature: this.config.temperature || 0.8,
            max_response_output_tokens: this.max_tokens || 4096,
        };
        // Add transcription if enabled
        if (this.enableTranscription !== false) {
            sessionConfig.input_audio_transcription = {
                model: this.transcriptionModel || 'whisper-1',
            };
        }
        // Add turn detection
        sessionConfig.turn_detection = {
            type: this.turnDetectionType || 'server_vad',
            threshold: this.vadThreshold || 0.5,
            prefix_padding_ms: this.vadPrefixPadding || 300,
            silence_duration_ms: this.vadSilenceDuration || 500,
        };
        // Add function calling if enabled
        if (this.enableFunctionCalls !== false) {
            sessionConfig.tools = [
                {
                    type: 'function',
                    name: 'query_knowledge_base',
                    description: 'Search the knowledge base for relevant information',
                    parameters: {
                        type: 'object',
                        properties: {
                            query: {
                                type: 'string',
                                description: 'The search query',
                            },
                        },
                        required: ['query'],
                    },
                },
            ];
            sessionConfig.tool_choice = 'auto';
        }
        this.sendMessage({
            type: 'session.update',
            session: sessionConfig,
        });
        console.log('✅ Session initialized with config');
    }
    async handleOpenAIMessage(data) {
        try {
            const message = JSON.parse(data.toString());
            switch (message.type) {
                case 'session.created':
                    console.log('✅ OpenAI session created:', message.session.id);
                    this.emit('session_created', message.session);
                    break;
                case 'session.updated':
                    console.log('✅ Session updated');
                    break;
                case 'conversation.item.created':
                    console.log('💬 Conversation item created');
                    break;
                case 'input_audio_buffer.speech_started':
                    console.log('🎤 User started speaking');
                    this.emit('speech_started');
                    break;
                case 'input_audio_buffer.speech_stopped':
                    console.log('🎤 User stopped speaking');
                    this.emit('speech_stopped');
                    break;
                case 'conversation.item.input_audio_transcription.completed':
                    const userText = message.transcript;
                    console.log(`👤 User: ${userText}`);
                    this.transcript.push({
                        role: 'user',
                        content: userText,
                        timestamp: new Date(),
                    });
                    this.emit('user_transcript', userText);
                    break;
                case 'response.audio_transcript.delta':
                    // Accumulate assistant response
                    this.emit('assistant_transcript_delta', message.delta);
                    break;
                case 'response.audio_transcript.done':
                    const assistantText = message.transcript;
                    console.log(`🤖 Assistant: ${assistantText}`);
                    this.transcript.push({
                        role: 'assistant',
                        content: assistantText,
                        timestamp: new Date(),
                    });
                    this.emit('assistant_transcript', assistantText);
                    break;
                case 'response.audio.delta':
                    // Forward audio to Twilio
                    const audioData = message.delta;
                    this.emit('audio', audioData);
                    break;
                case 'response.audio.done':
                    console.log('✅ Audio response complete');
                    this.emit('audio_done');
                    break;
                case 'response.function_call_arguments.done':
                    console.log('🔧 Function call:', message.name);
                    await this.handleFunctionCall(message.call_id, message.name, JSON.parse(message.arguments));
                    break;
                case 'response.done':
                    console.log('✅ Response complete');
                    this.emit('response_done');
                    break;
                case 'error':
                    console.error('❌ OpenAI error:', message.error);
                    this.emit('error', message.error);
                    break;
                case 'rate_limits.updated':
                    console.log('📊 Rate limits updated:', message.rate_limits);
                    break;
                default:
                    // console.log('📩 Unhandled message type:', message.type);
                    break;
            }
        }
        catch (error) {
            console.error('❌ Error handling OpenAI message:', error);
        }
    }
    async handleFunctionCall(callId, functionName, args) {
        console.log(`🔧 Executing function: ${functionName}`);
        console.log(`   Arguments:`, args);
        try {
            let result;
            if (functionName === 'query_knowledge_base') {
                // Query the vector database
                const context = await vector_service_supabase_1.vectorService.getRelevantContext(args.query, this.config.businessId, 3);
                result = {
                    success: true,
                    context,
                    query: args.query,
                };
                console.log(`✅ Retrieved knowledge base context (${context.length} chars)`);
            }
            else {
                result = {
                    success: false,
                    error: `Unknown function: ${functionName}`,
                };
            }
            // Send function result back to OpenAI
            this.sendMessage({
                type: 'conversation.item.create',
                item: {
                    type: 'function_call_output',
                    call_id: callId,
                    output: JSON.stringify(result),
                },
            });
            // Trigger response generation
            this.sendMessage({
                type: 'response.create',
            });
        }
        catch (error) {
            console.error('❌ Error executing function:', error);
            // Send error back to OpenAI
            this.sendMessage({
                type: 'conversation.item.create',
                item: {
                    type: 'function_call_output',
                    call_id: callId,
                    output: JSON.stringify({
                        success: false,
                        error: error instanceof Error ? error.message : String(error),
                    }),
                },
            });
        }
    }
    sendAudio(audioData) {
        if (!this.isConnected || !this.ws) {
            console.warn('⚠️ Not connected to OpenAI, audio dropped');
            return;
        }
        this.sendMessage({
            type: 'input_audio_buffer.append',
            audio: audioData,
        });
    }
    sendText(text) {
        if (!this.isConnected || !this.ws) {
            console.warn('⚠️ Not connected to OpenAI');
            return;
        }
        this.sendMessage({
            type: 'conversation.item.create',
            item: {
                type: 'message',
                role: 'user',
                content: [
                    {
                        type: 'input_text',
                        text,
                    },
                ],
            },
        });
        this.sendMessage({
            type: 'response.create',
        });
    }
    interrupt() {
        console.log('⏸️ Interrupting current response');
        this.sendMessage({
            type: 'response.cancel',
        });
    }
    sendMessage(message) {
        if (!this.ws || this.ws.readyState !== ws_1.default.OPEN) {
            console.warn('⚠️ WebSocket not open, message not sent');
            return;
        }
        this.ws.send(JSON.stringify(message));
    }
    handleReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.log('❌ Max reconnection attempts reached');
            this.emit('max_reconnect_attempts');
            return;
        }
        this.reconnectAttempts++;
        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);
        console.log(`🔄 Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        setTimeout(() => {
            this.connect().catch((error) => {
                console.error('❌ Reconnection failed:', error);
            });
        }, delay);
    }
    getTranscript() {
        return this.transcript;
    }
    close() {
        console.log('🔌 Closing OpenAI connection');
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.isConnected = false;
        this.removeAllListeners();
    }
}
exports.OpenAIRealtimeService = OpenAIRealtimeService;
