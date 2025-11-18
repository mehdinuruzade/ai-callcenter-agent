import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';
import { prisma } from '@/lib/prisma';

const VoiceResponse = twilio.twiml.VoiceResponse;

export async function POST(req: NextRequest) {
  try {
    console.log('📞 ========== INCOMING CALL ==========');
    
    const formData = await req.formData();
    const callSid = formData.get('CallSid') as string;
    const from = (formData.get('From') as string)?.trim();
    const to = (formData.get('To') as string)?.trim();
    const callStatus = formData.get('CallStatus') as string;
    
    console.log('📞 Call Details:');
    console.log(`   Call SID: ${callSid}`);
    console.log(`   From: ${from}`);
    console.log(`   To: ${to}`);
    console.log(`   Status: ${callStatus}`);

    // Find business by phone number
    console.log('🔍 Looking up business...');
    
    const phoneNumber = await prisma.phoneNumber.findUnique({
      where: { number: to },
      include: { 
        business: {
          include: {
            configurations: true,
          }
        } 
      },
    });

    if (!phoneNumber || !phoneNumber.isActive) {
      console.log('❌ Phone number not found or inactive');
      
      const response = new VoiceResponse();
      response.say('Sorry, this number is not configured. Please contact support.');
      response.hangup();
      
      return new NextResponse(response.toString(), {
        headers: { 'Content-Type': 'text/xml' },
      });
    }

    console.log(`✅ Business found: ${phoneNumber.business.name}`);

    // Check if business is active
    if (!phoneNumber.business.isActive) {
      console.log('❌ Business is inactive');
      
      const response = new VoiceResponse();
      response.say('This service is currently unavailable. Please try again later.');
      response.hangup();
      
      return new NextResponse(response.toString(), {
        headers: { 'Content-Type': 'text/xml' },
      });
    }

    // Create or update call log (Twilio may send duplicate webhooks)
    console.log('💾 Persisting call log...');
    const callLog = await prisma.callLog.upsert({
      where: { callSid },
      create: {
        callSid,
        fromNumber: from,
        toNumber: to,
        businessId: phoneNumber.businessId,
        status: 'initiated',
        direction: 'inbound',
        startTime: new Date(),
      },
      update: {
        fromNumber: from,
        toNumber: to,
        status: callStatus || 'initiated',
      },
    });
    console.log(`✅ Call log ready: ${callLog.id}`);

    // Generate WebSocket URL
    const baseUrl = process.env.PUBLIC_URL || process.env.NGROK_URL;
    
    let wsUrl;
    if (baseUrl) {
      wsUrl = `wss://${baseUrl.replace(/^https?:\/\//, '')}/api/twilio/stream`;
    } else {
      const host = req.headers.get('host');
      const protocol = req.headers.get('x-forwarded-proto') === 'https' ? 'wss' : 'ws';
      wsUrl = `${protocol}://${host}/api/twilio/stream`;
    }

    console.log('📡 Stream URL:', wsUrl);
    console.log('📡 Parameters: callSid=' + callSid + ', businessId=' + phoneNumber.businessId);

    // Create TwiML response with Stream
    const response = new VoiceResponse();
    const connect = response.connect();
    const stream = connect.stream({ url: wsUrl });
    
    // Add parameters
    stream.parameter({ name: 'callSid', value: callSid });
    stream.parameter({ name: 'businessId', value: phoneNumber.businessId });

    const twiml = response.toString();
    console.log('📄 TwiML Response:');
    console.log(twiml);
    console.log('✅ Sending TwiML response with Stream');
    console.log('=====================================\n');

    return new NextResponse(twiml, {
      headers: { 'Content-Type': 'text/xml' },
    });

  } catch (error) {
    console.error('❌ Error handling voice webhook:', error);
    console.error('Stack:', error instanceof Error ? error.stack : 'No stack');
    
    const response = new VoiceResponse();
    response.say('An error occurred. Please try again later.');
    response.hangup();
    
    return new NextResponse(response.toString(), {
      status: 500,
      headers: { 'Content-Type': 'text/xml' },
    });
  }
}

export async function GET(req: NextRequest) {
  return NextResponse.json({
    message: 'Twilio Voice Webhook',
    endpoint: '/api/twilio/voice',
    method: 'POST',
    status: 'operational',
  });
}
