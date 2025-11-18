import WebSocket from 'ws';
import { vectorService } from './vector-service';
import { prisma } from './prisma';

export interface RealtimeSession {
  callSid: string;
  businessId: string;
  twilioWs: WebSocket;
  openaiWs?: WebSocket;
  transcript: string[];
}

export class RealtimeService {
  private sessions: Map<string, RealtimeSession> = new Map();

  /**
   * Create a new real-time session for a call
   *
   * @param callSid - Twilio call SID
   * @param businessId - Business identifier
   * @param twilioWs - WebSocket connection to Twilio
   * @returns Promise<RealtimeSession>
   */
  async createSession(
    callSid: string,
    businessId: string,
    twilioWs: WebSocket
  ): Promise<RealtimeSession> {
    console.log(`🔵 Creating session for call: ${callSid}`);

    // Create session object
    const session: RealtimeSession = {
      callSid,
      businessId,
      twilioWs,
      transcript: [],
    };

    // Store in sessions map
    this.sessions.set(callSid, session);

    // Initialize OpenAI connection
    await this.initializeOpenAI(session);

    console.log(`✅ Session created for call: ${callSid}`);
    return session;
  }

  /**
   * Initialize OpenAI Real-time API WebSocket connection
   *
   * @param session - The realtime session
   */
  private async initializeOpenAI(session: RealtimeSession) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY not found in environment');
    }

    // Build system instructions
    const instructions = await this.buildSystemInstructions(session.businessId);

    // Create WebSocket connection to OpenAI
    const url = 'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17';

    const openaiWs = new WebSocket(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'OpenAI-Beta': 'realtime=v1',
      },
    });

    session.openaiWs = openaiWs;

    // Handle WebSocket open event
    openaiWs.on('open', () => {
      console.log('🟢 OpenAI WebSocket connected');

      // Send session configuration
      const sessionConfig = {
        type: 'session.update',
        session: {
          modalities: ['text', 'audio'],
          instructions: instructions,
          voice: 'alloy',
          input_audio_format: 'g711_ulaw',
          output_audio_format: 'g711_ulaw',
          input_audio_transcription: {
            model: 'whisper-1',
          },
          turn_detection: {
            type: 'server_vad',
            threshold: 0.5,
            prefix_padding_ms: 300,
            silence_duration_ms: 500,
          },
          tools: [
            {
              type: 'function',
              name: 'query_knowledge_base',
              description:
                'Search the knowledge base for information about the business, products, services, pricing, hours, policies, etc.',
              parameters: {
                type: 'object',
                properties: {
                  query: {
                    type: 'string',
                    description: 'The search query to find relevant information',
                  },
                },
                required: ['query'],
              },
            },
          ],
        },
      };

      openaiWs.send(JSON.stringify(sessionConfig));
      console.log('✅ OpenAI session configured');
    });

    // Handle incoming messages from OpenAI
    openaiWs.on('message', async (data: WebSocket.Data) => {
      try {
        const event = JSON.parse(data.toString());

        switch (event.type) {
          case 'session.created':
            console.log('🎉 OpenAI session created');
            break;

          case 'session.updated':
            console.log('✅ OpenAI session updated');
            break;

          case 'response.audio.delta':
            // Forward audio to Twilio
            if (event.delta && session.twilioWs.readyState === WebSocket.OPEN) {
              const audioMessage = {
                event: 'media',
                streamSid: session.callSid,
                media: {
                  payload: event.delta,
                },
              };
              session.twilioWs.send(JSON.stringify(audioMessage));
            }
            break;

          case 'conversation.item.input_audio_transcription.completed':
            // Log user's speech
            const userText = event.transcript;
            if (userText) {
              console.log(`🗣️  User said: ${userText}`);
              session.transcript.push(`User: ${userText}`);
            }
            break;

          case 'response.audio_transcript.done':
            // Log AI's response
            const aiText = event.transcript;
            if (aiText) {
              console.log(`🤖 AI said: ${aiText}`);
              session.transcript.push(`AI: ${aiText}`);
            }
            break;

          case 'response.function_call_arguments.done':
            // Handle function call
            await this.handleFunctionCall(session, event);
            break;

          case 'error':
            console.error('❌ OpenAI error:', event.error);
            break;

          default:
            // Log other events for debugging
            if (event.type?.startsWith('response.') || event.type?.startsWith('conversation.')) {
              // Uncomment for verbose logging:
              // console.log('OpenAI event:', event.type);
            }
        }
      } catch (error) {
        console.error('Error processing OpenAI message:', error);
      }
    });

    // Handle WebSocket errors
    openaiWs.on('error', (error) => {
      console.error('❌ OpenAI WebSocket error:', error);
    });

    // Handle WebSocket closure
    openaiWs.on('close', () => {
      console.log('🔴 OpenAI WebSocket closed');
    });
  }

  /**
   * Build system instructions with RAG context
   *
   * @param businessId - The business identifier
   * @returns Promise<string> - System instructions for OpenAI
   */
  private async buildSystemInstructions(businessId: string): Promise<string> {
    // Query database for business and configurations
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      include: {
        configurations: true,
      },
    });

    if (!business) {
      throw new Error(`Business not found: ${businessId}`);
    }

    // Extract configurations
    const personalityConfig = business.configurations.find(
      (c) => c.key === 'ai_personality'
    );
    const greetingConfig = business.configurations.find(
      (c) => c.key === 'greeting_message'
    );

    const personality =
      (personalityConfig?.value as any)?.text ||
      'professional and helpful';
    const greeting =
      (greetingConfig?.value as any)?.text ||
      `Hello! Thanks for calling ${business.name}. How can I help you today?`;

    // Build system instructions
    const instructions = `You are an AI phone assistant for ${business.name}, a ${business.domain} business.

PERSONALITY:
${personality}

GREETING:
When the call starts, greet the caller with: "${greeting}"

GUIDELINES:
- Be conversational and natural
- Keep responses brief and to the point (this is a phone call)
- Use the query_knowledge_base function when you need specific information about the business
- If you don't know something and can't find it in the knowledge base, say so honestly
- Be helpful and try to resolve the caller's needs
- Stay in character for the business domain (${business.domain})

KNOWLEDGE BASE:
Use the query_knowledge_base function to search for information about:
- Products and services
- Pricing and availability
- Business hours and location
- Policies and procedures
- FAQs

Always query the knowledge base when the caller asks about specific details.`;

    return instructions;
  }

  /**
   * Handle function calls from OpenAI (RAG queries)
   *
   * @param session - The realtime session
   * @param event - The function call event from OpenAI
   */
  private async handleFunctionCall(session: RealtimeSession, event: any) {
    try {
      const functionName = event.name;
      const callId = event.call_id;
      const args = JSON.parse(event.arguments);

      console.log(`🔍 Function call: ${functionName}`, args);

      if (functionName === 'query_knowledge_base') {
        const query = args.query;

        // Search knowledge base
        const results = await vectorService.queryContent(
          query,
          session.businessId,
          3
        );

        console.log(`📚 Found ${results.length} knowledge base results`);

        // Format results
        let output = '';
        if (results.length === 0) {
          output = 'No relevant information found in the knowledge base.';
        } else {
          output = 'Found the following information:\n\n';
          results.forEach((result, index) => {
            output += `${index + 1}. ${result.title}\n${result.content}\n\n`;
          });
        }

        // Send function output back to OpenAI
        if (session.openaiWs && session.openaiWs.readyState === WebSocket.OPEN) {
          const functionOutput = {
            type: 'conversation.item.create',
            item: {
              type: 'function_call_output',
              call_id: callId,
              output: output,
            },
          };

          session.openaiWs.send(JSON.stringify(functionOutput));

          // Trigger response generation
          const createResponse = {
            type: 'response.create',
          };

          session.openaiWs.send(JSON.stringify(createResponse));

          console.log('✅ Knowledge base results sent to OpenAI');
        }
      }
    } catch (error) {
      console.error('Error handling function call:', error);
    }
  }

  /**
   * Handle incoming audio from Twilio
   *
   * @param callSid - The call SID
   * @param audioPayload - Base64 encoded audio from Twilio
   */
  handleIncomingAudio(callSid: string, audioPayload: string) {
    const session = this.sessions.get(callSid);

    if (!session) {
      console.error(`Session not found for call: ${callSid}`);
      return;
    }

    if (!session.openaiWs || session.openaiWs.readyState !== WebSocket.OPEN) {
      console.error('OpenAI WebSocket not ready');
      return;
    }

    // Forward audio to OpenAI
    const audioMessage = {
      type: 'input_audio_buffer.append',
      audio: audioPayload,
    };

    session.openaiWs.send(JSON.stringify(audioMessage));
  }

  /**
   * End a session
   *
   * @param callSid - The call SID to end
   */
  async endSession(callSid: string) {
    const session = this.sessions.get(callSid);

    if (!session) {
      console.log(`Session not found for call: ${callSid}`);
      return;
    }

    console.log(`🔴 Ending session for call: ${callSid}`);

    try {
      // Update call log with transcript
      const transcriptText = session.transcript.join('\n');

      await prisma.callLog.update({
        where: { callSid },
        data: {
          transcript: transcriptText,
          status: 'completed',
          updatedAt: new Date(),
        },
      });

      console.log('✅ Call log updated with transcript');
    } catch (error) {
      console.error('Error updating call log:', error);
    }

    // Close OpenAI WebSocket
    if (session.openaiWs) {
      session.openaiWs.close();
    }

    // Remove session from map
    this.sessions.delete(callSid);

    console.log(`✅ Session ended for call: ${callSid}`);
  }

  /**
   * Get active session
   */
  getSession(callSid: string): RealtimeSession | undefined {
    return this.sessions.get(callSid);
  }
}

export const realtimeService = new RealtimeService();
