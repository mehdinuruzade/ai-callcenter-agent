import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    console.log('📊 ========== CALL STATUS UPDATE ==========');
    
    const formData = await req.formData();
    const callSid = formData.get('CallSid') as string;
    const callStatus = formData.get('CallStatus') as string;
    const callDuration = formData.get('CallDuration') as string;

    console.log('📊 Status Update:');
    console.log(`   Call SID: ${callSid}`);
    console.log(`   Status: ${callStatus}`);
    console.log(`   Duration: ${callDuration}s`);

    // Build update data
    const updateData: any = {
      status: callStatus.toLowerCase(),
    };

    // Add endTime and duration for completed calls
    if (callStatus === 'completed' || callStatus === 'failed' || callStatus === 'busy' || callStatus === 'no-answer') {
      updateData.endTime = new Date();
      
      if (callDuration) {
        updateData.duration = parseInt(callDuration);
      }
    }

    const callLog = await prisma.callLog.updateMany({
      where: { callSid },
      data: updateData,
    });

    console.log(`✅ Updated ${callLog.count} call log(s)`);
    console.log('==========================================\n');

    return NextResponse.json({ 
      success: true,
      updated: callLog.count 
    });

  } catch (error) {
    console.error('❌ Error updating call status:', error);
    return NextResponse.json(
      { error: 'Failed to update call status' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  return NextResponse.json({
    message: 'Twilio Status Callback',
    endpoint: '/api/twilio/status',
    method: 'POST',
    status: 'operational',
  });
}