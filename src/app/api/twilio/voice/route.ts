import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';
import { prisma } from '@/lib/prisma';

const VoiceResponse = twilio.twiml.VoiceResponse;

/**
 * TODO: Handle incoming Twilio voice calls
 *
 * This endpoint is called by Twilio when someone calls your Twilio number.
 *
 * Steps to implement:
 * 1. Parse form data from request (CallSid, From, To)
 * 2. Look up the phone number in database to find which business it belongs to
 * 3. Check if business is active
 * 4. If not found or inactive, return TwiML saying "not in service" and hangup
 * 5. Create a call log in database with status 'initiated'
 * 6. Create TwiML response with <Connect> and <Stream> elements
 * 7. The stream URL should point to your WebSocket endpoint (/api/twilio/stream)
 * 8. Pass callSid and businessId as stream parameters
 * 9. Return TwiML as XML response with Content-Type: text/xml
 * 10. Handle errors gracefully with error TwiML
 *
 * @param req - Next.js request object
 * @returns NextResponse with TwiML XML
 */
export async function POST(req: NextRequest) {
  // TODO: Implement Twilio voice webhook handler
  // Hint: Check Twilio TwiML documentation for <Connect> and <Stream> syntax
  throw new Error('Not implemented: POST /api/twilio/voice');
}
