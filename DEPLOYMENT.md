# Deployment Guide

This guide covers deploying the AI Call Center Agent to various platforms.

## Prerequisites

- All environment variables configured
- Database accessible from deployment platform
- Twilio account with phone number
- OpenAI API access
- Pinecone index created

## Platform-Specific Guides

### 1. Railway (Recommended for Production)

Railway supports WebSockets and is easy to deploy.

#### Steps:

1. **Create Railway Account**
   - Go to https://railway.app
   - Sign up with GitHub

2. **Create New Project**
   ```bash
   # Install Railway CLI
   npm i -g @railway/cli
   
   # Login
   railway login
   
   # Initialize project
   railway init
   ```

3. **Add PostgreSQL Database**
   - In Railway dashboard, click "New"
   - Select "Database" → "PostgreSQL"
   - Copy the `DATABASE_URL`

4. **Set Environment Variables**
   ```bash
   railway variables set TWILIO_ACCOUNT_SID=xxx
   railway variables set TWILIO_AUTH_TOKEN=xxx
   railway variables set OPENAI_API_KEY=xxx
   railway variables set PINECONE_API_KEY=xxx
   # ... add all other variables
   ```

5. **Deploy**
   ```bash
   railway up
   ```

6. **Generate Domain**
   - In Railway dashboard, click "Settings"
   - Click "Generate Domain"
   - Copy the domain URL

7. **Update Twilio Webhooks**
   - Voice URL: `https://your-domain.railway.app/api/twilio/voice`
   - Status callback: `https://your-domain.railway.app/api/twilio/status`

8. **Run Migrations**
   ```bash
   railway run npm run prisma:migrate
   ```

### 2. Render

Render also supports WebSockets.

#### Steps:

1. **Create Render Account**
   - Go to https://render.com
   - Sign up with GitHub

2. **Create PostgreSQL Database**
   - Dashboard → New → PostgreSQL
   - Copy internal/external connection strings

3. **Create Web Service**
   - Dashboard → New → Web Service
   - Connect your GitHub repository
   - Set build command: `npm install && npm run prisma:generate && npm run build`
   - Set start command: `npm start`

4. **Add Environment Variables**
   - In service settings, add all environment variables
   - Use internal database URL for `DATABASE_URL`

5. **Deploy**
   - Render will auto-deploy on push to main branch

6. **Update Twilio**
   - Update webhook URLs with your Render domain

### 3. AWS (Advanced)

For high-traffic production deployments.

#### Architecture:

```
┌─────────┐     ┌──────────┐     ┌─────────────┐
│   ALB   │────▶│   ECS    │────▶│     RDS     │
│         │     │ (Fargate)│     │ (PostgreSQL)│
└─────────┘     └──────────┘     └─────────────┘
```

#### Steps:

1. **Create RDS PostgreSQL Instance**
   ```bash
   aws rds create-db-instance \
     --db-instance-identifier callcenter-db \
     --db-instance-class db.t3.micro \
     --engine postgres \
     --master-username admin \
     --master-user-password YourPassword123
   ```

2. **Build Docker Image**
   ```bash
   docker build -t ai-callcenter .
   docker tag ai-callcenter:latest YOUR_ECR_REPO:latest
   docker push YOUR_ECR_REPO:latest
   ```

3. **Create ECS Cluster**
   ```bash
   aws ecs create-cluster --cluster-name callcenter-cluster
   ```

4. **Create Task Definition**
   ```json
   {
     "family": "callcenter-task",
     "networkMode": "awsvpc",
     "containerDefinitions": [{
       "name": "callcenter-app",
       "image": "YOUR_ECR_REPO:latest",
       "portMappings": [{
         "containerPort": 3000,
         "protocol": "tcp"
       }],
       "environment": [
         {"name": "DATABASE_URL", "value": "postgresql://..."},
         {"name": "OPENAI_API_KEY", "value": "sk-..."}
       ]
     }],
     "requiresCompatibilities": ["FARGATE"],
     "cpu": "256",
     "memory": "512"
   }
   ```

5. **Create Service with ALB**
   ```bash
   aws ecs create-service \
     --cluster callcenter-cluster \
     --service-name callcenter-service \
     --task-definition callcenter-task \
     --desired-count 2 \
     --launch-type FARGATE \
     --load-balancers targetGroupArn=YOUR_TG_ARN,containerName=callcenter-app,containerPort=3000
   ```

### 4. Google Cloud Platform

#### Steps:

1. **Create Cloud SQL PostgreSQL Instance**
   ```bash
   gcloud sql instances create callcenter-db \
     --database-version=POSTGRES_14 \
     --tier=db-f1-micro \
     --region=us-central1
   ```

2. **Deploy to Cloud Run**
   ```bash
   # Build container
   gcloud builds submit --tag gcr.io/PROJECT_ID/callcenter
   
   # Deploy
   gcloud run deploy callcenter \
     --image gcr.io/PROJECT_ID/callcenter \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated \
     --set-env-vars DATABASE_URL=postgresql://... \
     --set-env-vars OPENAI_API_KEY=sk-...
   ```

### 5. DigitalOcean App Platform

1. **Create App**
   - Connect GitHub repository
   - Choose region

2. **Add Database**
   - Add PostgreSQL database component
   - Auto-injects `DATABASE_URL`

3. **Configure**
   - Build command: `npm install && npm run prisma:generate && npm run build`
   - Run command: `npm start`

4. **Add Environment Variables**
   - Add all required variables in settings

5. **Deploy**
   - Click "Deploy"

## Post-Deployment Checklist

### 1. Database Setup
```bash
# Run migrations
npm run prisma:migrate

# Seed initial data (optional)
npm run prisma:db:seed
```

### 2. Verify Twilio Configuration
- [ ] Voice webhook URL updated
- [ ] Status callback URL updated
- [ ] Media Streams enabled
- [ ] Test call works

### 3. Test Endpoints
```bash
# Health check
curl https://your-domain.com/api/health

# Twilio webhook (should return TwiML)
curl -X POST https://your-domain.com/api/twilio/voice
```

### 4. Monitor Logs
```bash
# Railway
railway logs

# Render
# Check logs in dashboard

# AWS CloudWatch
aws logs tail /ecs/callcenter-service --follow
```

### 5. Set Up Monitoring
- Configure error tracking (Sentry, Rollbar)
- Set up uptime monitoring
- Monitor API usage (OpenAI, Twilio)
- Database performance monitoring

## Scaling Considerations

### Horizontal Scaling
```bash
# Railway: Increase replicas in dashboard
# ECS: Update desired count
aws ecs update-service --cluster callcenter-cluster --service callcenter-service --desired-count 5
```

### Vertical Scaling
- Increase container memory/CPU
- Upgrade database instance
- Consider read replicas for database

### Performance Optimization
1. **Enable Caching**
   - Redis for configuration cache
   - CDN for static assets

2. **Database Optimization**
   - Add indexes on frequently queried fields
   - Enable connection pooling
   - Use database read replicas

3. **API Rate Limiting**
   - Implement rate limiting for APIs
   - Queue management for high call volumes

## Security Hardening

### 1. Environment Variables
- Never commit `.env` files
- Use secret management (AWS Secrets Manager, etc.)
- Rotate credentials regularly

### 2. Network Security
```bash
# Restrict database access to app servers only
# Use VPC/Private networking
# Enable SSL/TLS for all connections
```

### 3. Twilio Security
```typescript
// Validate Twilio signatures
import twilio from 'twilio';

const validateRequest = (req: Request) => {
  const signature = req.headers.get('x-twilio-signature');
  return twilio.validateRequest(
    process.env.TWILIO_AUTH_TOKEN!,
    signature,
    url,
    params
  );
};
```

### 4. Rate Limiting
```typescript
// Add rate limiting middleware
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
```

## Monitoring & Alerting

### Key Metrics to Monitor
1. Call volume and success rate
2. Average call duration
3. API response times
4. Error rates
5. Database connection pool
6. OpenAI token usage
7. Twilio costs

### Recommended Tools
- **APM**: New Relic, Datadog
- **Logging**: Papertrail, Loggly
- **Errors**: Sentry
- **Uptime**: UptimeRobot, Pingdom

### Sample Alert Rules
```yaml
# High error rate
- alert: HighErrorRate
  expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
  for: 10m
  
# Database connection issues
- alert: DatabaseConnectionHigh
  expr: pg_stat_database_numbackends > 80
  
# High API costs
- alert: HighOpenAICosts
  expr: openai_tokens_used_24h > 1000000
```

## Troubleshooting

### Common Issues

1. **WebSocket Connection Fails**
   - Check if platform supports WebSocket
   - Verify SSL/TLS configuration
   - Test with `wscat -c wss://your-domain/api/twilio/stream`

2. **Database Connection Timeout**
   - Check connection string
   - Verify network rules
   - Increase connection pool size

3. **High Memory Usage**
   - Check for memory leaks
   - Monitor open WebSocket connections
   - Implement connection cleanup

4. **Twilio Webhook Timeouts**
   - Optimize database queries
   - Add caching where possible
   - Increase server resources

## Backup & Recovery

### Database Backups
```bash
# Automated daily backups
# Railway/Render: Automatic
# AWS RDS: Configure backup retention
# Manual backup:
pg_dump $DATABASE_URL > backup.sql
```

### Disaster Recovery Plan
1. Database restore from backup
2. Redeploy application
3. Verify Twilio webhooks
4. Test with sample call
5. Monitor for 24 hours

## Cost Optimization

### Estimated Monthly Costs

**Small Scale (100 calls/day)**
- Hosting: $20-50
- Database: $15-30
- Twilio: $10-50
- OpenAI: $50-200
- Pinecone: $70
**Total: ~$165-400/month**

**Medium Scale (1000 calls/day)**
- Hosting: $100-200
- Database: $50-100
- Twilio: $100-500
- OpenAI: $500-2000
- Pinecone: $70
**Total: ~$820-2870/month**

### Cost Reduction Tips
1. Implement caching for frequent queries
2. Set max call duration limits
3. Use cheaper OpenAI models for simple queries
4. Optimize vector database queries
5. Monitor and alert on unusual usage

## Support & Maintenance

### Weekly Tasks
- [ ] Review error logs
- [ ] Check API usage/costs
- [ ] Verify backup completion
- [ ] Review call analytics

### Monthly Tasks
- [ ] Security updates
- [ ] Performance optimization
- [ ] Cost analysis
- [ ] User feedback review

### Quarterly Tasks
- [ ] Major dependency updates
- [ ] Disaster recovery drill
- [ ] Architecture review
- [ ] Capacity planning
