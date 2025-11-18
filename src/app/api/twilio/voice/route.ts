import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';
import { prisma } from '@/lib/prisma';

const VoiceResponse = twilio.twiml.VoiceResponse;

export async function POST(req: NextRequest) {
  try {
    console.log('📞 Incoming call webhook triggered');

    const formData = await req.formData();
    const callSid = formData.get('CallSid') as string;
    const from = formData.get('From') as string;
    const to = formData.get('To') as string;

    console.log(`Call details - SID: ${callSid}, From: ${from}, To: ${to}`);

    // Find which business this phone number belongs to
    const phoneNumber = await prisma.phoneNumber.findUnique({
      where: { number: to },
      include: { business: true },
    });

    if (!phoneNumber || !phoneNumber.business.isActive) {
      console.log('⚠️ Phone number not found or business inactive');

      const response = new VoiceResponse();
      response.say('This number is not currently in service. Goodbye.');
      response.hangup();

      return new NextResponse(response.toString(), {
        headers: { 'Content-Type': 'text/xml' },
      });
    }

    console.log(`✅ Found business: ${phoneNumber.business.name} (${phoneNumber.businessId})`);

    // Create call log
    await prisma.callLog.create({
      data: {
        callSid,
        fromNumber: from,
        toNumber: to,
        status: 'initiated',
        businessId: phoneNumber.businessId,
      },
    });

    console.log('✅ Call log created');

    // Get the WebSocket URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || `http://localhost:3000`;
    const wsUrl = appUrl.replace('https://', 'wss://').replace('http://', 'ws://');
    const streamUrl = `${wsUrl}/api/twilio/stream`;

    console.log(`🔗 Stream URL: ${streamUrl}`);

    // Create TwiML response with WebSocket connection
    const response = new VoiceResponse();

    // Connect to our WebSocket server for real-time audio
    const connect = response.connect();
    const stream = connect.stream({
      url: streamUrl,
    });

    // Pass parameters to WebSocket
    stream.parameter({
      name: 'callSid',
      value: callSid,
    });
    stream.parameter({
      name: 'businessId',
      value: phoneNumber.businessId,
    });

    console.log('✅ TwiML response generated with Stream');

    return new NextResponse(response.toString(), {
      headers: { 'Content-Type': 'text/xml' },
    });
  } catch (error) {
    console.error('❌ Twilio voice webhook error:', error);

    const response = new VoiceResponse();
    response.say('An error occurred. Please try again later.');
    response.hangup();

    return new NextResponse(response.toString(), {
      headers: { 'Content-Type': 'text/xml' },
      status: 500,
    });
  }
}
