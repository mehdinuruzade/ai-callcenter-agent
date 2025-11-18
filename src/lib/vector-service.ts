import OpenAI from 'openai';
import { prisma } from './prisma';

// TODO: Initialize OpenAI client with your API key
// Hint: Use process.env.OPENAI_API_KEY
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export class VectorService {
  /**
   * Generate embeddings using OpenAI
   *
   * @param text - The text to embed
   * @returns Promise<number[]> - The embedding vector (1536 dimensions)
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
      });

      return response.data[0].embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw error;
    }
  }

  /**
   * Store RAG content with vector embedding in Supabase
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
    try {
      // Generate embedding for the content
      const embedding = await this.generateEmbedding(content);

      // Convert embedding array to pgvector format
      const embeddingStr = `[${embedding.join(',')}]`;

      // Use raw SQL for upsert with pgvector
      await prisma.$executeRaw`
        INSERT INTO "RAGContent" (
          id,
          title,
          content,
          category,
          metadata,
          embedding,
          "businessId",
          "isActive",
          "createdAt",
          "updatedAt"
        )
        VALUES (
          ${id},
          ${metadata.title},
          ${content},
          ${metadata.category},
          ${JSON.stringify(metadata)}::jsonb,
          ${embeddingStr}::vector,
          ${metadata.businessId},
          true,
          NOW(),
          NOW()
        )
        ON CONFLICT (id)
        DO UPDATE SET
          title = EXCLUDED.title,
          content = EXCLUDED.content,
          category = EXCLUDED.category,
          metadata = EXCLUDED.metadata,
          embedding = EXCLUDED.embedding,
          "updatedAt" = NOW()
      `;

      // Fetch and return the created/updated record
      const record = await prisma.rAGContent.findUnique({
        where: { id },
      });

      return record;
    } catch (error) {
      console.error('Error upserting content:', error);
      throw error;
    }
  }

  /**
   * Query similar content using pgvector cosine similarity
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
    try {
      // Generate embedding for the query
      const queryEmbedding = await this.generateEmbedding(query);

      // Convert embedding to pgvector format
      const queryVectorStr = `[${queryEmbedding.join(',')}]`;

      // Query similar vectors using cosine distance
      // <=> operator calculates cosine distance (lower = more similar)
      const results = await prisma.$queryRaw<
        Array<{
          id: string;
          title: string;
          content: string;
          category: string;
          metadata: any;
          distance: number;
        }>
      >`
        SELECT
          id,
          title,
          content,
          category,
          metadata,
          embedding <=> ${queryVectorStr}::vector as distance
        FROM "RAGContent"
        WHERE "businessId" = ${businessId} AND "isActive" = true
        ORDER BY embedding <=> ${queryVectorStr}::vector
        LIMIT ${topK}
      `;

      return results;
    } catch (error) {
      console.error('Error querying content:', error);
      throw error;
    }
  }

  /**
   * Delete content from Supabase
   *
   * @param id - The id of the content to delete
   */
  async deleteContent(id: string) {
    try {
      await prisma.rAGContent.delete({
        where: { id },
      });

      console.log(`✅ Deleted content: ${id}`);
    } catch (error) {
      console.error('Error deleting content:', error);
      throw error;
    }
  }

  /**
   * Update content in Supabase
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
    try {
      // Generate new embedding for updated content
      const embedding = await this.generateEmbedding(content);

      // Convert embedding to pgvector format
      const embeddingStr = `[${embedding.join(',')}]`;

      // Update the record with new embedding
      await prisma.$executeRaw`
        UPDATE "RAGContent"
        SET
          content = ${content},
          title = ${metadata.title},
          category = ${metadata.category},
          metadata = ${JSON.stringify(metadata)}::jsonb,
          embedding = ${embeddingStr}::vector,
          "updatedAt" = NOW()
        WHERE id = ${id}
      `;

      // Fetch and return the updated record
      const record = await prisma.rAGContent.findUnique({
        where: { id },
      });

      return record;
    } catch (error) {
      console.error('Error updating content:', error);
      throw error;
    }
  }
}

export const vectorService = new VectorService();
