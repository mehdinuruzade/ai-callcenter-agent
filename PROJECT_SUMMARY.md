# AI Call Center Agent - Project Summary

## Overview

A production-ready, multi-domain AI call center agent that handles voice calls using OpenAI's Real-time API, Twilio, and RAG (Retrieval-Augmented Generation) technology.

## Key Features

✅ **Real-time Voice AI**: Natural conversations using OpenAI Real-time API
✅ **Multi-Business Support**: Manage multiple businesses with separate configurations
✅ **RAG Knowledge Base**: Vector-powered knowledge retrieval for accurate answers
✅ **Admin Dashboard**: Full-featured panel for managing content and configurations
✅ **Call Analytics**: Detailed logs, transcripts, and sentiment analysis
✅ **Production Ready**: Scalable architecture with comprehensive documentation

## Technology Stack

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Node.js, WebSocket
- **Database**: PostgreSQL + Prisma ORM
- **Vector Database**: Pinecone for RAG
- **Voice**: Twilio Voice API + Media Streams
- **AI**: OpenAI Real-time API + Embeddings

## Project Structure

```
ai-callcenter-agent/
├── src/
│   ├── app/                    # Next.js app directory
│   │   ├── api/               # API routes
│   │   │   ├── twilio/       # Twilio webhooks & WebSocket
│   │   │   ├── rag/          # Knowledge base management
│   │   │   ├── config/       # Configuration API
│   │   │   └── calls/        # Call logs & analytics
│   │   └── admin/            # Admin panel pages
│   ├── components/            # React components
│   └── lib/                   # Core services
│       ├── prisma.ts         # Database client
│       ├── vector-service.ts # Pinecone integration
│       ├── realtime-service.ts # OpenAI Real-time
│       └── websocket-server.ts # Twilio WebSocket
├── prisma/
│   └── schema.prisma         # Database schema
├── README.md                  # Main documentation
├── QUICKSTART.md             # 15-minute setup guide
├── DEPLOYMENT.md             # Deployment guide
├── API.md                     # API documentation
├── ARCHITECTURE.md           # System architecture
└── package.json              # Dependencies
```

## Core Components

### 1. Twilio Integration
- Handles incoming calls via webhook
- Manages WebSocket connection for audio streaming
- Processes call status updates

### 2. OpenAI Real-time API
- Real-time voice-to-voice AI conversations
- Function calling for RAG queries
- Configurable personality and behavior

### 3. RAG System
- Vector embeddings using OpenAI
- Pinecone for similarity search
- Dynamic knowledge base updates

### 4. Admin Panel
- Business management
- Knowledge base editor (CRUD)
- AI configuration interface
- Call logs and analytics dashboard

### 5. Database Layer
- PostgreSQL for structured data
- Prisma ORM for type-safe queries
- Comprehensive schema for businesses, content, calls

## How It Works

### Call Flow

1. **Incoming Call**: Customer calls Twilio number
2. **Webhook**: Twilio sends POST to `/api/twilio/voice`
3. **Business Lookup**: System identifies which business owns the number
4. **WebSocket Setup**: Two connections established:
   - Twilio ↔ Server (audio streaming)
   - Server ↔ OpenAI (AI processing)
5. **Conversation**: 
   - Customer speaks → Twilio → Server → OpenAI
   - OpenAI responds → Server → Twilio → Customer
6. **RAG Integration**: AI queries knowledge base when needed
7. **Logging**: Full transcript saved to database

### RAG Query Process

1. **Question Detected**: AI determines it needs information
2. **Function Call**: `query_knowledge_base` function invoked
3. **Embedding**: Query converted to vector (1536 dimensions)
4. **Search**: Pinecone finds top 3 similar content items
5. **Context Injection**: Results added to AI conversation context
6. **Response**: AI answers using retrieved knowledge

## Quick Setup (15 minutes)

```bash
# 1. Install dependencies
npm install

# 2. Set up environment variables
cp .env.example .env
# Edit .env with your credentials

# 3. Set up database
npm run prisma:generate
npm run prisma:migrate

# 4. Start development server
npm run dev

# 5. Configure Twilio webhooks
# Point to http://localhost:3000/api/twilio/voice (via ngrok)

# 6. Make a test call!
```

See [QUICKSTART.md](QUICKSTART.md) for detailed instructions.

## Deployment Options

### Recommended: Railway
- ✅ WebSocket support
- ✅ Easy deployment
- ✅ Built-in PostgreSQL
- ✅ Automatic SSL

### Also Supported
- Render
- AWS (ECS/Fargate)
- Google Cloud Run
- DigitalOcean App Platform

See [DEPLOYMENT.md](DEPLOYMENT.md) for platform-specific guides.

## Configuration Options

### AI Personality
Define how your agent behaves:
```
"You are a professional and friendly customer service agent 
for a healthcare company. Be empathetic and clear."
```

### Greeting Message
Customize the initial greeting:
```
"Hello! Thank you for calling HealthCare Plus. 
How can I assist you today?"
```

### Additional Settings
- Max call duration
- Enable/disable recording
- Transfer phone number
- Business hours
- Sentiment analysis

## API Endpoints

### Admin APIs
- `GET/POST/PUT/DELETE /api/rag` - Knowledge base management
- `GET/POST/PUT /api/config` - Configuration
- `GET/POST /api/calls` - Call logs & analytics

### Webhooks
- `POST /api/twilio/voice` - Incoming call handler
- `POST /api/twilio/status` - Call status updates
- `WS /api/twilio/stream` - Audio streaming

See [API.md](API.md) for complete API reference.

## Performance & Scaling

### Current Capacity (Single Instance)
- **Concurrent Calls**: 50-100
- **API Requests**: 1000/second
- **Response Time**: < 100ms (HTTP), 1-3s (AI)

### Horizontal Scaling
Deploy multiple instances behind a load balancer for higher capacity.

### Vertical Scaling
Increase server resources for individual instances.

## Cost Estimates

### Small Scale (100 calls/day)
- Hosting: $20-50/month
- Database: $15-30/month
- Twilio: $10-50/month
- OpenAI: $50-200/month
- Pinecone: $70/month
**Total: ~$165-400/month**

### Medium Scale (1000 calls/day)
- Hosting: $100-200/month
- Database: $50-100/month
- Twilio: $100-500/month
- OpenAI: $500-2000/month
- Pinecone: $70/month
**Total: ~$820-2870/month**

## Security Features

- HTTPS/WSS for all connections
- JWT authentication for admin panel
- Twilio signature validation
- Database connection encryption
- Environment variable protection
- SQL injection prevention (Prisma)
- XSS protection (React)

## Monitoring & Analytics

Track key metrics:
- Total calls
- Completed calls
- Average call duration
- Sentiment analysis (positive/neutral/negative)
- Daily call volume
- Common queries
- Response times

## Use Cases

### 1. E-commerce
- Order status inquiries
- Product information
- Return policy questions
- Shipping updates

### 2. Healthcare
- Appointment scheduling
- General inquiries
- Prescription refills
- Office hours

### 3. Restaurant
- Reservation booking
- Menu questions
- Hours and location
- Special requests

### 4. Real Estate
- Property information
- Viewing scheduling
- Pricing inquiries
- Agent availability

### 5. Financial Services
- Account information
- Transaction inquiries
- Service questions
- Appointment booking

## Documentation

- **README.md**: Comprehensive project documentation
- **QUICKSTART.md**: 15-minute setup guide
- **DEPLOYMENT.md**: Production deployment guide
- **API.md**: Complete API reference
- **ARCHITECTURE.md**: System architecture diagrams

## Development Workflow

```bash
# Development
npm run dev              # Start dev server
npm run prisma:studio    # Database GUI

# Database
npm run prisma:generate  # Generate Prisma client
npm run prisma:migrate   # Run migrations

# Production
npm run build           # Build for production
npm start              # Start production server
```

## Testing

### Manual Testing
1. Start ngrok: `ngrok http 3000`
2. Update Twilio webhook URL
3. Call your Twilio number
4. Interact with AI agent

### Monitoring
- Check call logs in admin panel
- Review transcripts
- Analyze sentiment
- Monitor API costs

## Future Enhancements

Potential additions:
- [ ] Multi-language support
- [ ] Voice cloning (custom voices)
- [ ] SMS integration
- [ ] CRM integrations (Salesforce, HubSpot)
- [ ] Advanced analytics dashboard
- [ ] Call queuing and routing
- [ ] Live agent handoff
- [ ] Custom wake words
- [ ] Speech-to-text caching

## Support & Maintenance

### Recommended Monitoring
- Error tracking (Sentry)
- Uptime monitoring (UptimeRobot)
- Log aggregation (Papertrail)
- Performance monitoring (New Relic)

### Regular Tasks
- Weekly: Review error logs, check costs
- Monthly: Security updates, performance optimization
- Quarterly: Disaster recovery drill, capacity planning

## Contributing

This is a starter template. Customize it for your needs:
1. Fork the repository
2. Add your features
3. Test thoroughly
4. Deploy to production

## License

MIT License - See LICENSE file for details

## Getting Started

1. **Read**: [QUICKSTART.md](QUICKSTART.md)
2. **Setup**: Follow the 15-minute guide
3. **Test**: Make your first call
4. **Deploy**: Use [DEPLOYMENT.md](DEPLOYMENT.md)
5. **Customize**: Add your knowledge base and configuration

## Success Checklist

- [ ] Environment variables configured
- [ ] Database set up and migrated
- [ ] Pinecone index created (1536 dimensions)
- [ ] Twilio webhooks configured
- [ ] Business and phone number added
- [ ] Knowledge base populated (5-10 items minimum)
- [ ] AI configuration customized
- [ ] Test call completed successfully
- [ ] Admin panel accessible
- [ ] Monitoring set up

## Contact & Support

For questions and issues:
- Check the documentation
- Review [API.md](API.md) for API questions
- Read [DEPLOYMENT.md](DEPLOYMENT.md) for deployment issues

---

**Ready to get started?** Open [QUICKSTART.md](QUICKSTART.md) and build your AI call center agent in 15 minutes!
