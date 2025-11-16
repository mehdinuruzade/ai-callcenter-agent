import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';
import { prisma } from '@/lib/prisma';

const VoiceResponse = twilio.twiml.VoiceResponse;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const callSid = formData.get('CallSid') as string;
    const from = formData.get('From') as string;
    const to = formData.get('To') as string;

    // Find which business this phone number belongs to
    const phoneNumber = await prisma.phoneNumber.findUnique({
      where: { number: to },
      include: { business: true },
    });

    if (!phoneNumber || !phoneNumber.business.isActive) {
      const response = new VoiceResponse();
      response.say('This number is not currently in service. Goodbye.');
      response.hangup();

      return new NextResponse(response.toString(), {
        headers: { 'Content-Type': 'text/xml' },
      });
    }

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

    // Create TwiML response with WebSocket connection
    const response = new VoiceResponse();
    
    // Connect to our WebSocket server for real-time audio
    const connect = response.connect();
    connect.stream({
      url: `wss://${process.env.NEXT_PUBLIC_APP_URL?.replace('https://', '') || 'localhost:3000'}/api/twilio/stream`,
      parameters: {
        callSid,
        businessId: phoneNumber.businessId,
      },
    });

    return new NextResponse(response.toString(), {
      headers: { 'Content-Type': 'text/xml' },
    });
  } catch (error) {
    console.error('Twilio voice webhook error:', error);

    const response = new VoiceResponse();
    response.say('An error occurred. Please try again later.');
    response.hangup();

    return new NextResponse(response.toString(), {
      headers: { 'Content-Type': 'text/xml' },
      status: 500,
    });
  }
}
