import WebSocket from 'ws';
import { vectorService } from './vector-service';
import { prisma } from './prisma';

export interface RealtimeSession {
  callSid: string;
  businessId: string;
  ws: WebSocket;
  openaiWs?: WebSocket;
  transcript: string[];
}

export class RealtimeService {
  private sessions: Map<string, RealtimeSession> = new Map();

  /**
   * Create a new real-time session for a call
   */
  async createSession(
    callSid: string,
    businessId: string,
    ws: WebSocket
  ): Promise<RealtimeSession> {
    const session: RealtimeSession = {
      callSid,
      businessId,
      ws,
      transcript: [],
    };

    this.sessions.set(callSid, session);

    // Initialize OpenAI Real-time API connection
    await this.initializeOpenAI(session);

    return session;
  }

  /**
   * Initialize OpenAI Real-time API WebSocket connection
   */
  private async initializeOpenAI(session: RealtimeSession) {
    const openaiWs = new WebSocket(
      'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01',
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          'OpenAI-Beta': 'realtime=v1',
        },
      }
    );

    session.openaiWs = openaiWs;

    // Get business configuration
    const business = await prisma.business.findUnique({
      where: { id: session.businessId },
      include: { configurations: true },
    });

    openaiWs.on('open', async () => {
      console.log('OpenAI WebSocket connected for call:', session.callSid);

      // Get system instructions from configuration
      const systemInstructions = await this.buildSystemInstructions(
        session.businessId
      );

      // Initialize session with configuration
      openaiWs.send(
        JSON.stringify({
          type: 'session.update',
          session: {
            modalities: ['text', 'audio'],
            instructions: systemInstructions,
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
                  'Search the company knowledge base for relevant information',
                parameters: {
                  type: 'object',
                  properties: {
                    query: {
                      type: 'string',
                      description: 'The search query',
                    },
                  },
                  required: ['query'],
                },
              },
            ],
            temperature: 0.7,
            max_response_output_tokens: 4096,
          },
        })
      );
    });

    openaiWs.on('message', async (data: WebSocket.Data) => {
      try {
        const response = JSON.parse(data.toString());

        switch (response.type) {
          case 'response.audio.delta':
            // Forward audio to Twilio
            if (session.ws.readyState === WebSocket.OPEN) {
              session.ws.send(
                JSON.stringify({
                  event: 'media',
                  streamSid: session.callSid,
                  media: {
                    payload: response.delta,
                  },
                })
              );
            }
            break;

          case 'conversation.item.input_audio_transcription.completed':
            // Store user transcript
            session.transcript.push(`User: ${response.transcript}`);
            break;

          case 'response.done':
            // Store AI response transcript
            if (response.response?.output) {
              const aiText = response.response.output
                .map((o: any) => o.content?.[0]?.transcript || '')
                .join(' ');
              if (aiText) {
                session.transcript.push(`AI: ${aiText}`);
              }
            }
            break;

          case 'response.function_call_arguments.done':
            // Handle function calls (RAG queries)
            await this.handleFunctionCall(session, response);
            break;

          case 'error':
            console.error('OpenAI error:', response.error);
            break;
        }
      } catch (error) {
        console.error('Error processing OpenAI message:', error);
      }
    });

    openaiWs.on('error', (error) => {
      console.error('OpenAI WebSocket error:', error);
    });

    openaiWs.on('close', () => {
      console.log('OpenAI WebSocket closed for call:', session.callSid);
    });
  }

  /**
   * Build system instructions with RAG context
   */
  private async buildSystemInstructions(businessId: string): Promise<string> {
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      include: { configurations: true },
    });

    if (!business) {
      return 'You are a helpful customer service agent.';
    }

    // Get personality and greeting from configuration
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
      `Hello! I'm calling from ${business.name}. How can I help you today?`;

    return `You are an AI customer service agent for ${business.name} in the ${business.domain} industry.

Your personality: ${personality}

Greeting: ${greeting}

Guidelines:
- Be conversational and natural
- Listen carefully to customer needs
- Use the query_knowledge_base function to search for specific information when needed
- Keep responses concise and clear
- Show empathy and understanding
- If you don't know something, use the knowledge base or admit you need to transfer to a human
- End calls professionally and ensure customer satisfaction

Remember: You're representing ${business.name}, so maintain their brand voice and values.`;
  }

  /**
   * Handle function calls from OpenAI (RAG queries)
   */
  private async handleFunctionCall(
    session: RealtimeSession,
    response: any
  ) {
    if (response.name === 'query_knowledge_base') {
      const args = JSON.parse(response.arguments);
      const query = args.query;

      // Query vector database
      const results = await vectorService.queryContent(
        query,
        session.businessId,
        3
      );

      // Format results
      const knowledgeContext = results
        .map(
          (r: any, i: number) =>
            `Result ${i + 1}: ${r.metadata?.title}\n${r.metadata?.content}`
        )
        .join('\n\n');

      // Send results back to OpenAI
      if (session.openaiWs?.readyState === WebSocket.OPEN) {
        session.openaiWs.send(
          JSON.stringify({
            type: 'conversation.item.create',
            item: {
              type: 'function_call_output',
              call_id: response.call_id,
              output: JSON.stringify({
                knowledge: knowledgeContext || 'No relevant information found.',
              }),
            },
          })
        );

        // Trigger response generation
        session.openaiWs.send(
          JSON.stringify({
            type: 'response.create',
          })
        );
      }
    }
  }

  /**
   * Handle incoming audio from Twilio
   */
  handleIncomingAudio(callSid: string, audioPayload: string) {
    const session = this.sessions.get(callSid);
    if (session?.openaiWs?.readyState === WebSocket.OPEN) {
      session.openaiWs.send(
        JSON.stringify({
          type: 'input_audio_buffer.append',
          audio: audioPayload,
        })
      );
    }
  }

  /**
   * End a session
   */
  async endSession(callSid: string) {
    const session = this.sessions.get(callSid);
    if (session) {
      // Save transcript to database
      await prisma.callLog.update({
        where: { callSid },
        data: {
          transcript: session.transcript.join('\n'),
        },
      });

      // Close OpenAI connection
      session.openaiWs?.close();

      // Remove session
      this.sessions.delete(callSid);
    }
  }

  /**
   * Get active session
   */
  getSession(callSid: string): RealtimeSession | undefined {
    return this.sessions.get(callSid);
  }
}

export const realtimeService = new RealtimeService();
