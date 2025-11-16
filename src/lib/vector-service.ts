import { Pinecone } from '@pinecone-database/pinecone';
import OpenAI from 'openai';

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const indexName = process.env.PINECONE_INDEX_NAME || 'callcenter-rag';

export class VectorService {
  private index;

  constructor() {
    this.index = pinecone.index(indexName);
  }

  /**
   * Generate embeddings using OpenAI
   */
  async generateEmbedding(text: string): Promise<number[]> {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });
    return response.data[0].embedding;
  }

  /**
   * Upsert RAG content to Pinecone
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
    const embedding = await this.generateEmbedding(content);

    await this.index.upsert([
      {
        id,
        values: embedding,
        metadata: {
          ...metadata,
          content, // Store original content
        },
      },
    ]);

    return { id, embedding };
  }

  /**
   * Query similar content from Pinecone
   */
  async queryContent(
    query: string,
    businessId: string,
    topK: number = 5
  ): Promise<any[]> {
    const queryEmbedding = await this.generateEmbedding(query);

    const queryResponse = await this.index.query({
      vector: queryEmbedding,
      topK,
      filter: { businessId: { $eq: businessId } },
      includeMetadata: true,
    });

    return queryResponse.matches || [];
  }

  /**
   * Delete content from Pinecone
   */
  async deleteContent(id: string) {
    await this.index.deleteOne(id);
  }

  /**
   * Update content in Pinecone
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
    // Delete old and upsert new
    await this.deleteContent(id);
    return await this.upsertContent(id, content, metadata);
  }
}

export const vectorService = new VectorService();
