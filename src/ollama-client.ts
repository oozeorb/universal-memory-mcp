import fetch, { Response } from 'node-fetch';
import type { OllamaResponse, OllamaListResponse, ExtractedMemory, StoredMemory } from './types.js';

// Types for the functional Ollama client
export type OllamaClient = {
  testConnection(): Promise<void>;
  generateResponse(prompt: string, options?: Record<string, unknown>): Promise<string>;
  enhanceMemory(content: string, context?: string): Promise<string>;
  extractMemories(text: string, context?: string): Promise<ExtractedMemory[]>;
  generateEmbedding(text: string): Promise<number[] | null>;
  findSimilarMemories(
    query: string,
    memories: StoredMemory[],
    threshold?: number
  ): Promise<(StoredMemory & { similarity: number })[]>;
};

// Utility functions
const simpleTextSimilarity = (text1: string, text2: string): number => {
  const words1 = new Set(text1.toLowerCase().split(/\s+/));
  const words2 = new Set(text2.toLowerCase().split(/\s+/));

  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);

  return intersection.size / union.size;
};

const makeApiCall = async (
  baseUrl: string,
  endpoint: string,
  body: Record<string, unknown>
): Promise<Response> => {
  const response = await fetch(`${baseUrl}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Ollama API error: ${response.status}`);
  }

  return response;
};

const parseJsonFromResponse = (response: string): unknown => {
  let jsonStr = response.trim();

  // Find JSON array in the response
  const jsonMatch = jsonStr.match(/\[[\s\S]*\]/);
  if (jsonMatch) {
    jsonStr = jsonMatch[0];
  }

  return JSON.parse(jsonStr);
};

// Factory function to create an Ollama client
export const createOllamaClient = (
  baseUrl = process.env.OLLAMA_URL || 'http://localhost:11434',
  model = process.env.OLLAMA_MODEL || 'llama3.1:8b'
): OllamaClient => {
  return {
    async testConnection(): Promise<void> {
      try {
        const response = await fetch(`${baseUrl}/api/tags`);
        if (!response.ok) {
          throw new Error(`Ollama server not responding: ${response.status}`);
        }

        const data = (await response.json()) as OllamaListResponse;
        const models = data.models || [];
        const hasModel = models.some(m => m.name === model);

        if (!hasModel) {
          console.error(
            `Warning: Model ${model} not found. Available models:`,
            models.map(m => m.name)
          );
          throw new Error(`Model ${model} not found. Please run: ollama pull ${model}`);
        }

        console.error('✅ Ollama connected successfully');
      } catch (error) {
        console.error('❌ Ollama connection failed');
        throw error;
      }
    },

    async generateResponse(prompt: string, options: Record<string, unknown> = {}): Promise<string> {
      try {
        const response = await makeApiCall(baseUrl, '/api/generate', {
          model,
          prompt,
          stream: false,
          options: {
            temperature: 0.7,
            ...options,
          },
        });

        const data = (await response.json()) as OllamaResponse;
        return data.response;
      } catch (error) {
        console.error('Error calling Ollama:', error);
        throw error;
      }
    },

    async enhanceMemory(content: string, context?: string): Promise<string> {
      const prompt = `You are a memory enhancement system. Take the following content and improve it for better recall and searchability while preserving all important information.

Context: ${context || 'general'}
Original content: ${content}

Enhanced memory (be concise but comprehensive):`;

      try {
        const enhanced = await this.generateResponse(prompt, { temperature: 0.3 });
        return enhanced.trim();
      } catch (error) {
        console.error('Failed to enhance memory, using original:', (error as Error).message);
        return content;
      }
    },

    async extractMemories(text: string, context = 'conversation'): Promise<ExtractedMemory[]> {
      const prompt = `You are a memory extraction system. Analyze the following text and extract important facts, decisions, preferences, and context that should be remembered for future conversations.

Context: ${context}
Text to analyze:
${text}

Extract key memories in this JSON format:
[
  {
    "content": "specific fact or decision",
    "context": "category or project name",
    "importance": 1-10
  }
]

Focus on:
- Decisions made
- Preferences stated
- Important facts
- Project details
- Technical specifications
- Personal information relevant to work

Only extract genuinely important information. Return valid JSON only:`;

      try {
        const response = await this.generateResponse(prompt, { temperature: 0.2 });
        const memories = parseJsonFromResponse(response) as ExtractedMemory[];

        if (!Array.isArray(memories)) {
          throw new Error('Response is not an array');
        }

        // Validate and clean each memory object
        return memories
          .filter(
            memory =>
              memory.content &&
              typeof memory.content === 'string' &&
              memory.content.trim().length > 0
          )
          .map(memory => ({
            content: memory.content.trim(),
            context: memory.context || context,
            importance: Math.min(Math.max(memory.importance || 5, 1), 10),
          }));
      } catch (error) {
        console.error('Failed to extract memories:', (error as Error).message);

        // Fallback: create a single memory from the text
        if (text.trim().length > 20) {
          return [
            {
              content: text.slice(0, 200) + (text.length > 200 ? '...' : ''),
              context,
              importance: 5,
            },
          ];
        }

        return [];
      }
    },

    async generateEmbedding(text: string): Promise<number[] | null> {
      // This would be used for semantic search
      // For now, return a placeholder - in production, use Ollama's embedding endpoint
      try {
        const response = await makeApiCall(baseUrl, '/api/embeddings', {
          model,
          prompt: text,
        });

        const data = (await response.json()) as { embedding: number[] };
        return data.embedding;
      } catch (error) {
        console.error('Failed to generate embedding:', (error as Error).message);
        return null;
      }
    },

    async findSimilarMemories(
      query: string,
      memories: StoredMemory[],
      threshold = 0.7
    ): Promise<(StoredMemory & { similarity: number })[]> {
      // Semantic similarity using the language model
      if (memories.length === 0) return [];

      const prompt = `You are a semantic similarity analyzer. Given a query and a list of memories, score how relevant each memory is to the query on a scale of 0.0 to 1.0.

Query: "${query}"

Memories:
${memories.map((m, i) => `${i}: ${m.content}`).join('\n')}

Return only a JSON array of scores in the same order:
[0.85, 0.23, 0.67, ...]

Scores only:`;

      try {
        const response = await this.generateResponse(prompt, { temperature: 0.1 });

        // Extract JSON array from response
        const scoresMatch = response.match(/\[[\d\s,.]+\]/);
        if (!scoresMatch) {
          throw new Error('Could not parse similarity scores');
        }

        const scores = JSON.parse(scoresMatch[0]) as number[];

        // Combine memories with their similarity scores
        const scoredMemories = memories
          .map((memory, index) => ({
            ...memory,
            similarity: scores[index] || 0,
          }))
          .filter(memory => memory.similarity >= threshold);

        // Sort by similarity score
        return scoredMemories.sort((a, b) => b.similarity - a.similarity);
      } catch (error) {
        console.error('Failed to calculate semantic similarity:', (error as Error).message);

        // Fallback to simple text matching
        return memories
          .map(memory => ({
            ...memory,
            similarity: simpleTextSimilarity(query, memory.content),
          }))
          .filter(memory => memory.similarity >= threshold)
          .sort((a, b) => b.similarity - a.similarity);
      }
    },
  };
};
