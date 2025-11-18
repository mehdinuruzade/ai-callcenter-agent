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
    // Don't reject connections without protocols - Twilio doesn't send them
    handleProtocols: (protocols, request) => {
      console.log('📋 Client requested protocols:', protocols);
      // Accept connection even if no protocols specified
      return protocols && protocols.length > 0 ? protocols[0] : '';
    },
  });

  console.log('🔧 WebSocket Server created');
  console.log('   Path:', '/api/twilio/stream');

  // WebSocket server error handler
  wss.on('error', function(error) {
    console.error('\n❌ WSS SERVER ERROR:', error);
    console.error('============================\n');
  });

  // Main WebSocket connection handler
  wss.on('connection', async (twilioWs, req) => {
    console.log(`\n🔌 New WebSocket connection established at ${new Date().toISOString()}`);
    console.log('   Connection readyState:', twilioWs.readyState);
    console.log('   Request headers:', req.headers);
    isCleaningUp = false;

    let messageCount = 0;
    let callSid = null;
    let businessId = null;
    let streamSid = null;
    let sessionInitialized = false;
    let openAIService = null;

    // Send periodic pings to keep connection alive
    const pingInterval = setInterval(() => {
      if (twilioWs.readyState === 1) {
        twilioWs.ping();
      } else {
        clearInterval(pingInterval);
      }
    }, 30000); // Every 30 seconds

    // Passive waiting for Twilio messages – just detect silence
    const noMessageTimeout = setTimeout(() => {
      if (messageCount === 0) {
        console.error('⚠️  No messages received from Twilio after 5 seconds!');
        console.error('   This suggests Twilio is not sending data.');
        console.error('   WebSocket readyState:', twilioWs.readyState);
      }
    }, 5000);

    twilioWs.on('pong', () => {
      console.log('🏓 Received pong from Twilio');
    });

    // Handle Twilio messages with comprehensive error handling
    twilioWs.on('message', async (message) => {
      clearTimeout(noMessageTimeout);
      messageCount++;

      try {
        const msgString = message.toString();
        const msg = JSON.parse(msgString);
        console.log(`📨 Message #${messageCount}: ${msg.event}`);

        switch (msg.event) {
          case 'connected':
            console.log(`✅ Stream connected - Protocol: ${msg.protocol}, Version: ${msg.version}`);
            break;

          case 'start':
            try {
              streamSid = msg.start.streamSid;
              callSid = msg.start.callSid;

              // Extract custom parameters safely
              const customParameters = msg.start.customParameters || {};
              businessId = customParameters.businessId;

              console.log(`📡 Stream started - Call: ${callSid}, Business: ${businessId}`);

              if (!callSid) {
                console.error('❌ Missing callSid');
                return;
              }

              if (!businessId) {
                console.error('❌ Missing businessId');
                return;
              }

              // Initialize the session
              await initializeSession(twilioWs, callSid, businessId);
              sessionInitialized = true;
              console.log('✅ Session initialized successfully');

            } catch (startError) {
              console.error('❌ Error in start event handler:', startError.message);
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
        console.error('❌ Error processing message:', error.message);
      }
    });

    // Session initialization function
    async function initializeSession(twilioWs, callSid, businessId) {
      console.log(`🔧 Initializing session for Call: ${callSid}, Business: ${businessId}`);

      try {
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

        console.log(`⚙️  AI Config - Voice: ${voice}, Temp: ${temperature}, VAD: ${turnDetectionType}`);

        if (OpenAIRealtimeService) {
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
            await openAIService.connect();
            console.log('✅ OpenAI connected successfully');
          } catch (error) {
            console.error('❌ Failed to connect to OpenAI:', error.message);
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

        console.log(`✅ Session stored - Active sessions: ${activeSessions.size}\n`);

      } catch (error) {
        console.error('❌ SESSION INIT ERROR:', error.message);

        if (openAIService) {
          try {
            openAIService.close();
          } catch (closeError) {
            console.error('Error closing OpenAI service:', closeError.message);
          }
        }
      }
    }

    twilioWs.on('error', (error) => {
      console.error(`❌ WebSocket error: ${error.message}`);
    });

    twilioWs.on('close', (code, reason) => {
      clearTimeout(noMessageTimeout);
      clearInterval(pingInterval);
      console.log(`🔌 WebSocket closed - Code: ${code}, Reason: ${reason || 'N/A'}, Call: ${callSid || 'N/A'}, Messages: ${messageCount}`);

      if (callSid && !isCleaningUp) {
        isCleaningUp = true;
        handleCallEnd(callSid).catch(err => {
          console.error('Error in handleCallEnd:', err.message);
        });
      }
    });
  });

  // Handle call end
  async function handleCallEnd(callSid) {
    const session = activeSessions.get(callSid);

    if (!session) {
      console.log(`⏭️  Session already cleaned up for: ${callSid}`);
      return;
    }

    console.log(`🏁 Call ending: ${callSid}`);

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

      console.log(`✅ Call log updated - Transcript: ${transcript.length} items, Sentiment: ${sentiment}`);

      // Close OpenAI connection
      if (session.openAIService) {
        try {
          session.openAIService.close();
        } catch (closeError) {
          console.error('Error closing OpenAI service:', closeError.message);
        }
      }

    } catch (error) {
      console.error('❌ Error handling call end:', error.message);
    }
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
    const { pathname } = parse(request.url, true);
    console.log(`🔄 Upgrade request received:`);
    console.log(`   Pathname: ${pathname}`);
    console.log(`   Headers:`, request.headers);

    if (pathname === '/api/twilio/stream') {
      console.log('✅ Valid upgrade path, handling upgrade...');
      wss.handleUpgrade(request, socket, head, (ws) => {
        console.log('✅ Upgrade successful, emitting connection event');
        wss.emit('connection', ws, request);
      });
    } else {
      console.error(`❌ Invalid pathname: ${pathname}`);
      socket.destroy();
    }
  });

  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`\n🚀 Server started on http://${hostname}:${port}`);
    console.log(`   WebSocket: ws://${hostname}:${port}/api/twilio/stream`);
    console.log(`   Environment: ${dev ? 'development' : 'production'}\n`);
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
