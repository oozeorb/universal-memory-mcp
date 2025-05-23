#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ErrorCode,
} from '@modelcontextprotocol/sdk/types.js';

import { createMemoryStore } from './memory-store.js';
import { createOllamaClient } from './ollama-client.js';
import { loadConfig } from './utils.js';
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

// Types for the functional memory server
export type UniversalMemoryServer = {
  run(): Promise<void>;
};

// Helper functions for export formatting
const formatAsMarkdown = (exportData: import('./types.js').MemoryBankExport): string => {
  const { project, category, memories, exportedAt } = exportData;

  let markdown = '# Memory Bank Export\n\n';
  if (project) markdown += `**Project:** ${project}\n`;
  if (category) markdown += `**Category:** ${category}\n`;
  markdown += `**Exported:** ${new Date(exportedAt).toLocaleString()}\n`;
  markdown += `**Total Memories:** ${memories.length}\n\n`;

  memories.forEach((memory, index) => {
    markdown += `## Memory ${index + 1}\n\n`;
    markdown += `**Content:** ${memory.content}\n\n`;
    if (memory.project) markdown += `**Project:** ${memory.project}\n`;
    if (memory.category) markdown += `**Category:** ${memory.category}\n`;
    markdown += `**Context:** ${memory.context}\n`;
    markdown += `**Importance:** ${memory.importance}/10\n`;
    if (memory.tags && memory.tags.length > 0) {
      markdown += `**Tags:** ${memory.tags.join(', ')}\n`;
    }
    markdown += `**Created:** ${new Date(memory.createdAt).toLocaleString()}\n\n`;
    markdown += '---\n\n';
  });

  return markdown;
};

const formatAsCSV = (exportData: import('./types.js').MemoryBankExport): string => {
  const headers = [
    'ID',
    'Content',
    'Project',
    'Category',
    'Context',
    'Importance',
    'Tags',
    'Source',
    'Created',
    'Updated',
  ];
  const csvRows = [headers.join(',')];

  exportData.memories.forEach(memory => {
    const row = [
      memory.id,
      `"${memory.content.replace(/"/g, '""')}"`,
      memory.project || '',
      memory.category || '',
      memory.context,
      memory.importance.toString(),
      memory.tags ? `"${memory.tags.join(', ')}"` : '',
      memory.source,
      memory.createdAt,
      memory.updatedAt,
    ];
    csvRows.push(row.join(','));
  });

  return csvRows.join('\n');
};

// Tool handlers as pure functions
const createToolHandlers = (
  config: Config,
  memoryStore: ReturnType<typeof createMemoryStore>,
  ollama: ReturnType<typeof createOllamaClient>
) => ({
  async handleAddMemory(args: AddMemoryArgs) {
    const { content, context, importance = 5, project, category, tags } = args;

    // Use Ollama to enhance the memory if configured
    let enhancedContent = content;
    if (config.processing.autoExtract) {
      enhancedContent = await ollama.enhanceMemory(content, context);
    }

    const memoryData: MemoryData = {
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
            text: `No memories found for query: "${query}"`,
          },
        ],
      };
    }

    const formattedMemories = memories
      .map(
        memory =>
          `[${memory.timestamp}] ${memory.context}: ${memory.content} (relevance: ${(memory.similarity * 100).toFixed(1)}%)`
      )
      .join('\n\n');

    return {
      content: [
        {
          type: 'text',
          text: `Found ${memories.length} relevant memories:\n\n${formattedMemories}`,
        },
      ],
    };
  },

  async handleGetMemories(args: GetMemoriesArgs) {
    const { context, limit = 10, since } = args;

    const getOptions: { limit: number; context?: string; since?: Date } = {
      limit,
    };
    if (context) {
      getOptions.context = context;
    }
    if (since) {
      getOptions.since = new Date(since);
    }
    const memories = await memoryStore.getMemories(getOptions);

    if (memories.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: context ? `No memories found for context: "${context}"` : 'No memories found',
          },
        ],
      };
    }

    const formattedMemories = memories
      .map(memory => `[${memory.timestamp}] ${memory.context}: ${memory.content}`)
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
            text: `Memory with ID "${id}" not found`,
          },
        ],
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: `Memory with ID "${id}" deleted successfully`,
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
            text: 'No projects with memories found.',
          },
        ],
      };
    }

    const projectList = projects
      .map(
        p =>
          `**${p.project}** (${p.totalMemories} memories)\n` +
          `  Categories: ${p.categories.length > 0 ? p.categories.join(', ') : 'None'}\n` +
          `  Last updated: ${new Date(p.lastUpdated).toLocaleString()}`
      )
      .join('\n\n');

    return {
      content: [
        {
          type: 'text',
          text: `Found ${projects.length} projects with memories:\n\n${projectList}`,
        },
      ],
    };
  },

  async handleListProjectFiles(args: ListProjectFilesArgs) {
    const { project } = args;
    const categories = await memoryStore.listProjectFiles(project);

    if (categories.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `No memory categories found for project "${project}".`,
          },
        ],
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: `Memory categories for project "${project}":\n\n${categories.map(c => `• ${c}`).join('\n')}`,
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
          text: `Successfully updated memory bank for project "${project}"${category ? ` in category "${category}"` : ''} with ${memories.length} memories.`,
        },
      ],
    };
  },

  async handleExportMemoryBank(args: ExportMemoryBankArgs) {
    const { project, format, category } = args;
    const exportData = await memoryStore.exportMemoryBank(project, category, format);

    let formattedContent = '';

    switch (format) {
      case 'markdown':
        formattedContent = formatAsMarkdown(exportData);
        break;
      case 'csv':
        formattedContent = formatAsCSV(exportData);
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
        const tagsText = todo.tags && todo.tags.length > 0 ? ` #${todo.tags.join(' #')}` : '';
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

// Setup server handlers
const setupServerHandlers = (server: Server, handlers: ReturnType<typeof createToolHandlers>) => {
  // List available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: 'add_memory',
          description: 'Store a new memory or fact for future reference',
          inputSchema: {
            type: 'object',
            properties: {
              content: {
                type: 'string',
                description: 'The content or fact to remember',
              },
              context: {
                type: 'string',
                description: 'Optional context about this memory (project, topic, etc.)',
              },
              importance: {
                type: 'number',
                description: 'Importance level from 1-10 (optional, default: 5)',
                minimum: 1,
                maximum: 10,
              },
              project: {
                type: 'string',
                description: 'Optional project name for organization',
              },
              category: {
                type: 'string',
                description: 'Optional category for organizing memories within a project',
              },
              tags: {
                type: 'array',
                description: 'Optional tags for categorization',
                items: {
                  type: 'string',
                },
              },
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
              query: {
                type: 'string',
                description: 'What to search for in memories',
              },
              limit: {
                type: 'number',
                description: 'Maximum number of memories to return (default: 5)',
                minimum: 1,
                maximum: 20,
              },
              context: {
                type: 'string',
                description: 'Optional context to filter memories (project, topic, etc.)',
              },
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
              context: {
                type: 'string',
                description: 'Optional context to filter memories',
              },
              limit: {
                type: 'number',
                description: 'Maximum number of memories to return (default: 10)',
                minimum: 1,
                maximum: 50,
              },
              since: {
                type: 'string',
                description: 'ISO date string to get memories since this date',
              },
            },
          },
        },
        {
          name: 'extract_memories',
          description: 'Extract and store important facts from a conversation or text',
          inputSchema: {
            type: 'object',
            properties: {
              text: {
                type: 'string',
                description: 'The text to extract memories from',
              },
              context: {
                type: 'string',
                description: 'Context about this text (project, meeting, etc.)',
              },
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
              id: {
                type: 'string',
                description: 'The ID of the memory to delete',
              },
            },
            required: ['id'],
          },
        },
        {
          name: 'list_projects',
          description: 'Show all projects with memories',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'list_project_files',
          description: 'Show memory categories for a project',
          inputSchema: {
            type: 'object',
            properties: {
              project: {
                type: 'string',
                description: 'The project name to list categories for',
              },
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
              project: {
                type: 'string',
                description: 'The project name',
              },
              category: {
                type: 'string',
                description: 'Optional category for organizing memories',
              },
              memories: {
                type: 'array',
                description: 'Array of memories to add',
                items: {
                  type: 'object',
                  properties: {
                    content: {
                      type: 'string',
                      description: 'The memory content',
                    },
                    importance: {
                      type: 'number',
                      description: 'Importance level from 1-10 (default: 5)',
                      minimum: 1,
                      maximum: 10,
                    },
                    tags: {
                      type: 'array',
                      description: 'Optional tags for categorization',
                      items: {
                        type: 'string',
                      },
                    },
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
              project: {
                type: 'string',
                description: 'Optional project name to filter exports',
              },
              category: {
                type: 'string',
                description: 'Optional category to filter exports',
              },
              format: {
                type: 'string',
                description: 'Export format',
                enum: ['json', 'markdown', 'csv'],
              },
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
              content: {
                type: 'string',
                description: 'The todo content',
              },
              status: {
                type: 'string',
                description: 'Todo status',
                enum: ['pending', 'in_progress', 'completed'],
              },
              priority: {
                type: 'string',
                description: 'Todo priority',
                enum: ['low', 'medium', 'high'],
              },
              project: {
                type: 'string',
                description: 'Optional project name',
              },
              context: {
                type: 'string',
                description: 'Optional context',
              },
              tags: {
                type: 'array',
                description: 'Optional tags',
                items: {
                  type: 'string',
                },
              },
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
              status: {
                type: 'string',
                description: 'Filter by status',
                enum: ['pending', 'in_progress', 'completed'],
              },
              priority: {
                type: 'string',
                description: 'Filter by priority',
                enum: ['low', 'medium', 'high'],
              },
              project: {
                type: 'string',
                description: 'Filter by project',
              },
              context: {
                type: 'string',
                description: 'Filter by context',
              },
              limit: {
                type: 'number',
                description: 'Maximum number of todos to return',
                minimum: 1,
                maximum: 50,
              },
            },
          },
        },
        {
          name: 'update_todo',
          description: 'Update an existing todo',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'Todo ID',
              },
              content: {
                type: 'string',
                description: 'Updated content',
              },
              status: {
                type: 'string',
                description: 'Updated status',
                enum: ['pending', 'in_progress', 'completed'],
              },
              priority: {
                type: 'string',
                description: 'Updated priority',
                enum: ['low', 'medium', 'high'],
              },
              project: {
                type: 'string',
                description: 'Updated project',
              },
              context: {
                type: 'string',
                description: 'Updated context',
              },
              tags: {
                type: 'array',
                description: 'Updated tags',
                items: {
                  type: 'string',
                },
              },
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
              id: {
                type: 'string',
                description: 'Todo ID to delete',
              },
            },
            required: ['id'],
          },
        },
      ],
    };
  });

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async request => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case 'add_memory':
          if (!args || typeof args !== 'object' || !('content' in args)) {
            throw new McpError(ErrorCode.InvalidParams, 'Missing required parameter: content');
          }
          return await handlers.handleAddMemory(args as unknown as AddMemoryArgs);

        case 'search_memories':
          if (!args || typeof args !== 'object' || !('query' in args)) {
            throw new McpError(ErrorCode.InvalidParams, 'Missing required parameter: query');
          }
          return await handlers.handleSearchMemories(args as unknown as SearchMemoriesArgs);

        case 'get_memories':
          return await handlers.handleGetMemories((args || {}) as unknown as GetMemoriesArgs);

        case 'extract_memories':
          if (!args || typeof args !== 'object' || !('text' in args)) {
            throw new McpError(ErrorCode.InvalidParams, 'Missing required parameter: text');
          }
          return await handlers.handleExtractMemories(args as unknown as ExtractMemoriesArgs);

        case 'delete_memory':
          if (!args || typeof args !== 'object' || !('id' in args)) {
            throw new McpError(ErrorCode.InvalidParams, 'Missing required parameter: id');
          }
          return await handlers.handleDeleteMemory(args as unknown as DeleteMemoryArgs);

        case 'list_projects':
          return await handlers.handleListProjects();

        case 'list_project_files':
          if (!args || typeof args !== 'object' || !('project' in args)) {
            throw new McpError(ErrorCode.InvalidParams, 'Missing required parameter: project');
          }
          return await handlers.handleListProjectFiles(args as unknown as ListProjectFilesArgs);

        case 'memory_bank_update':
          if (!args || typeof args !== 'object' || !('project' in args) || !('memories' in args)) {
            throw new McpError(
              ErrorCode.InvalidParams,
              'Missing required parameters: project, memories'
            );
          }
          return await handlers.handleMemoryBankUpdate(args as unknown as MemoryBankUpdateArgs);

        case 'export_memory_bank':
          if (!args || typeof args !== 'object' || !('format' in args)) {
            throw new McpError(ErrorCode.InvalidParams, 'Missing required parameter: format');
          }
          return await handlers.handleExportMemoryBank(args as unknown as ExportMemoryBankArgs);

        case 'add_todo':
          if (!args || typeof args !== 'object' || !('content' in args)) {
            throw new McpError(ErrorCode.InvalidParams, 'Missing required parameter: content');
          }
          return await handlers.handleAddTodo(args as unknown as AddTodoArgs);

        case 'list_todos':
          return await handlers.handleListTodos((args || {}) as unknown as ListTodosArgs);

        case 'update_todo':
          if (!args || typeof args !== 'object' || !('id' in args)) {
            throw new McpError(ErrorCode.InvalidParams, 'Missing required parameter: id');
          }
          return await handlers.handleUpdateTodo(args as unknown as UpdateTodoArgs);

        case 'delete_todo':
          if (!args || typeof args !== 'object' || !('id' in args)) {
            throw new McpError(ErrorCode.InvalidParams, 'Missing required parameter: id');
          }
          return await handlers.handleDeleteTodo(args as unknown as DeleteTodoArgs);

        default:
          throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
      }
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Error executing tool ${name}: ${(error as Error).message}`
      );
    }
  });
};

// Factory function to create a universal memory server
export const createUniversalMemoryServer = (): UniversalMemoryServer => {
  const config = loadConfig();
  const server = new Server(
    {
      name: 'universal-memory-mcp',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  const memoryStore = createMemoryStore(config.memoryStorage);
  const ollama = createOllamaClient(config.ollamaUrl, config.ollamaModel);
  const handlers = createToolHandlers(config, memoryStore, ollama);

  setupServerHandlers(server, handlers);

  return {
    async run(): Promise<void> {
      // Initialize storage
      await memoryStore.initialize();

      // Test Ollama connection (non-fatal)
      try {
        await ollama.testConnection();
      } catch {
        console.error('Warning: Ollama not available. AI features disabled.');
        console.error('Memory storage and basic operations will still work.');
      }

      const transport = new StdioServerTransport();
      await server.connect(transport);

      console.error('Universal Memory MCP server running...');
    },
  };
};

// Start the server using functional approach
const server = createUniversalMemoryServer();
server.run().catch(console.error);
