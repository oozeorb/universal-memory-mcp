#!/usr/bin/env node

import express from 'express';
import cors from 'cors';
import { createMemoryStore } from './memory-store.js';
import { createOllamaClient } from './ollama-client.js';
import { loadConfig, enhanceMemoryWithRepoInfo } from './utils.js';
import type {
  Config,
  MemoryData,
  AddMemoryArgs,
  SearchMemoriesArgs,
  GetMemoriesArgs,
  ExtractMemoriesArgs,
  DeleteMemoryArgs,
  ListProjectFilesArgs,
  MemoryBankUpdateArgs,
  ExportMemoryBankArgs,
  TodoData,
  AddTodoArgs,
  ListTodosArgs,
  UpdateTodoArgs,
  DeleteTodoArgs,
} from './types.js';

// HTTP Bridge to MCP Protocol
interface MCPRequest {
  method: 'tools/list' | 'tools/call';
  params?: {
    name?: string;
    arguments?: Record<string, unknown>;
  };
}

interface MCPResponse {
  tools?: Array<{
    name: string;
    description: string;
    inputSchema: Record<string, unknown>;
  }>;
  content?: Array<{
    type: string;
    text: string;
  }>;
  error?: {
    code: number;
    message: string;
  };
}

// Create the same tool handlers as in index.ts
const createToolHandlers = (
  config: Config,
  memoryStore: ReturnType<typeof createMemoryStore>,
  ollama: ReturnType<typeof createOllamaClient>
) => ({
  async handleAddMemory(args: AddMemoryArgs) {
    const { content, context, importance = 5, project, category, tags } = args;

    let enhancedContent = content;
    if (config.processing.autoExtract) {
      enhancedContent = await ollama.enhanceMemory(content, context);
    }

    let memoryData: MemoryData = {
      content: enhancedContent,
      originalContent: content,
      context: context || 'general',
      importance,
      timestamp: new Date().toISOString(),
      source: 'manual',
      project,
      category,
      tags,
    };

    // Enhance with repository information
    memoryData = enhanceMemoryWithRepoInfo(memoryData);

    const memory = await memoryStore.addMemory(memoryData);

    return {
      content: [
        {
          type: 'text',
          text: `Memory stored successfully with ID: ${memory.id}\nContent: ${enhancedContent}`,
        },
      ],
    };
  },

  async handleSearchMemories(args: SearchMemoriesArgs) {
    const { query, limit = 5, context } = args;

    const searchOptions: { limit: number; threshold: number; context?: string } = {
      limit,
      threshold: config.processing.similarityThreshold,
    };
    if (context) {
      searchOptions.context = context;
    }
    const memories = await memoryStore.searchMemories(query, searchOptions);

    if (memories.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: 'No memories found matching your query.',
          },
        ],
      };
    }

    const formattedMemories = memories
      .map((memory, index) => {
        const projectText = memory.project ? ` [${memory.project}]` : '';
        const categoryText = memory.category ? ` (${memory.category})` : '';
        const tagsText = memory.tags && Array.isArray(memory.tags) && memory.tags.length > 0 ? ` #${memory.tags.join(' #')}` : '';
        const similarityText = memory.similarity ? ` (${(memory.similarity * 100).toFixed(1)}% match)` : '';
        
        return `${index + 1}. **${memory.content}**${projectText}${categoryText}${tagsText}${similarityText}\n   Context: ${memory.context} | Importance: ${memory.importance}/10 | Created: ${new Date(memory.createdAt).toLocaleString()}`;
      })
      .join('\n\n');

    return {
      content: [
        {
          type: 'text',
          text: `Found ${memories.length} memories:\n\n${formattedMemories}`,
        },
      ],
    };
  },

  async handleGetMemories(args: GetMemoriesArgs) {
    const processedArgs: { context?: string; limit?: number; since?: Date } = {};
    if (args.context) processedArgs.context = args.context;
    if (args.limit) processedArgs.limit = args.limit;
    if (args.since) processedArgs.since = new Date(args.since);
    const memories = await memoryStore.getMemories(processedArgs);

    if (memories.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: 'No memories found.',
          },
        ],
      };
    }

    const formattedMemories = memories
      .map((memory, index) => {
        const projectText = memory.project ? ` [${memory.project}]` : '';
        const categoryText = memory.category ? ` (${memory.category})` : '';
        const tagsText = memory.tags && Array.isArray(memory.tags) && memory.tags.length > 0 ? ` #${memory.tags.join(' #')}` : '';
        
        return `${index + 1}. **${memory.content}**${projectText}${categoryText}${tagsText}\n   Context: ${memory.context} | Importance: ${memory.importance}/10 | Created: ${new Date(memory.createdAt).toLocaleString()}`;
      })
      .join('\n\n');

    return {
      content: [
        {
          type: 'text',
          text: `Found ${memories.length} memories:\n\n${formattedMemories}`,
        },
      ],
    };
  },

  async handleExtractMemories(args: ExtractMemoriesArgs) {
    const { text, context = 'conversation' } = args;

    const extractedFacts = await ollama.extractMemories(text, context);
    const memories = [];

    for (const fact of extractedFacts) {
      const memoryData: MemoryData = {
        content: fact.content,
        context: fact.context || context,
        importance: fact.importance || 5,
        timestamp: new Date().toISOString(),
        source: 'auto-extracted',
      };

      const memory = await memoryStore.addMemory(memoryData);
      memories.push(memory);
    }

    const summary = memories.map(m => `- ${m.content}`).join('\n');

    return {
      content: [
        {
          type: 'text',
          text: `Extracted and stored ${memories.length} memories:\n\n${summary}`,
        },
      ],
    };
  },

  async handleDeleteMemory(args: DeleteMemoryArgs) {
    const { id } = args;

    const deleted = await memoryStore.deleteMemory(id);

    if (!deleted) {
      return {
        content: [
          {
            type: 'text',
            text: `Memory with ID ${id} not found.`,
          },
        ],
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: `Memory with ID ${id} deleted successfully.`,
        },
      ],
    };
  },

  async handleListProjects() {
    const projects = await memoryStore.listProjects();

    if (projects.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: 'No projects found.',
          },
        ],
      };
    }

    const formattedProjects = projects
      .map((project, index) => {
        return `${index + 1}. **${project.project}**\n   Memories: ${project.totalMemories} | Categories: ${project.categories.join(', ') || 'None'} | Last Updated: ${new Date(project.lastUpdated).toLocaleString()}`;
      })
      .join('\n\n');

    return {
      content: [
        {
          type: 'text',
          text: `Found ${projects.length} projects:\n\n${formattedProjects}`,
        },
      ],
    };
  },

  async handleListProjectFiles(args: ListProjectFilesArgs) {
    const { project } = args;
    const files = await memoryStore.listProjectFiles(project);

    if (files.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `No categories found for project: ${project}`,
          },
        ],
      };
    }

    const formattedFiles = files.map((file, index) => `${index + 1}. ${file}`).join('\n');

    return {
      content: [
        {
          type: 'text',
          text: `Categories in project "${project}":\n\n${formattedFiles}`,
        },
      ],
    };
  },

  async handleMemoryBankUpdate(args: MemoryBankUpdateArgs) {
    const { project, category, memories } = args;

    await memoryStore.updateMemoryBank(project, category, memories);

    return {
      content: [
        {
          type: 'text',
          text: `Successfully updated memory bank for project "${project}" with ${memories.length} memories.`,
        },
      ],
    };
  },

  async handleExportMemoryBank(args: ExportMemoryBankArgs) {
    const { project, category, format = 'json' } = args;

    const exportData = await memoryStore.exportMemoryBank(project, category, format);

    let formattedContent: string;

    switch (format) {
      case 'markdown':
        formattedContent = `# Memory Bank Export\n\n${exportData.memories.map(m => `## ${m.content}\n\n**Context:** ${m.context}\n**Importance:** ${m.importance}/10\n**Created:** ${new Date(m.createdAt).toLocaleString()}\n\n---\n`).join('\n')}`;
        break;
      case 'csv':
        formattedContent = ['ID,Content,Context,Importance,Created', ...exportData.memories.map(m => `${m.id},"${m.content.replace(/"/g, '""')}",${m.context},${m.importance},${m.createdAt}`)].join('\n');
        break;
      case 'json':
      default:
        formattedContent = JSON.stringify(exportData, null, 2);
        break;
    }

    const filterText = [];
    if (project) filterText.push(`project: ${project}`);
    if (category) filterText.push(`category: ${category}`);
    const filterStr = filterText.length > 0 ? ` (${filterText.join(', ')})` : '';

    return {
      content: [
        {
          type: 'text',
          text: `Exported ${exportData.memories.length} memories${filterStr} in ${format.toUpperCase()} format:\n\n\`\`\`${format}\n${formattedContent}\n\`\`\``,
        },
      ],
    };
  },

  // Todo handlers
  async handleAddTodo(args: AddTodoArgs) {
    const todoData: TodoData = {
      content: args.content,
      status: args.status || 'pending',
      priority: args.priority || 'medium',
      project: args.project,
      context: args.context,
      tags: args.tags,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const todo = await memoryStore.addTodo(todoData);

    return {
      content: [
        {
          type: 'text',
          text: `Todo added successfully with ID: ${todo.id}\nContent: ${todo.content}\nStatus: ${todo.status}\nPriority: ${todo.priority}`,
        },
      ],
    };
  },

  async handleListTodos(args: ListTodosArgs) {
    const todos = await memoryStore.listTodos(args);

    if (todos.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: 'No todos found matching the criteria.',
          },
        ],
      };
    }

    const formattedTodos = todos
      .map((todo, index) => {
        const projectText = todo.project ? ` [${todo.project}]` : '';
        const contextText = todo.context ? ` (${todo.context})` : '';
        const tagsText = todo.tags && Array.isArray(todo.tags) && todo.tags.length > 0 ? ` #${todo.tags.join(' #')}` : '';
        const statusEmoji = todo.status === 'completed' ? '✅' : todo.status === 'in_progress' ? '🔄' : '⏳';
        const priorityEmoji = todo.priority === 'high' ? '🔴' : todo.priority === 'medium' ? '🟡' : '🟢';
        
        return `${index + 1}. ${statusEmoji} ${priorityEmoji} ${todo.content}${projectText}${contextText}${tagsText}\n   ID: ${todo.id} | Created: ${new Date(todo.createdAt).toLocaleString()}`;
      })
      .join('\n\n');

    return {
      content: [
        {
          type: 'text',
          text: `Found ${todos.length} todos:\n\n${formattedTodos}`,
        },
      ],
    };
  },

  async handleUpdateTodo(args: UpdateTodoArgs) {
    const { id, ...updates } = args;
    
    const updatedTodo = await memoryStore.updateTodo(id, updates);

    if (!updatedTodo) {
      return {
        content: [
          {
            type: 'text',
            text: `Todo with ID ${id} not found.`,
          },
        ],
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: `Todo updated successfully:\nID: ${updatedTodo.id}\nContent: ${updatedTodo.content}\nStatus: ${updatedTodo.status}\nPriority: ${updatedTodo.priority}`,
        },
      ],
    };
  },

  async handleDeleteTodo(args: DeleteTodoArgs) {
    const { id } = args;

    const deleted = await memoryStore.deleteTodo(id);

    if (!deleted) {
      return {
        content: [
          {
            type: 'text',
            text: `Todo with ID ${id} not found.`,
          },
        ],
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: `Todo with ID ${id} deleted successfully.`,
        },
      ],
    };
  },
});

// HTTP Server
export const createHttpServer = async () => {
  const app = express();
  
  // Middleware
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));

  // Initialize system
  const config = loadConfig();
  const memoryStore = createMemoryStore(config.memoryStorage);
  const ollama = createOllamaClient(config.ollamaUrl, config.ollamaModel);
  
  await memoryStore.initialize();
  
  // Test Ollama connection (non-fatal)
  try {
    await ollama.testConnection();
    console.log('✅ Ollama connected successfully');
  } catch (error) {
    console.log('⚠️  Ollama not available. AI features disabled.');
  }

  const handlers = createToolHandlers(config, memoryStore, ollama);

  // Tool definitions (same as MCP)
  const tools = [
    {
      name: 'add_memory',
      description: 'Store a new memory or fact for future reference',
      inputSchema: {
        type: 'object',
        properties: {
          content: { type: 'string', description: 'The content to remember' },
          context: { type: 'string', description: 'Optional context about this memory' },
          importance: { type: 'number', description: 'Importance level from 1-10', minimum: 1, maximum: 10 },
          project: { type: 'string', description: 'Optional project name for organization' },
          category: { type: 'string', description: 'Optional category for organizing memories within a project' },
          tags: { type: 'array', description: 'Optional tags for categorization', items: { type: 'string' } },
        },
        required: ['content'],
      },
    },
    {
      name: 'search_memories',
      description: 'Search for relevant memories based on query',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'What to search for in memories' },
          limit: { type: 'number', description: 'Maximum number of memories to return (default: 5)', minimum: 1, maximum: 20 },
          context: { type: 'string', description: 'Optional context to filter memories' },
        },
        required: ['query'],
      },
    },
    {
      name: 'get_memories',
      description: 'Get recent memories or all memories for a context',
      inputSchema: {
        type: 'object',
        properties: {
          context: { type: 'string', description: 'Optional context to filter memories' },
          limit: { type: 'number', description: 'Maximum number of memories to return', minimum: 1, maximum: 50 },
          since: { type: 'string', description: 'ISO date string to get memories since this date' },
        },
      },
    },
    {
      name: 'extract_memories',
      description: 'Extract and store important facts from conversation/text',
      inputSchema: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'The text to extract memories from' },
          context: { type: 'string', description: 'Context about this text' },
        },
        required: ['text'],
      },
    },
    {
      name: 'delete_memory',
      description: 'Delete a specific memory by ID',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'The ID of the memory to delete' },
        },
        required: ['id'],
      },
    },
    {
      name: 'list_projects',
      description: 'Show all projects with memories',
      inputSchema: { type: 'object', properties: {} },
    },
    {
      name: 'list_project_files',
      description: 'Show memory categories for a project',
      inputSchema: {
        type: 'object',
        properties: {
          project: { type: 'string', description: 'The project name to list categories for' },
        },
        required: ['project'],
      },
    },
    {
      name: 'memory_bank_update',
      description: 'Structured updates to project memories',
      inputSchema: {
        type: 'object',
        properties: {
          project: { type: 'string', description: 'The project name' },
          category: { type: 'string', description: 'Optional category for organizing memories' },
          memories: {
            type: 'array',
            description: 'Array of memories to add',
            items: {
              type: 'object',
              properties: {
                content: { type: 'string', description: 'The memory content' },
                importance: { type: 'number', description: 'Importance level from 1-10', minimum: 1, maximum: 10 },
                tags: { type: 'array', description: 'Optional tags for categorization', items: { type: 'string' } },
              },
              required: ['content'],
            },
          },
        },
        required: ['project', 'memories'],
      },
    },
    {
      name: 'export_memory_bank',
      description: 'Export memories in different formats',
      inputSchema: {
        type: 'object',
        properties: {
          project: { type: 'string', description: 'Optional project name to filter exports' },
          category: { type: 'string', description: 'Optional category to filter exports' },
          format: { type: 'string', description: 'Export format', enum: ['json', 'markdown', 'csv'] },
        },
        required: ['format'],
      },
    },
    {
      name: 'add_todo',
      description: 'Add a new todo item',
      inputSchema: {
        type: 'object',
        properties: {
          content: { type: 'string', description: 'The todo content' },
          status: { type: 'string', description: 'Todo status', enum: ['pending', 'in_progress', 'completed'] },
          priority: { type: 'string', description: 'Todo priority', enum: ['low', 'medium', 'high'] },
          project: { type: 'string', description: 'Optional project name' },
          context: { type: 'string', description: 'Optional context' },
          tags: { type: 'array', description: 'Optional tags', items: { type: 'string' } },
        },
        required: ['content'],
      },
    },
    {
      name: 'list_todos',
      description: 'List todos with optional filters',
      inputSchema: {
        type: 'object',
        properties: {
          status: { type: 'string', description: 'Filter by status', enum: ['pending', 'in_progress', 'completed'] },
          priority: { type: 'string', description: 'Filter by priority', enum: ['low', 'medium', 'high'] },
          project: { type: 'string', description: 'Filter by project' },
          context: { type: 'string', description: 'Filter by context' },
          limit: { type: 'number', description: 'Maximum number of todos to return', minimum: 1, maximum: 50 },
        },
      },
    },
    {
      name: 'update_todo',
      description: 'Update an existing todo',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Todo ID' },
          content: { type: 'string', description: 'Updated content' },
          status: { type: 'string', description: 'Updated status', enum: ['pending', 'in_progress', 'completed'] },
          priority: { type: 'string', description: 'Updated priority', enum: ['low', 'medium', 'high'] },
          project: { type: 'string', description: 'Updated project' },
          context: { type: 'string', description: 'Updated context' },
          tags: { type: 'array', description: 'Updated tags', items: { type: 'string' } },
        },
        required: ['id'],
      },
    },
    {
      name: 'delete_todo',
      description: 'Delete a todo',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Todo ID to delete' },
        },
        required: ['id'],
      },
    },
  ];

  // Health check endpoint
  app.get('/health', (_req: any, res: any) => {
    res.json({ 
      status: 'healthy',
      timestamp: new Date().toISOString(),
      tools: tools.length,
      version: '1.0.0'
    });
  });

  // MCP bridge endpoint
  app.post('/mcp', (async (req: any, res: any) => {
    try {
      const mcpRequest: MCPRequest = req.body;

      if (mcpRequest.method === 'tools/list') {
        const response: MCPResponse = { tools };
        return res.json(response);
      }

      if (mcpRequest.method === 'tools/call') {
        const { name, arguments: args } = mcpRequest.params || {};

        if (!name) {
          return res.status(400).json({
            error: { code: 400, message: 'Missing tool name' }
          });
        }

        let result;

        // Route to appropriate handler
        switch (name) {
          case 'add_memory':
            result = await handlers.handleAddMemory(args as unknown as AddMemoryArgs);
            break;
          case 'search_memories':
            result = await handlers.handleSearchMemories(args as unknown as SearchMemoriesArgs);
            break;
          case 'get_memories':
            result = await handlers.handleGetMemories(args as unknown as GetMemoriesArgs);
            break;
          case 'extract_memories':
            result = await handlers.handleExtractMemories(args as unknown as ExtractMemoriesArgs);
            break;
          case 'delete_memory':
            result = await handlers.handleDeleteMemory(args as unknown as DeleteMemoryArgs);
            break;
          case 'list_projects':
            result = await handlers.handleListProjects();
            break;
          case 'list_project_files':
            result = await handlers.handleListProjectFiles(args as unknown as ListProjectFilesArgs);
            break;
          case 'memory_bank_update':
            result = await handlers.handleMemoryBankUpdate(args as unknown as MemoryBankUpdateArgs);
            break;
          case 'export_memory_bank':
            result = await handlers.handleExportMemoryBank(args as unknown as ExportMemoryBankArgs);
            break;
          case 'add_todo':
            result = await handlers.handleAddTodo(args as unknown as AddTodoArgs);
            break;
          case 'list_todos':
            result = await handlers.handleListTodos(args as unknown as ListTodosArgs);
            break;
          case 'update_todo':
            result = await handlers.handleUpdateTodo(args as unknown as UpdateTodoArgs);
            break;
          case 'delete_todo':
            result = await handlers.handleDeleteTodo(args as unknown as DeleteTodoArgs);
            break;
          default:
            return res.status(404).json({
              error: { code: 404, message: `Unknown tool: ${name}` }
            });
        }

        return res.json(result);
      }

      return res.status(400).json({
        error: { code: 400, message: 'Invalid MCP method' }
      });

    } catch (error) {
      console.error('MCP Bridge Error:', error);
      return res.status(500).json({
        error: { 
          code: 500, 
          message: `Internal server error: ${(error as Error).message}` 
        }
      });
    }
  }) as any);

  return { app, memoryStore };
};

// Run server if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const port = process.env.PORT ? parseInt(process.env.PORT) : 3020;
  
  createHttpServer().then(({ app }) => {
    app.listen(port, '0.0.0.0', () => {
      console.log(`🚀 Universal Memory MCP HTTP Bridge running on http://localhost:${port}`);
      console.log(`📋 Health check: http://localhost:${port}/health`);
      console.log(`🔗 MCP endpoint: http://localhost:${port}/mcp`);
      console.log('');
      console.log('🧠 Memory Tools: add_memory, search_memories, get_memories, extract_memories, delete_memory');
      console.log('📋 Todo Tools: add_todo, list_todos, update_todo, delete_todo');
      console.log('📂 Project Tools: list_projects, memory_bank_update, export_memory_bank');
      console.log('');
      console.log('Ready for MCP client connections! 🎉');
    });
  }).catch(error => {
    console.error('Failed to start HTTP server:', error);
    process.exit(1);
  });
}