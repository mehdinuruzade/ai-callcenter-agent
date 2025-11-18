"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.vectorService = exports.VectorService = void 0;
const openai_1 = __importDefault(require("openai"));
const prisma_1 = require("./prisma");
const openai = new openai_1.default({
    apiKey: process.env.OPENAI_API_KEY,
});
class VectorService {
    /**
     * Create embedding for text using OpenAI
     */
    async createEmbedding(text) {
        try {
            const response = await openai.embeddings.create({
                model: 'text-embedding-ada-002',
                input: text,
            });
            return response.data[0].embedding;
        }
        catch (error) {
            console.error('Error creating embedding:', error);
            throw error;
        }
    }
    /**
     * Store RAG content with embedding in Supabase
     */
    async storeContent(data) {
        try {
            // Create embedding
            const embedding = await this.createEmbedding(data.content);
            const recordId = data.id ?? null;
            // Store in database with embedding
            const ragContent = await prisma_1.prisma.$executeRaw `
        INSERT INTO "RAGContent" (
          id, title, content, category, "businessId", 
          metadata, embedding, "isActive", "createdAt", "updatedAt"
        ) VALUES (
          COALESCE(${recordId}, gen_random_uuid()::text),
          ${data.title},
          ${data.content},
          ${data.category},
          ${data.businessId},
          ${JSON.stringify(data.metadata || {})}::jsonb,
          ${JSON.stringify(embedding)}::vector,
          true,
          NOW(),
          NOW()
        )
        RETURNING *
      `;
            console.log('✅ Content stored with embedding');
            return ragContent;
        }
        catch (error) {
            console.error('Error storing content:', error);
            throw error;
        }
    }
    /**
     * Search for similar content using cosine similarity
     */
    async searchSimilar(query, businessId, limit = 5) {
        try {
            // Create embedding for query
            const queryEmbedding = await this.createEmbedding(query);
            // Search using cosine similarity
            const results = await prisma_1.prisma.$queryRaw `
        SELECT 
          id,
          title,
          content,
          category,
          metadata,
          1 - (embedding <=> ${JSON.stringify(queryEmbedding)}::vector) as similarity
        FROM "RAGContent"
        WHERE "businessId" = ${businessId}
          AND "isActive" = true
          AND embedding IS NOT NULL
        ORDER BY embedding <=> ${JSON.stringify(queryEmbedding)}::vector
        LIMIT ${limit}
      `;
            console.log(`✅ Found ${results.length} similar contents`);
            return results;
        }
        catch (error) {
            console.error('Error searching similar content:', error);
            throw error;
        }
    }
    /**
     * Get relevant context for AI (formatted for prompt)
     */
    async getRelevantContext(query, businessId, limit = 3) {
        const results = await this.searchSimilar(query, businessId, limit);
        if (results.length === 0) {
            return 'No relevant information found in knowledge base.';
        }
        // Format results for AI prompt
        const context = results
            .map((result, index) => {
            return `
[Source ${index + 1}: ${result.title}]
${result.content}
Relevance: ${(result.similarity * 100).toFixed(1)}%
`;
        })
            .join('\n---\n');
        return context;
    }
    /**
     * Update embedding for existing content
     */
    async updateEmbedding(id, content) {
        try {
            const embedding = await this.createEmbedding(content);
            await prisma_1.prisma.$executeRaw `
        UPDATE "RAGContent"
        SET embedding = ${JSON.stringify(embedding)}::vector,
            "updatedAt" = NOW()
        WHERE id = ${id}
      `;
            console.log(`✅ Updated embedding for content ${id}`);
        }
        catch (error) {
            console.error('Error updating embedding:', error);
            throw error;
        }
    }
    /**
   * Delete RAG content and its embedding
   */
    async deleteContent(id) {
        try {
            // Delete from database (this also removes the embedding)
            await prisma_1.prisma.rAGContent.delete({
                where: { id },
            });
            console.log(`✅ Content ${id} deleted successfully`);
        }
        catch (error) {
            console.error('Error deleting content:', error);
            throw error;
        }
    }
}
exports.VectorService = VectorService;
exports.vectorService = new VectorService();
