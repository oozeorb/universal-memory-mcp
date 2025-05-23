#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ErrorCode,
} from '@modelcontextprotocol/sdk/types.js';

// HTTP client to communicate with the HTTP bridge server
class HttpBridgeClient {
  constructor(private baseUrl: string = 'http://localhost:3020') {}

  async makeRequest(path: string, body: any) {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  async listTools() {
    return this.makeRequest('/mcp', {
      method: 'tools/list'
    });
  }

  async callTool(name: string, args: any) {
    return this.makeRequest('/mcp', {
      method: 'tools/call',
      params: {
        name,
        arguments: args
      }
    });
  }

  async healthCheck() {
    const response = await fetch(`${this.baseUrl}/health`);
    if (!response.ok) {
      throw new Error(`Health check failed: ${response.status}`);
    }
    return response.json();
  }
}

// MCP Server that proxies to HTTP bridge
export const createMcpHttpClient = (httpServerUrl?: string) => {
  const httpClient = new HttpBridgeClient(httpServerUrl);
  
  const server = new Server(
    {
      name: 'universal-memory-http-client',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // List available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    try {
      // Check if HTTP server is available
      await httpClient.healthCheck();
      
      // Get tools from HTTP server
      const response = await httpClient.listTools();
      return response as { tools: Array<{ name: string; description: string; inputSchema: any }> };
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to connect to HTTP server: ${(error as Error).message}`
      );
    }
  });

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async request => {
    const { name, arguments: args } = request.params;

    try {
      const response = await httpClient.callTool(name, args);
      return response as { content: Array<{ type: string; text: string }> };
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to execute tool ${name}: ${(error as Error).message}`
      );
    }
  });

  return {
    server,
    async run() {
      const transport = new StdioServerTransport();
      await server.connect(transport);
      console.error('Universal Memory MCP HTTP Client running...');
    }
  };
};

// Run client if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const httpServerUrl = process.env.HTTP_SERVER_URL || 'http://localhost:3020';
  
  const client = createMcpHttpClient(httpServerUrl);
  
  client.run().catch(error => {
    console.error('Failed to start MCP HTTP client:', error);
    process.exit(1);
  });
}