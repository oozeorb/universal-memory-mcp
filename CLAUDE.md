# Universal Memory MCP Configuration

This repository uses the Universal Memory MCP server running in Docker containers with full AI enhancement.

## MCP Server Configuration

The MCP server is configured to use the HTTP client pointing to the Docker container:

```json
{
  "mcpServers": {
    "universal-memory": {
      "command": "node",
      "args": ["/path/to/universal-memory-mcp/dist/mcp-http-client.js"],
      "env": {
        "HTTP_SERVER_URL": "http://localhost:3020"
      }
    }
  }
}
```

## Docker Setup

The server runs in Docker with:
- **Universal Memory MCP**: `http://localhost:3020` (✅ Working)
- **Ollama (AI enhancement)**: `http://localhost:11434` (✅ Working)
- **Model**: `llama3.1:8b` (✅ Loaded)

## Available Tools (All ✅ Tested)

### Memory Management
- `add_memory` - Store enhanced memories with AI processing
- `search_memories` - Search with similarity scoring
- `get_memories` - Retrieve formatted memory lists
- `extract_memories` - Auto-extract from text
- `delete_memory` - Remove by ID

### Todo Management  
- `add_todo` - Create todos with tags/projects
- `list_todos` - Display with status emojis
- `update_todo` - Modify status/priority
- `delete_todo` - Remove by ID

### Project Tools
- `list_projects` - Project overview with stats
- `memory_bank_update` - Batch memory operations
- `export_memory_bank` - JSON/CSV/Markdown export

## Usage

Start the Docker containers:
```bash
docker compose up -d
```

The MCP client will automatically connect to the containerized server with full AI enhancement capabilities.