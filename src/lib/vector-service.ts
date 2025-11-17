import { Pinecone } from '@pinecone-database/pinecone';
import OpenAI from 'openai';

// TODO: Initialize Pinecone client with your API key
// Hint: Use process.env.PINECONE_API_KEY
const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});

// TODO: Initialize OpenAI client with your API key
// Hint: Use process.env.OPENAI_API_KEY
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
   * TODO: Upsert RAG content to Pinecone
   *
   * Steps:
   * 1. Generate embedding for the content using generateEmbedding()
   * 2. Use this.index.upsert() to store the vector
   * 3. Include metadata with the vector (businessId, title, category, content)
   * 4. Return the id and embedding
   *
   * @param id - Unique identifier for the content
   * @param content - The content text to store
   * @param metadata - Metadata including businessId, title, category
   * @returns Promise with id and embedding
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
    // TODO: Implement content upsert
    throw new Error('Not implemented: upsertContent');
  }

  /**
   * TODO: Query similar content from Pinecone
   *
   * Steps:
   * 1. Generate embedding for the query using generateEmbedding()
   * 2. Use this.index.query() to find similar vectors
   * 3. Filter by businessId to get only relevant business content
   * 4. Return top K results with metadata
   *
   * @param query - The search query
   * @param businessId - Filter results by business
   * @param topK - Number of results to return (default: 5)
   * @returns Promise<any[]> - Array of matching results with metadata
   */
  async queryContent(
    query: string,
    businessId: string,
    topK: number = 5
  ): Promise<any[]> {
    // TODO: Implement vector similarity search
    throw new Error('Not implemented: queryContent');
  }

  /**
   * TODO: Delete content from Pinecone
   *
   * Steps:
   * 1. Use this.index.deleteOne() to remove the vector by id
   *
   * @param id - The id of the content to delete
   */
  async deleteContent(id: string) {
    // TODO: Implement content deletion
    throw new Error('Not implemented: deleteContent');
  }

  /**
   * TODO: Update content in Pinecone
   *
   * Steps:
   * 1. Delete the old content using deleteContent()
   * 2. Upsert the new content using upsertContent()
   * 3. Return the result
   *
   * @param id - The id of the content to update
   * @param content - New content text
   * @param metadata - Updated metadata
   * @returns Promise with id and embedding
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
