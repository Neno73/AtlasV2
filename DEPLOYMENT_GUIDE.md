# Atlas Deployment Guide

## Prerequisites

### System Requirements
- Node.js 18+ 
- npm 9+
- Google AI API key
- Git (for version control)

### Development Environment
```bash
# Clone repository
git clone https://github.com/Neno73/AtlasV2.git
cd AtlasV2

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your Google AI API key
```

## Environment Configuration

### Required Environment Variables
```bash
# .env file
GOOGLE_AI_API_KEY=your_api_key_here
NODE_ENV=development
LOG_LEVEL=debug
ENABLE_TRACING=true
```

### Google AI API Key Setup
1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create new API key
3. Add to environment variables
4. Test connection:
```bash
npm run test:connection
```

## Development Setup

### Local Development
```bash
# Start development server
npm run genkit:dev

# In separate terminal, open Genkit UI
# Follow the link shown in console to access developer playground
```

### Testing
```bash
# Run type checking
npm run lint

# Run tests (when implemented)
npm run test

# Test specific flows
npm run test:flows
```

## Production Deployment

### Build Process
```bash
# Build TypeScript
npm run build

# Verify build
npm run verify
```

### Docker Deployment
```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY dist/ ./dist/
COPY .env.production ./.env

EXPOSE 3000

CMD ["npm", "start"]
```

### Cloud Deployment Options

#### Google Cloud Run
```bash
# Build and deploy
gcloud builds submit --tag gcr.io/PROJECT_ID/atlas-ai
gcloud run deploy atlas-ai --image gcr.io/PROJECT_ID/atlas-ai --platform managed
```

#### Vercel
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

#### AWS Lambda
```bash
# Use Serverless Framework
npm install -g serverless
serverless deploy
```

## Configuration

### Production Environment Variables
```bash
GOOGLE_AI_API_KEY=prod_api_key
NODE_ENV=production
LOG_LEVEL=info
ENABLE_TRACING=false
REDIS_URL=redis://cache-server:6379
DATABASE_URL=postgresql://user:pass@db:5432/atlas
```

### Scaling Configuration
```yaml
# docker-compose.yml for scaling
version: '3.8'
services:
  atlas-ai:
    image: atlas-ai:latest
    replicas: 3
    environment:
      - GOOGLE_AI_API_KEY=${GOOGLE_AI_API_KEY}
    ports:
      - "3000-3002:3000"
    
  redis:
    image: redis:alpine
    
  postgres:
    image: postgres:14
    environment:
      POSTGRES_DB: atlas
      POSTGRES_USER: atlas_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
```

## Monitoring and Observability

### Health Checks
```typescript
// Add to main application
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version
  });
});
```

### Logging Configuration
```typescript
// Enhanced logging for production
const logger = {
  level: process.env.LOG_LEVEL || 'info',
  enableTracing: process.env.ENABLE_TRACING === 'true',
  destinations: [
    { stream: process.stdout },
    { file: './logs/atlas.log' }
  ]
};
```

### Metrics Collection
```typescript
// Add prometheus metrics
import prometheus from 'prom-client';

const conversationCounter = new prometheus.Counter({
  name: 'atlas_conversations_total',
  help: 'Total number of conversations',
  labelNames: ['intent_type', 'industry']
});

const clarificationRate = new prometheus.Histogram({
  name: 'atlas_clarification_rate',
  help: 'Rate of clarification needed',
  buckets: [0.1, 0.3, 0.5, 0.7, 0.9]
});
```

## Security

### API Security
```typescript
// Rate limiting
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
});

app.use('/api/', limiter);
```

### Environment Security
```bash
# Use secrets management
export GOOGLE_AI_API_KEY=$(gcloud secrets versions access latest --secret="atlas-api-key")
```

### Input Validation
```typescript
// Validate all inputs
import joi from 'joi';

const conversationSchema = joi.object({
  message: joi.string().max(1000).required(),
  conversationContext: joi.object().optional()
});
```

## Performance Optimization

### Caching Strategy
```typescript
// Redis caching for context
import redis from 'redis';

const cache = redis.createClient();

async function getCachedContext(conversationId: string) {
  const cached = await cache.get(`context:${conversationId}`);
  return cached ? JSON.parse(cached) : null;
}

async function setCachedContext(conversationId: string, context: any) {
  await cache.setex(`context:${conversationId}`, 3600, JSON.stringify(context));
}
```

### Database Optimization
```sql
-- Add indexes for conversation queries
CREATE INDEX idx_conversation_id ON conversations(conversation_id);
CREATE INDEX idx_user_preferences ON user_preferences(user_id);
CREATE INDEX idx_conversation_metrics ON conversation_metrics(created_at);
```

### Load Balancing
```nginx
# nginx.conf
upstream atlas_backend {
    server atlas-ai-1:3000;
    server atlas-ai-2:3000;
    server atlas-ai-3:3000;
}

server {
    listen 80;
    location / {
        proxy_pass http://atlas_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Backup and Recovery

### Data Backup
```bash
#!/bin/bash
# backup.sh
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Backup conversation data
pg_dump $DATABASE_URL > backups/conversations_$TIMESTAMP.sql

# Backup user preferences
redis-cli --rdb backups/redis_$TIMESTAMP.rdb

# Upload to cloud storage
aws s3 cp backups/ s3://atlas-backups/$TIMESTAMP/ --recursive
```

### Disaster Recovery
```yaml
# disaster-recovery.yml
recovery_procedures:
  rto: 4 hours  # Recovery Time Objective
  rpo: 1 hour   # Recovery Point Objective
  
  steps:
    1. Restore from latest backup
    2. Update DNS to backup region
    3. Verify health checks
    4. Monitor conversation quality
```

## Troubleshooting

### Common Issues

#### High Memory Usage
```bash
# Monitor memory
npm install -g clinic
clinic doctor -- node dist/index.js
```

#### API Rate Limits
```typescript
// Implement exponential backoff
async function retryWithBackoff(fn: Function, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
    }
  }
}
```

#### Conversation Quality Issues
```typescript
// Add quality monitoring
function monitorConversationQuality(result: any) {
  if (result.confidence.overall < 0.5) {
    logger.warn('Low confidence conversation', {
      conversationId: result.conversationContext.conversationId,
      confidence: result.confidence.overall,
      ambiguities: result.ambiguityAnalysis.detectedAmbiguities.length
    });
  }
}
```

### Debug Mode
```bash
# Enable debug logging
export LOG_LEVEL=debug
export ENABLE_TRACING=true

# Start with debugging
npm run dev:debug
```

## Maintenance

### Regular Tasks
```bash
# Weekly maintenance script
#!/bin/bash

# Update dependencies
npm audit fix

# Clean old logs
find ./logs -name "*.log" -mtime +7 -delete

# Update conversation metrics
npm run update:metrics

# Backup data
./scripts/backup.sh
```

### Updates and Patches
```bash
# Update Atlas
git pull origin main
npm install
npm run build
npm run test
pm2 restart atlas
```

This deployment guide ensures a robust, scalable, and maintainable Atlas AI system in production environments.