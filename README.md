# AI Call Center Agent

A multi-domain AI-powered call center agent built with Next.js, OpenAI Real-time API, Twilio, and RAG (Retrieval-Augmented Generation) capabilities.

## Features

- 🤖 **AI-Powered Voice Agent**: Powered by OpenAI Real-time API with natural voice conversations
- 📞 **Twilio Integration**: Handle incoming and outgoing calls
- 🧠 **RAG Support**: Vector database (Pinecone) for knowledge base queries
- 🏢 **Multi-Business**: Support multiple businesses with separate configurations
- ⚙️ **Admin Panel**: Manage knowledge base, configurations, and view analytics
- 📊 **Call Analytics**: Track call metrics, sentiment, and transcripts
- 🔄 **Real-time Streaming**: WebSocket-based audio streaming

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Twilio    │────▶│   Next.js    │────▶│   OpenAI    │
│   (Voice)   │◀────│   (Backend)  │◀────│  Real-time  │
└─────────────┘     └──────────────┘     └─────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │  PostgreSQL  │
                    │  + Prisma    │
                    └──────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │   Pinecone   │
                    │   (Vectors)  │
                    └──────────────┘
```

## Prerequisites

- Node.js 18+
- PostgreSQL database
- Twilio account with phone number
- OpenAI API key (with Real-time API access)
- Pinecone account (for vector database)

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
git clone <your-repo>
cd ai-callcenter-agent
npm install
```

### 2. Set Up Environment Variables

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Required variables:
- `DATABASE_URL`: PostgreSQL connection string
- `TWILIO_ACCOUNT_SID`: From Twilio console
- `TWILIO_AUTH_TOKEN`: From Twilio console
- `TWILIO_PHONE_NUMBER`: Your Twilio phone number
- `OPENAI_API_KEY`: OpenAI API key
- `PINECONE_API_KEY`: Pinecone API key
- `PINECONE_ENVIRONMENT`: Pinecone environment
- `PINECONE_INDEX_NAME`: Name of your Pinecone index
- `JWT_SECRET`: Random secret for JWT tokens

### 3. Set Up Database

```bash
# Generate Prisma client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate

# (Optional) Open Prisma Studio to view data
npm run prisma:studio
```

### 4. Set Up Pinecone

1. Create a Pinecone account at https://www.pinecone.io/
2. Create a new index with:
   - Dimensions: 1536 (for OpenAI text-embedding-3-small)
   - Metric: cosine
3. Add the index name and API key to your `.env` file

### 5. Configure Twilio

1. Buy a phone number in Twilio console
2. Set up webhook URLs:
   - Voice webhook: `https://your-domain.com/api/twilio/voice`
   - Status callback: `https://your-domain.com/api/twilio/status`
3. Enable Media Streams in your Twilio console

### 6. Run the Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## Project Structure

```
ai-callcenter-agent/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── twilio/           # Twilio webhooks
│   │   │   ├── rag/               # RAG content management
│   │   │   ├── config/            # Configuration API
│   │   │   └── calls/             # Call logs & analytics
│   │   └── admin/                 # Admin panel pages
│   ├── components/                # React components
│   └── lib/
│       ├── prisma.ts             # Database client
│       ├── vector-service.ts     # Pinecone integration
│       ├── realtime-service.ts   # OpenAI Real-time API
│       └── websocket-server.ts   # WebSocket server
├── prisma/
│   └── schema.prisma             # Database schema
└── package.json
```

## Usage

### Admin Panel

1. Navigate to `http://localhost:3000/admin`
2. Create a new business
3. Add phone numbers to the business
4. Configure AI personality and settings
5. Add knowledge base content (RAG)

### Making Calls

1. Call your Twilio phone number
2. The AI agent will answer and engage in conversation
3. The agent uses RAG to answer questions from your knowledge base
4. All calls are logged in the admin panel

### Knowledge Base Management

1. Go to Admin → Knowledge Base
2. Add content in categories:
   - FAQ
   - Product Info
   - Policy
   - Troubleshooting
   - General
3. Content is automatically vectorized and stored in Pinecone
4. AI agent queries this knowledge during calls

### Configuration Options

Available configurations:
- **AI Personality**: Define the agent's communication style
- **Greeting Message**: Customize the initial greeting
- **Max Call Duration**: Set call time limits
- **Enable Recording**: Record calls for quality assurance
- **Transfer Number**: Fallback number for complex queries
- **Business Hours**: Define operating hours
- **Sentiment Analysis**: Enable/disable sentiment tracking

## API Endpoints

### Twilio Webhooks
- `POST /api/twilio/voice` - Handle incoming calls
- `POST /api/twilio/status` - Call status updates
- `WS /api/twilio/stream` - Media stream WebSocket

### Admin APIs
- `GET/POST/PUT/DELETE /api/rag` - RAG content management
- `GET/POST/PUT /api/config` - Configuration management
- `GET/POST /api/calls` - Call logs and analytics

## How It Works

### Call Flow

1. **Incoming Call**: Twilio receives a call and sends webhook to `/api/twilio/voice`
2. **WebSocket Connection**: Application establishes WebSocket with Twilio Media Streams
3. **OpenAI Connection**: Parallel WebSocket connection to OpenAI Real-time API
4. **Audio Streaming**: 
   - Caller's audio → Twilio → Our server → OpenAI
   - OpenAI response → Our server → Twilio → Caller
5. **RAG Integration**: When AI needs information, it calls `query_knowledge_base` function
6. **Vector Search**: Query is embedded and searched in Pinecone
7. **Response**: Relevant knowledge is injected into AI context
8. **Transcript Logging**: All conversations saved to database

### RAG System

1. **Content Addition**: Admin adds content via UI
2. **Embedding**: Content is converted to vector using OpenAI embeddings
3. **Storage**: Vector stored in Pinecone with metadata
4. **Query**: During calls, AI queries similar content
5. **Context Injection**: Retrieved content added to AI context

## Deployment

### Requirements

- Node.js hosting (Vercel, Railway, etc.)
- PostgreSQL database
- Public HTTPS endpoint for Twilio webhooks
- WebSocket support

### Vercel Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard
```

Note: Vercel has WebSocket limitations. For production, consider:
- Railway
- Render
- AWS/GCP/Azure with container deployment

### Docker Deployment

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
RUN npm run prisma:generate
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## Monitoring & Analytics

Track key metrics in the admin panel:
- Total calls
- Average call duration
- Call success rate
- Sentiment analysis
- Daily call volume
- Most common queries

## Troubleshooting

### Common Issues

1. **WebSocket Connection Failed**
   - Ensure your server supports WebSocket
   - Check firewall settings
   - Verify SSL/TLS configuration

2. **OpenAI Real-time API Not Working**
   - Verify API key has Real-time API access
   - Check OpenAI account billing status
   - Review error logs

3. **Pinecone Queries Slow**
   - Check index configuration (dimensions, metric)
   - Verify network latency
   - Consider using metadata filtering

4. **Twilio Webhook Errors**
   - Ensure public HTTPS endpoint
   - Verify Twilio signature validation
   - Check webhook URL configuration

## Security Considerations

- Use JWT for admin authentication
- Validate Twilio webhook signatures
- Implement rate limiting
- Store sensitive data encrypted
- Regular security audits
- GDPR/compliance for call recordings

## Cost Optimization

- Monitor OpenAI token usage
- Set max call durations
- Implement call queue limits
- Cache frequent queries
- Use Pinecone efficiently

## Roadmap

- [ ] Multi-language support
- [ ] Advanced analytics dashboard
- [ ] Call queuing and routing
- [ ] Integration with CRM systems
- [ ] Voice cloning options
- [ ] Custom wake words
- [ ] SMS integration
- [ ] Live call monitoring

## Contributing

Contributions are welcome! Please read our contributing guidelines.

## License

MIT License - See LICENSE file for details

## Support

For issues and questions:
- GitHub Issues
- Email: support@example.com
- Documentation: https://docs.example.com

## Credits

Built with:
- Next.js
- OpenAI Real-time API
- Twilio
- Pinecone
- Prisma
- PostgreSQL
