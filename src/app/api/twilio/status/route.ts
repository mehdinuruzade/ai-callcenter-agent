import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const callSid = formData.get('CallSid') as string;
    const callStatus = formData.get('CallStatus') as string;
    const callDuration = formData.get('CallDuration') as string;
    const recordingUrl = formData.get('RecordingUrl') as string | null;

    // Update call log
    await prisma.callLog.update({
      where: { callSid },
      data: {
        status: callStatus,
        duration: callDuration ? parseInt(callDuration) : undefined,
        recordingUrl: recordingUrl || undefined,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Twilio status callback error:', error);
    return NextResponse.json({ error: 'Failed to process callback' }, { status: 500 });
  }
}
