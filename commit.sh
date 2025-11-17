#!/bin/bash

echo "🔍 Checking git status..."
git status

echo ""
echo "📦 Adding all changes..."
git add .

echo ""
echo "📝 Committing..."
git commit -m "✨ Complete admin dashboard with authentication and RAG

Features:
- NextAuth authentication
- Dashboard with analytics
- Business management
- RAG knowledge base with pgvector
- AI configuration
- Call logs viewer
- Business-specific content isolation

Tech: Next.js, TypeScript, Prisma, Supabase, OpenAI"

echo ""
echo "✅ Committed! Ready to push with: git push origin main"
