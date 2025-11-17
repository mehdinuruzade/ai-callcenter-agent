import OpenAI from 'openai';
import { prisma } from './prisma';

// TODO: Initialize OpenAI client with your API key
// Hint: Use process.env.OPENAI_API_KEY
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export class VectorService {
  /**
   * TODO: Generate embeddings using OpenAI
   *
   * Steps:
   * 1. Use openai.embeddings.create() with model 'text-embedding-3-small'
   * 2. Pass the text as input
   * 3. Return the embedding vector from response.data[0].embedding
   *
   * @param text - The text to embed
   * @returns Promise<number[]> - The embedding vector (1536 dimensions)
   */
  async generateEmbedding(text: string): Promise<number[]> {
    // TODO: Implement embedding generation
    throw new Error('Not implemented: generateEmbedding');
  }

  /**
   * TODO: Store RAG content with vector embedding in Supabase
   *
   * Steps:
   * 1. Generate embedding for the content using generateEmbedding()
   * 2. Convert embedding array to pgvector format: `[${embedding.join(',')}]`
   * 3. Use prisma.$executeRaw to insert/update the record:
   *    - INSERT INTO "RAGContent" (id, title, content, category, embedding, businessId, ...)
   *    - Use Prisma.sql`...` for raw SQL with vector
   *    - Cast embedding as vector: ${embeddingStr}::vector
   * 4. Return the created record
   *
   * Example raw SQL:
   * ```
   * await prisma.$executeRaw`
   *   INSERT INTO "RAGContent" (id, title, content, category, embedding, "businessId", "isActive", "createdAt", "updatedAt")
   *   VALUES (${id}, ${title}, ${content}, ${category}, ${embeddingStr}::vector, ${businessId}, true, NOW(), NOW())
   * `
   * ```
   *
   * @param id - Unique identifier for the content
   * @param content - The content text to store
   * @param metadata - Metadata including businessId, title, category
   * @returns Promise with the created record
   */
  async upsertContent(
    id: string,
    content: string,
    metadata: {
      businessId: string;
      title: string;
      category: string;
      [key: string]: any;
    }
  ) {
    // TODO: Implement content upsert with pgvector
    throw new Error('Not implemented: upsertContent');
  }

  /**
   * TODO: Query similar content using pgvector cosine similarity
   *
   * Steps:
   * 1. Generate embedding for the query using generateEmbedding()
   * 2. Convert embedding to pgvector format
   * 3. Use prisma.$queryRaw to find similar vectors:
   *    - SELECT id, title, content, category, (embedding <=> ${queryVector}::vector) as distance
   *    - WHERE "businessId" = ${businessId} AND "isActive" = true
   *    - ORDER BY embedding <=> ${queryVector}::vector
   *    - LIMIT ${topK}
   * 4. The <=> operator calculates cosine distance (lower = more similar)
   * 5. Return results ordered by similarity
   *
   * Example raw SQL:
   * ```
   * const results = await prisma.$queryRaw<Array<{
   *   id: string;
   *   title: string;
   *   content: string;
   *   category: string;
   *   distance: number;
   * }>>`
   *   SELECT id, title, content, category,
   *          embedding <=> ${queryVectorStr}::vector as distance
   *   FROM "RAGContent"
   *   WHERE "businessId" = ${businessId} AND "isActive" = true
   *   ORDER BY embedding <=> ${queryVectorStr}::vector
   *   LIMIT ${topK}
   * `
   * ```
   *
   * @param query - The search query
   * @param businessId - Filter results by business
   * @param topK - Number of results to return (default: 5)
   * @returns Promise<any[]> - Array of matching results with distance scores
   */
  async queryContent(
    query: string,
    businessId: string,
    topK: number = 5
  ): Promise<any[]> {
    // TODO: Implement vector similarity search with pgvector
    throw new Error('Not implemented: queryContent');
  }

  /**
   * TODO: Delete content from Supabase
   *
   * Steps:
   * 1. Use prisma.rAGContent.delete() to remove the record by id
   *    - The vector embedding is automatically deleted with the record
   *
   * @param id - The id of the content to delete
   */
  async deleteContent(id: string) {
    // TODO: Implement content deletion
    throw new Error('Not implemented: deleteContent');
  }

  /**
   * TODO: Update content in Supabase
   *
   * Steps:
   * 1. Generate new embedding for updated content
   * 2. Use prisma.$executeRaw to update the record:
   *    - UPDATE "RAGContent"
   *    - SET content = ?, embedding = ?::vector, title = ?, category = ?, "updatedAt" = NOW()
   *    - WHERE id = ?
   * 3. Return the updated record
   *
   * @param id - The id of the content to update
   * @param content - New content text
   * @param metadata - Updated metadata
   * @returns Promise with updated record
   */
  async updateContent(
    id: string,
    content: string,
    metadata: {
      businessId: string;
      title: string;
      category: string;
      [key: string]: any;
    }
  ) {
    // TODO: Implement content update
    throw new Error('Not implemented: updateContent');
  }
}

export const vectorService = new VectorService();
