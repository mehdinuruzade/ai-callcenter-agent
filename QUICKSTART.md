# Quick Start Guide

Get your AI Call Center Agent up and running in 15 minutes.

## Prerequisites Checklist

- [ ] Node.js 18+ installed
- [ ] PostgreSQL database ready
- [ ] Twilio account created
- [ ] OpenAI API key (with Real-time API access)
- [ ] Pinecone account created

## Step-by-Step Setup

### 1. Install Dependencies (2 minutes)

```bash
npm install
```

### 2. Set Up Environment Variables (3 minutes)

Create `.env` file:

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/callcenter"
TWILIO_ACCOUNT_SID=ACxxxxx
TWILIO_AUTH_TOKEN=xxxxx
TWILIO_PHONE_NUMBER=+1234567890
OPENAI_API_KEY=sk-xxxxx
PINECONE_API_KEY=xxxxx
PINECONE_ENVIRONMENT=us-east-1-aws
PINECONE_INDEX_NAME=callcenter-rag
JWT_SECRET=your-secret-key
```

### 3. Set Up Pinecone (2 minutes)

1. Go to https://www.pinecone.io/
2. Create a new index:
   - **Name**: `callcenter-rag`
   - **Dimensions**: `1536`
   - **Metric**: `cosine`
3. Copy API key to `.env`

### 4. Initialize Database (2 minutes)

```bash
# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# (Optional) Seed demo data
npm run prisma:db:seed
```

### 5. Start Development Server (1 minute)

```bash
npm run dev
```

Open http://localhost:3000

### 6. Configure Twilio (5 minutes)

#### Option A: Using ngrok (for local testing)

```bash
# In a new terminal
ngrok http 3000

# Copy the ngrok URL (e.g., https://abc123.ngrok.io)
```

#### Option B: Skip to deployment

Go to Twilio Console:
1. Navigate to Phone Numbers → Active Numbers
2. Select your phone number
3. Under "Voice & Fax", set:
   - **A CALL COMES IN**: Webhook
   - **URL**: `https://abc123.ngrok.io/api/twilio/voice` (or your deployed URL)
   - **HTTP**: POST
4. Click "Save"

## First Test Call

### 1. Create a Business (via Prisma Studio)

```bash
npm run prisma:studio
```

In the browser:
1. Click "Business" → "Add Record"
2. Fill in:
   - `name`: "My Test Business"
   - `domain`: "retail"
   - `isActive`: true
3. Click "Save"
4. Copy the business `id`

### 2. Add a Phone Number

In Prisma Studio:
1. Click "PhoneNumber" → "Add Record"
2. Fill in:
   - `number`: Your Twilio number (e.g., +1234567890)
   - `businessId`: Paste the business ID from step 1
   - `isActive`: true
3. Click "Save"

### 3. Add Some Knowledge Base Content

Navigate to http://localhost:3000/admin/rag

1. Click "Add Content"
2. Fill in:
   - **Title**: "Store Hours"
   - **Category**: "FAQ"
   - **Content**: "We are open Monday-Friday 9am-5pm EST"
3. Click "Save"

Add another:
1. Click "Add Content"
2. Fill in:
   - **Title**: "Return Policy"
   - **Category**: "Policy"
   - **Content**: "We accept returns within 30 days with receipt"
3. Click "Save"

### 4. Configure AI Agent

Navigate to http://localhost:3000/admin/config

Set:
- **AI Personality**: "You are a friendly and helpful retail customer service agent"
- **Greeting Message**: "Hello! Thank you for calling. How can I help you today?"
- **Enable Recording**: Checked

Click "Save Configuration"

### 5. Make Your First Call! 📞

Call your Twilio phone number and have a conversation with your AI agent!

Try asking:
- "What are your store hours?"
- "What's your return policy?"
- "Can you help me with an order?"

## What Just Happened?

1. **Call Received**: Twilio receives your call
2. **Webhook**: Twilio sends webhook to your server
3. **WebSocket**: Server creates two WebSocket connections:
   - One to Twilio (for audio streaming)
   - One to OpenAI Real-time API (for AI responses)
4. **Audio Flow**: Your voice → Twilio → Server → OpenAI → Server → Twilio → You
5. **RAG**: When AI needs info, it queries your Pinecone vector database
6. **Logging**: Transcript saved to PostgreSQL

## Next Steps

### Enhance Your Knowledge Base

Add more content in different categories:
- FAQ
- Product Info
- Policy
- Troubleshooting
- General

### Customize AI Personality

Experiment with different personalities:
- Professional and formal
- Casual and friendly
- Technical and detailed
- Empathetic and caring

### Monitor Performance

Check the admin dashboard:
- Total calls
- Average duration
- Sentiment analysis
- Common queries

### Deploy to Production

See [DEPLOYMENT.md](DEPLOYMENT.md) for deployment options:
- Railway (easiest)
- Render
- AWS
- Google Cloud

## Common Issues & Solutions

### Issue: "Database connection failed"

```bash
# Check if PostgreSQL is running
pg_isready

# Test connection
psql $DATABASE_URL
```

### Issue: "OpenAI WebSocket connection failed"

- Verify API key has Real-time API access
- Check OpenAI account billing status
- Ensure you're using the correct model

### Issue: "Twilio webhook timeout"

- Check if ngrok is running
- Verify webhook URL in Twilio console
- Check server logs for errors

### Issue: "Pinecone query failed"

- Verify index exists with correct dimensions (1536)
- Check API key and environment
- Ensure content has been added and vectorized

## Demo Data

Want to skip setup? Run this to add demo data:

```bash
npm run demo:seed
```

This adds:
- Sample business
- Phone number
- 10 FAQ items
- Default configuration

## Tips for Success

1. **Start Simple**: Begin with 5-10 FAQ items
2. **Test Thoroughly**: Make multiple test calls
3. **Monitor Costs**: Watch OpenAI and Twilio usage
4. **Iterate**: Refine personality based on call transcripts
5. **Scale Gradually**: Add features as needed

## Learning Resources

- [Twilio Media Streams Docs](https://www.twilio.com/docs/voice/media-streams)
- [OpenAI Real-time API](https://platform.openai.com/docs/guides/realtime)
- [Pinecone Documentation](https://docs.pinecone.io/)
- [Next.js Documentation](https://nextjs.org/docs)

## Getting Help

- Check the [README.md](README.md) for detailed documentation
- Review [API.md](API.md) for API reference
- Read [DEPLOYMENT.md](DEPLOYMENT.md) for production setup

## Congratulations! 🎉

You now have a working AI Call Center Agent. Keep iterating and improving based on real call data!

## What's Next?

- [ ] Add more knowledge base content
- [ ] Customize the greeting and personality
- [ ] Set up call analytics dashboard
- [ ] Configure transfer to human agent
- [ ] Deploy to production
- [ ] Set up monitoring and alerts
- [ ] Add more businesses/domains
