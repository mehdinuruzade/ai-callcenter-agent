const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { WebSocketServer } = require('ws');
const { PrismaClient } = require('@prisma/client');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

const prisma = new PrismaClient();

// Store active sessions
const activeSessions = new Map();
let isCleaningUp = false;

// Import OpenAI Realtime Service dynamically
let OpenAIRealtimeService;

app.prepare().then(async () => {
  // Load the compiled TypeScript module
  try {
    const module = await import('./dist/lib/openai-realtime-service.js');
    OpenAIRealtimeService = module.OpenAIRealtimeService;
    console.log('✅ OpenAI Realtime Service loaded');
  } catch (error) {
    console.warn('⚠️  OpenAI Realtime Service not found. Run: npm run build:server');
    console.warn('   Continuing without AI features...');
  }

  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // Create WebSocket server
  const wss = new WebSocketServer({ 
    noServer: true,
    path: '/api/twilio/stream',
    handleProtocols: (protocols, request) => {
      console.log('📋 Client requested protocols:', protocols);
      return (protocols && protocols[0]) || false;
    },
  });

  console.log('🔧 WebSocket Server created');
  console.log('   Path:', '/api/twilio/stream');

  wss.on('error', function(error) {
    console.error('\n❌ WSS SERVER ERROR:', error);
    console.error('============================\n');
  });

  wss.on('headers', function(headers, request) {
    console.log('\n📋 WSS HEADERS EVENT');
    console.log('Headers:', headers);
    console.log('============================\n');
  });

  wss.on('connection', async (twilioWs, req) => {
    console.log(`\n🔌 ========== NEW CONNECTION ==========`);
    console.log('Time:', new Date().toISOString());
    console.log('Request headers:', JSON.stringify(req.headers, null, 2));
    console.log('✅ WebSocket connection established - waiting for Twilio messages...');
    console.log('======================================\n');
    isCleaningUp = false;

    let messageCount = 0;
    let callSid = null;
    let businessId = null;
    let streamSid = null;
    let sessionInitialized = false;
    let openAIService = null;

    // Passive waiting for Twilio messages – just detect silence
    const noMessageTimeout = setTimeout(() => {
      if (messageCount === 0) {
        console.error('⚠️  No messages received from Twilio after 5 seconds!');
        console.error('   This suggests Twilio is not sending data.');
        console.error('   WebSocket readyState:', twilioWs.readyState);
      }
    }, 5000);

    twilioWs.on('pong', () => {
      console.log('🏓 Received pong');
    });

    // Handle Twilio messages with comprehensive error handling
    twilioWs.on('message', async (message) => {
      clearTimeout(noMessageTimeout);
      messageCount++;
      console.log(`\n📨 MESSAGE #${messageCount} ==========`);      

      try {
        const msgString = message.toString();
        console.log('Raw message:', msgString);        

        const msg = JSON.parse(msgString);
        console.log('Event type:', msg.event);

        switch (msg.event) {
          case 'connected':
            console.log('✅ Stream connected event received');
            console.log('Protocol:', msg.protocol);
            console.log('Version:', msg.version);
            break;

          case 'start':
            try {
              streamSid = msg.start.streamSid;
              callSid = msg.start.callSid;
              
              console.log('📡 ========== STREAM START ==========');
              console.log('Stream SID:', streamSid);
              console.log('Call SID:', callSid);
              console.log('Start object:', JSON.stringify(msg.start, null, 2));
              
              // Extract custom parameters safely
              const customParameters = msg.start.customParameters || {};
              businessId = customParameters.businessId;
              
              console.log('Business ID from params:', businessId);
              console.log('Custom Parameters:', customParameters);

              if (!callSid) {
                console.error('❌ Missing callSid');
                return;
              }

              if (!businessId) {
                console.error('❌ Missing businessId');
                return;
              }

              // Initialize the session
              console.log('🔧 Starting session initialization...');
              await initializeSession(twilioWs, callSid, businessId);
              sessionInitialized = true;
              console.log('✅ Session initialization complete');
              
            } catch (startError) {
              console.error('❌ Error in start event handler:', startError);
              console.error('Stack:', startError.stack);
            }
            break;

          case 'media':
            if (sessionInitialized && openAIService) {
              try {
                openAIService.sendAudio(msg.media.payload);
              } catch (mediaError) {
                console.error('❌ Error sending audio to OpenAI:', mediaError);
              }
            }
            break;

          case 'mark':
            console.log('✅ Mark received:', msg.mark?.name);
            break;

          case 'stop':
            console.log('📡 Stream stopped');
            if (callSid && !isCleaningUp) {
              isCleaningUp = true;
              await handleCallEnd(callSid);
            }
            break;

          default:
            console.log(`📩 Unhandled event: ${msg.event}`);
            break;
        }
      } catch (error) {
        console.error('❌ ========== ERROR PROCESSING MESSAGE ==========');
        console.error('Error:', error);
        console.error('Message:', error.message);
        console.error('Stack:', error.stack);
        console.error('================================================');
      }
    });

    // Session initialization function
    async function initializeSession(twilioWs, callSid, businessId) {
      console.log('🔧 ========== INITIALIZING SESSION ==========');
      console.log('Call SID:', callSid);
      console.log('Business ID:', businessId);
      
      try {
        console.log('📊 Fetching business from database...');
        const business = await prisma.business.findUnique({
          where: { id: businessId },
          include: { 
            configurations: true,
          },
        });

        if (!business) {
          console.error('❌ Business not found for ID:', businessId);
          return;
        }

        console.log(`✅ Business found: ${business.name}`);

        const configMap = {};
        business.configurations.forEach(c => {
          try {
            configMap[c.key] = JSON.parse(c.value);
          } catch {
            configMap[c.key] = c.value;
          }
        });

        const systemPrompt = configMap.ai_personality || 
          `You are a helpful and professional customer service agent for ${business.name}. Be friendly, concise, and helpful.`;
        
        const voice = configMap.ai_voice || 'alloy';
        const temperature = parseFloat(configMap.temperature) || 0.8;
        const maxTokens = parseInt(configMap.max_tokens) || 4096;
        const enableFunctionCalls = configMap.enable_function_calls !== 'false';
        const enableTranscription = configMap.enable_transcription !== 'false';
        const turnDetectionType = configMap.turn_detection_type || 'server_vad';
        const vadThreshold = parseFloat(configMap.vad_threshold) || 0.5;
        const vadPrefixPadding = parseInt(configMap.vad_prefix_padding_ms) || 300;
        const vadSilenceDuration = parseInt(configMap.vad_silence_duration_ms) || 500;

        console.log('⚙️  Configuration:');
        console.log(`   Voice: ${voice}`);
        console.log(`   Temperature: ${temperature}`);

        if (OpenAIRealtimeService) {
          console.log('🤖 Initializing OpenAI service...');
          
          openAIService = new OpenAIRealtimeService({
            businessId,
            callSid,
            systemPrompt,
            voice,
            temperature,
            maxTokens,
            enableFunctionCalls,
            enableTranscription,
            turnDetectionType,
            vadThreshold,
            vadPrefixPadding,
            vadSilenceDuration,
          });

          openAIService.on('audio', (audioData) => {
            if (streamSid && twilioWs.readyState === 1) {
              const message = {
                event: 'media',
                streamSid,
                media: {
                  payload: audioData,
                },
              };
              twilioWs.send(JSON.stringify(message));
            }
          });

          openAIService.on('user_transcript', (text) => {
            console.log(`👤 User: ${text}`);
          });

          openAIService.on('assistant_transcript', (text) => {
            console.log(`🤖 Assistant: ${text}`);
          });

          openAIService.on('error', (error) => {
            console.error('❌ OpenAI error:', error);
          });

          try {
            console.log('🔌 Connecting to OpenAI...');
            await openAIService.connect();
            console.log('✅ OpenAI connected successfully');
          } catch (error) {
            console.error('❌ Failed to connect to OpenAI:', error);
            console.error('Stack:', error.stack);
            return;
          }
        } else {
          console.warn('⚠️  OpenAI service not available - running without AI');
        }

        activeSessions.set(callSid, {
          twilioWs,
          openAIService,
          businessId,
          callSid,
          startTime: new Date(),
        });

        console.log('✅ Session stored in activeSessions');
        console.log('Active sessions count:', activeSessions.size);
        console.log('============================================\n');

      } catch (error) {
        console.error('❌ ========== SESSION INIT ERROR ==========');
        console.error('Error:', error);
        console.error('Message:', error.message);
        console.error('Stack:', error.stack);
        console.error('===========================================');
        
        if (openAIService) {
          try {
            openAIService.close();
          } catch (closeError) {
            console.error('Error closing OpenAI service:', closeError);
          }
        }
      }
    }

    twilioWs.on('error', (error) => {
      console.error('\n❌ ========== WEBSOCKET ERROR ==========');
      console.error('Error:', error);
      console.error('Stack:', error.stack);
      console.error('========================================\n');
    });

    twilioWs.on('close', (code, reason) => {
      clearTimeout(noMessageTimeout);
      console.log('\n🔌 ========== WEBSOCKET CLOSED ==========');
      console.log('Close code:', code);
      console.log('Reason:', reason.toString() || '(empty)');
      console.log('Call SID:', callSid);
      console.log('Messages received:', messageCount);
      console.log('Session initialized:', sessionInitialized);
      console.log('========================================\n');
      
      if (callSid && !isCleaningUp) {
        isCleaningUp = true;
        handleCallEnd(callSid).catch(err => {
          console.error('Error in handleCallEnd:', err);
        });
      }
    });

    console.log('✅ WebSocket connection established');
    console.log('======================================\n');
  });

  // Handle call end
  async function handleCallEnd(callSid) {
    const session = activeSessions.get(callSid);
    
    if (!session) {
      console.log('⏭️  Session already cleaned up for:', callSid);
      return;
    }

    console.log(`\n🏁 ========== CALL ENDING ==========`);
    console.log(`   Call SID: ${callSid}`);

    try {
      // Remove from active sessions immediately to prevent duplicate cleanup
      activeSessions.delete(callSid);

      let transcript = [];
      let fullTranscript = '';
      let summary = '';
      let sentiment = 'neutral';

      // Get transcript if OpenAI service exists
      if (session.openAIService) {
        transcript = session.openAIService.getTranscript();
        console.log(`   Transcript items: ${transcript.length}`);

        // Format transcript
        fullTranscript = transcript
          .map(t => `${t.role === 'user' ? '👤 Customer' : '🤖 Agent'}: ${t.content}`)
          .join('\n\n');

        // Generate summary (first few exchanges)
        summary = transcript
          .slice(0, 6)
          .map(t => t.content)
          .join(' ')
          .substring(0, 500);

        // Calculate sentiment
        sentiment = calculateSentiment(transcript);
      }

      // Update call log with correct field names
      await prisma.callLog.updateMany({
        where: { callSid },
        data: {
          transcript: fullTranscript || null,
          summary: summary || null,
          sentiment,
          endTime: new Date(),
        },
      });

      console.log('✅ Call log updated with transcript');
      console.log(`   Sentiment: ${sentiment}`);

      // Close OpenAI connection
      if (session.openAIService) {
        console.log('🔌 Closing OpenAI connection');
        try {
          session.openAIService.close();
        } catch (closeError) {
          console.error('Error closing OpenAI service:', closeError.message);
        }
      }

    } catch (error) {
      console.error('❌ Error handling call end:', error);
    }

    console.log('===================================\n');
  }

  // Simple sentiment analysis
  function calculateSentiment(transcript) {
    const positiveWords = ['thank', 'thanks', 'great', 'good', 'excellent', 'perfect', 'helpful'];
    const negativeWords = ['bad', 'terrible', 'awful', 'frustrated', 'angry', 'upset', 'disappointed'];

    let positiveCount = 0;
    let negativeCount = 0;

    transcript.forEach(item => {
      const text = item.content.toLowerCase();
      positiveWords.forEach(word => {
        if (text.includes(word)) positiveCount++;
      });
      negativeWords.forEach(word => {
        if (text.includes(word)) negativeCount++;
      });
    });

    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  // Handle WebSocket upgrade
  server.on('upgrade', (request, socket, head) => {
    console.log('\n🔄 ========== UPGRADE REQUEST ==========');
    console.log('URL:', request.url);
    
    const { pathname } = parse(request.url, true);
    console.log('Pathname:', pathname);

    if (pathname === '/api/twilio/stream') {
      console.log('✅ Valid upgrade request - proceeding...');
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else {
      console.error('❌ Invalid pathname:', pathname);
      socket.destroy();
    }
    console.log('======================================\n');
  });

  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`\n🚀 ========== SERVER STARTED ==========`);
    console.log(`   HTTP: http://${hostname}:${port}`);
    console.log(`   WebSocket: ws://${hostname}:${port}/api/twilio/stream`);
    console.log(`   Environment: ${dev ? 'development' : 'production'}`);
    console.log('======================================\n');
  });

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('\n⏹️  SIGTERM signal received: closing server');
    
    // Close all active sessions
    for (const [callSid, session] of activeSessions.entries()) {
      console.log(`   Closing session: ${callSid}`);
      if (session.openAIService) {
        session.openAIService.close();
      }
      session.twilioWs.close();
    }
    
    await prisma.$disconnect();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    console.log('\n⏹️  SIGINT signal received: closing server');
    
    for (const [callSid, session] of activeSessions.entries()) {
      if (session.openAIService) {
        session.openAIService.close();
      }
      session.twilioWs.close();
    }
    
    await prisma.$disconnect();
    process.exit(0);
  });
});
