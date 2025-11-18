const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const WebSocket = require('ws');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = 3000;

// Load environment variables
require('dotenv').config();

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
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

  // Setup WebSocket server
  const wss = new WebSocket.Server({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const { pathname } = parse(request.url || '', true);

    console.log('WebSocket upgrade request:', pathname);

    if (pathname === '/api/twilio/stream') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else {
      console.log('Rejected WebSocket upgrade for:', pathname);
      socket.destroy();
    }
  });

  wss.on('connection', async (ws, request) => {
    console.log('✅ New Twilio WebSocket connection established');

    let callSid = null;
    let businessId = null;
    let realtimeService = null;

    // Dynamically import the realtime service
    try {
      const module = await import('./src/lib/realtime-service.js');
      realtimeService = module.realtimeService;
    } catch (error) {
      console.error('❌ Error loading realtime service:', error);
    }

    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());
        console.log('📨 Received event:', data.event);

        switch (data.event) {
          case 'start':
            callSid = data.start.callSid;
            businessId = data.start.customParameters?.businessId;
            console.log(`🎬 Call started - SID: ${callSid}, Business: ${businessId}`);

            if (!businessId) {
              console.error('⚠️ No businessId in custom parameters!');
              break;
            }

            // Initialize realtime session
            if (realtimeService) {
              try {
                await realtimeService.createSession(callSid, businessId, ws);
              } catch (error) {
                console.error('❌ Error creating session:', error);
              }
            }
            break;

          case 'media':
            if (callSid && data.media?.payload && realtimeService) {
              // Forward audio to OpenAI
              realtimeService.handleIncomingAudio(callSid, data.media.payload);
            }
            break;

          case 'stop':
            console.log(`🛑 Call ended - SID: ${callSid}`);
            if (callSid && realtimeService) {
              // End session
              try {
                await realtimeService.endSession(callSid);
              } catch (error) {
                console.error('❌ Error ending session:', error);
              }
            }
            break;

          default:
            console.log('Unknown event:', data.event);
        }
      } catch (error) {
        console.error('❌ Error processing WebSocket message:', error);
      }
    });

    ws.on('close', async () => {
      console.log('🔌 WebSocket connection closed');
      // Cleanup session if needed
      if (callSid && realtimeService) {
        try {
          await realtimeService.endSession(callSid);
        } catch (error) {
          // Session might already be ended
        }
      }
    });

    ws.on('error', (error) => {
      console.error('❌ WebSocket error:', error);
    });
  });

  server
    .once('error', (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`
🚀 Server ready!
   - Local:    http://${hostname}:${port}
   - Network:  Use ngrok to expose this server

📞 Twilio webhook endpoints:
   - Voice:    https://your-ngrok-url.ngrok.io/api/twilio/voice
   - WebSocket: wss://your-ngrok-url.ngrok.io/api/twilio/stream
      `);
    });
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});
