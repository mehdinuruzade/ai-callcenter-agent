import { Server } from 'http';
import WebSocket from 'ws';
import { realtimeService } from '@/lib/realtime-service';
import { parse } from 'url';

export function setupWebSocketServer(server: Server) {
  const wss = new WebSocket.Server({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const { pathname, query } = parse(request.url || '', true);

    if (pathname === '/api/twilio/stream') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request, query);
      });
    } else {
      socket.destroy();
    }
  });

  wss.on('connection', async (ws: WebSocket, request: any, query: any) => {
    console.log('New WebSocket connection from Twilio');

    let callSid: string | null = null;
    let businessId: string | null = null;

    ws.on('message', async (message: WebSocket.Data) => {
      try {
        const data = JSON.parse(message.toString());

        switch (data.event) {
          case 'start':
            callSid = data.start.callSid;
            businessId = data.start.customParameters.businessId;

            if (callSid && businessId) {
              await realtimeService.createSession(callSid, businessId, ws);
              console.log(`Session started for call: ${callSid}`);
            }
            break;

          case 'media':
            if (callSid && data.media?.payload) {
              realtimeService.handleIncomingAudio(callSid, data.media.payload);
            }
            break;

          case 'stop':
            if (callSid) {
              await realtimeService.endSession(callSid);
              console.log(`Session ended for call: ${callSid}`);
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
      console.log('WebSocket connection closed');
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });

  return wss;
}
