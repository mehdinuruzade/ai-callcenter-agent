const { createServer } = require('http');
const { parse } = require('url');
const { WebSocketServer } = require('ws');

const server = createServer((req, res) => {
  res.writeHead(200);
  res.end('Minimal Twilio WebSocket Server');
});

const wss = new WebSocketServer({ noServer: true });

wss.on('connection', (ws, req) => {
  console.log('\n✅ CONNECTED');
  console.log('Headers:', req.headers);

  ws.on('message', (msg) => {
    console.log('📨 MSG:', msg.toString());
  });

  ws.on('close', (code) => {
    console.log('🔌 CLOSED:', code);
  });

  ws.on('error', (err) => {
    console.error('❌ ERROR:', err);
  });
});

server.on('upgrade', (request, socket, head) => {
  console.log('\n🔄 UPGRADE:', request.url);
  const { pathname } = parse(request.url);

  if (pathname === '/api/twilio/stream') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

server.listen(3000, () => {
  console.log('🚀 Server on http://localhost:3000');
});

