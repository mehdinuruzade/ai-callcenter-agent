import { NextRequest } from 'next/server';

// This route should NOT handle WebSocket connections
// WebSocket upgrades are handled by the custom server in server.js

export async function GET(req: NextRequest) {
  return new Response(
    'WebSocket endpoint - connection handled by custom server at ws://localhost:3000/api/twilio/stream', 
    { status: 200 }
  );
}

export async function POST(req: NextRequest) {
  console.log('⚠️  ========== UNEXPECTED POST TO /api/twilio/stream ==========');
  console.log('This endpoint should receive WebSocket upgrade requests, not POST');
  console.log('URL:', req.url);
  console.log('Headers:', Object.fromEntries(req.headers));
  
  const body = await req.text();
  console.log('Body:', body);
  console.log('==============================================================\n');
  
  return new Response(
    'This endpoint requires WebSocket upgrade (426)', 
    { status: 426 }
  );
}

export const dynamic = 'force-dynamic';