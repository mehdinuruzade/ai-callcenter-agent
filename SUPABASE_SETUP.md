# Supabase Setup Guide

This project uses **Supabase** for both:
1. **PostgreSQL database** - Structured data storage
2. **pgvector extension** - Vector embeddings for RAG

---

## 🚀 Quick Setup (5 minutes)

### Step 1: Create Supabase Project

1. Go to https://supabase.com
2. Click **"Start your project"** (free tier available!)
3. Create new project:
   - **Name**: `ai-callcenter` (or your choice)
   - **Database Password**: Save this securely!
   - **Region**: Choose closest to you
   - Click **"Create new project"**

Wait ~2 minutes for project to initialize.

### Step 2: Enable pgvector Extension

1. In your Supabase project, go to **Database** → **Extensions**
2. Search for `vector`
3. Enable the **`vector`** extension
4. Click **Enable**

### Step 3: Get Database Connection String

1. Go to **Project Settings** → **Database**
2. Scroll to **Connection string**
3. Select **URI** tab
4. Copy the connection string (looks like):
   ```
   postgresql://postgres.[project-ref]:[YOUR-PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres
   ```
5. Replace `[YOUR-PASSWORD]` with your actual database password

### Step 4: Update .env File

```bash
# Copy example
cp .env.example .env

# Edit .env
DATABASE_URL="postgresql://postgres.xxxxx:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres"

# Add your other credentials:
OPENAI_API_KEY="sk-..."
TWILIO_ACCOUNT_SID="AC..."
TWILIO_AUTH_TOKEN="..."
TWILIO_PHONE_NUMBER="+1234567890"
```

### Step 5: Run Migrations

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Run migrations (creates tables + pgvector)
npx prisma migrate dev --name init
```

You should see:
```
✔ Generated Prisma Client
✔ The following migration(s) have been created and applied:
  └─ 20XX...._init
```

### Step 6: Verify Setup

```bash
# Open Prisma Studio
npx prisma studio
```

Check that tables exist:
- User
- Business
- RAGContent (with embedding column)
- Configuration
- CallLog
- PhoneNumber

---

## 🎯 How pgvector Works

### What is pgvector?

pgvector is a PostgreSQL extension that adds vector similarity search capabilities:

```sql
-- Store vectors
embedding vector(1536)  -- 1536 dimensions for OpenAI embeddings

-- Search by similarity
SELECT * FROM "RAGContent"
WHERE "businessId" = '...'
ORDER BY embedding <=> '[0.1, 0.2, ...]'::vector
LIMIT 5;
```

### Similarity Operators

```sql
<=>  -- Cosine distance (used in this project)
<->  -- L2 distance (Euclidean)
<#>  -- Inner product
```

**Lower distance = More similar**

---

## 🔍 Testing pgvector

Once migrations are complete, test vector search:

```sql
-- In Supabase SQL Editor

-- 1. Insert test data with embedding
INSERT INTO "RAGContent" (
  id, title, content, category, embedding, "businessId", "isActive", "createdAt", "updatedAt"
) VALUES (
  'test-1',
  'Test FAQ',
  'Our product costs $99 per month',
  'FAQ',
  '[0.1, 0.2, 0.3, ...]'::vector(1536),  -- Replace with actual embedding
  'test-business',
  true,
  NOW(),
  NOW()
);

-- 2. Query by similarity
SELECT id, title, content,
       embedding <=> '[0.1, 0.2, 0.3, ...]'::vector(1536) as distance
FROM "RAGContent"
WHERE "businessId" = 'test-business'
ORDER BY embedding <=> '[0.1, 0.2, 0.3, ...]'::vector(1536)
LIMIT 5;
```

---

## 💡 Supabase Tips

### 1. Connection Pooling

For production, use connection pooling:

```
# Use pooler connection string (port 6543)
postgresql://postgres.xxx:[PASSWORD]@aws-0-region.pooler.supabase.com:6543/postgres

# NOT direct connection (port 5432)
# Direct connection has limited concurrent connections
```

### 2. Monitor Usage

- Go to **Database** → **Usage**
- Free tier limits:
  - 500 MB database
  - 2 GB bandwidth
  - 50 MB file storage
  - 1 GB vector storage

### 3. Index for Performance

Add index for faster vector searches:

```sql
-- In Supabase SQL Editor
CREATE INDEX ON "RAGContent" USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
```

This creates an IVFFlat index for approximate nearest neighbor search.

### 4. Backup Your Data

- Go to **Database** → **Backups**
- Free tier: Daily backups (7-day retention)
- Paid tiers: Point-in-time recovery

---

## 🐛 Troubleshooting

### "Extension 'vector' not found"

**Solution**: Enable pgvector extension in Supabase dashboard:
1. Database → Extensions
2. Enable "vector"

### "Migration failed: relation already exists"

**Solution**: Reset database:
```bash
npx prisma migrate reset
npx prisma migrate dev --name init
```

### "Connection timeout"

**Solution**: Check connection string format:
- Use **pooler** connection (port 6543)
- Include `?pgbouncer=true` if needed
- Verify password is correct

### "Unsupported field type vector(1536)"

**Solution**: Ensure Prisma schema has:
```prisma
generator client {
  previewFeatures = ["postgresqlExtensions"]
}

datasource db {
  extensions = [vector]
}
```

---

## 📊 Supabase vs Other Options

### Supabase (Current Setup)
✅ One service for everything
✅ PostgreSQL + pgvector included
✅ Free tier generous
✅ Great dashboard
✅ Auto backups
❌ Slightly slower than dedicated vector DB

### Pinecone (Alternative)
✅ Faster vector search
✅ Dedicated vector optimization
❌ Requires two databases
❌ More expensive
❌ More complex setup

**Bottom line:** Supabase is simpler and more cost-effective for most use cases!

---

## 🎓 Next Steps

Once Supabase is set up:

1. **Implement vector-service.ts**
   - Follow TODOs in `src/lib/vector-service.ts`
   - Use `prisma.$executeRaw` for vector operations

2. **Test RAG functionality**
   - Create test content via API
   - Query similar content
   - Verify results

3. **Monitor performance**
   - Check query times in Supabase dashboard
   - Add indexes if needed

---

## 📚 Resources

- [Supabase Docs](https://supabase.com/docs)
- [pgvector Documentation](https://github.com/pgvector/pgvector)
- [OpenAI Embeddings Guide](https://platform.openai.com/docs/guides/embeddings)
- [Prisma with PostgreSQL](https://www.prisma.io/docs/concepts/database-connectors/postgresql)

---

**All set!** Your Supabase database with pgvector is ready. Now follow the implementation guide to build your AI call center agent. 🚀
