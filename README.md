# Universal Memory MCP

A smart, cross-platform memory server that solves the context fragmentation problem across AI development tools.

## The Problem We're Solving

As developers, we constantly switch between different AI tools throughout our workflow:

- **ChatGPT** for quick questions and brainstorming
- **Claude Desktop** for deep analysis and writing  
- **Windsurf** for coding and project management
- **Cursor** for code editing and refactoring
- **Claude Code** for terminal-based development
- **Figma AI** for design work and prototyping
- **Linear/Notion** for task management and planning

**The frustration:** Each tool lives in isolation. When you switch tools, you lose all context:

- **Project Knowledge Fragmentation** - Your architectural decisions are trapped in one chat
- **Task Context Loss** - Frontend todos in Windsurf, backend tasks in Cursor, design notes in Figma
- **Todo Management Chaos** - Tasks scattered across Linear, Notion, code comments, and AI chat histories
- **Workflow Breakdown** - Planning in Linear, coding in Claude, designing in Figma - no connection
- **Tool-Specific Task Silos** - Frontend tasks in one tool, backend in another, design todos elsewhere
- **Repeated Explanations** - Re-explaining the same project structure in every new tool
- **Decision History Lost** - "Why did we choose this approach?" gets forgotten across conversations
- **Cross-Phase Task Disconnection** - Planning todos don't connect to development tasks
- **Context Reset Hell** - Even opening a new chat in the same tool loses everything
- **Task Status Blindness** - No visibility into what's done/pending across your development stack

## What This Solves

Universal Memory MCP creates a **shared brain** across all your AI tools:

**Persistent Context** - Your project details, coding style, and preferences follow you everywhere  
**Cross-Tool Memory** - Start a conversation in ChatGPT, continue in Windsurf, finish in Claude Desktop  
**Unified Task Management** - Todos, issues, and project tasks accessible across all development tools
**Smart Context Retrieval** - AI automatically recalls relevant past conversations and decisions  
**Cross-Phase Continuity** - Research notes connect to development tasks connect to design decisions
**Intelligent Auto-Tagging** - Automatic repository and project context detection
**No More Re-explaining** - Stop repeating yourself across different tools  
**Local & Private** - All memory processing happens on your machine using Ollama  
**Seamless Integration** - Works with existing MCP-compatible tools without changing your workflow

## Example Workflow

**Planning Phase:**
1. **ChatGPT**: "I want to build a social media app with real-time features"
   - Add memory: Project concept and initial requirements
   - Create todos: "Research WebSocket libraries" and "Design user authentication flow"

**Design Phase:**
2. **Figma AI**: Design the user interface
   - Add memory: Design decisions and component specifications
   - Update todo: "Create responsive layout mockups" → completed

**Development Phase:**
3. **Windsurf**: Start frontend development
   - Recalls design decisions and technical requirements
   - Access todos: "Implement user authentication" (high priority)
   - Add todo: "Connect frontend to WebSocket backend"

4. **Cursor**: Backend API development
   - Remembers the WebSocket architecture from ChatGPT
   - Knows frontend component structure from Figma
   - Update todo: "Implement WebSocket authentication" → in progress

**Documentation Phase:**
5. **Claude Desktop**: Write technical documentation
   - Automatically recalls all architectural decisions
   - Knows completed features from todo history
   - Documents the journey from concept to implementation

**Maintenance Phase:**
6. **Claude Code**: Debug production issues
   - Full context of design decisions and implementation details
   - Access to complete project evolution and decision history

**No context switching fatigue. No repetitive explanations. No lost todos. Just continuous, intelligent assistance across your entire development workflow.**

## How It Works

```
Your Conversation → Ollama (local AI) → Extract Key Facts → Shared Memory File
     ↓
All Your AI Tools ← Smart Context Retrieval ← Semantic Search ← Memory Database
```

- **File-based storage** enables sharing across any MCP-compatible tool
- **Local Ollama processing** keeps everything private and fast
- **Protocol compatibility** works with both legacy and modern MCP versions
- **Intelligent extraction** captures what matters, ignores the noise

## Features

- **Cross-Platform Compatibility** - Works with Claude Desktop, Windsurf, Claude Code, and future MCP clients
- **Local AI Processing** - Uses Ollama for intelligent memory extraction and search (no API costs)
- **Protocol Bridge** - Handles both legacy (2024-11-05) and modern MCP protocol versions
- **Shared Storage** - File-based memory sharing across all your AI tools
- **Privacy First** - All processing happens locally, no data sent to external APIs
- **Configurable Models** - From tiny (0.5B) to powerful (70B) Ollama models
- **Smart Features** - Memory deduplication, semantic search, and contextual retrieval

## Quick Start

### Prerequisites

- Docker and Docker Compose (recommended)
- OR Node.js 18+ for local installation

### Installation

#### Option 1: Docker Setup (Recommended)

**Complete setup with AI enhancement in under 2 minutes!**

```bash
git clone https://github.com/oozeorb/universal-memory-mcp.git
cd universal-memory-mcp
docker compose up -d
```

This automatically:
- Sets up Universal Memory MCP server on `http://localhost:3020`
- Installs and configures Ollama with `llama3.1:8b` model
- Provides full AI enhancement capabilities
- Includes health checks and auto-restart
- Isolates dependencies (no Node.js conflicts)

**Verify installation:**
```bash
curl http://localhost:3020/health
```

#### Option 2: Local Installation

```bash
git clone https://github.com/oozeorb/universal-memory-mcp.git
cd universal-memory-mcp
./install.sh
```

The install script will automatically:
- Detect your operating system (macOS/Linux)
- Install Ollama and pull the AI model
- Install project dependencies and build
- Test the installation

## Client Configuration

All AI tools use the same configuration to connect to the Docker container:

### Universal Configuration (All Clients)

**Claude Desktop** (`~/Library/Application Support/Claude/claude_desktop_config.json`):
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

**Windsurf** (`~/.codeium/windsurf/mcp_config.json`):
```json
{
  "mcpServers": {
    "universal-memory": {
      "command": "node",
      "args": ["/path/to/universal-memory-mcp/dist/mcp-http-client.js"],
      "env": {
        "HTTP_SERVER_URL": "http://localhost:3020"
      },
      "disabled": false
    }
  }
}
```

**Claude Code**: Add `CLAUDE.md` to your project root (auto-detected):
```markdown
# MCP Configuration
Uses Universal Memory MCP Docker container at http://localhost:3020
```

### After Configuration

1. **Restart your AI tools** to pick up the new configuration
2. **Verify connection**: Look for green dots or successful tool loading
3. **Test functionality**: Try adding a memory or todo

## Available Tools

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

## Alternative Deployment

### Local HTTP Server (Without Docker)

If you prefer running without Docker:

```bash
npm run server
```

Server runs on `http://localhost:3020` - use same client configuration above.

### Direct MCP (Legacy)

For tools that don't support HTTP bridge, use direct MCP connection:

### Configuration

1. **Optional: Configure environment variables:**

Copy `.env.example` to `.env` and customize as needed:

```bash
cp .env.example .env
# Edit .env with your preferred settings
```

Available environment variables:

- `OLLAMA_URL` - Ollama server URL (default: http://localhost:11434)
- `OLLAMA_MODEL` - Ollama model to use (default: llama3.1:8b)
- `PROJECT_PATH` - Project directory path (auto-detected if not specified)
- `GITHUB_REPO_URL` - Your repository URL for programmatic access

2. **Configure your MCP clients:**

**Claude Desktop** (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "memory": {
      "command": "node",
      "args": ["/path/to/universal-memory-mcp/dist/index.js"]
    }
  }
}
```

> 💡 **Path Setup**: Replace `/path/to/universal-memory-mcp` with your actual clone location. You can find it by running `pwd` in the project directory after cloning.

**Windsurf** - Add to your MCP settings:
```json
{
  "mcpServers": {
    "universal-memory": {
      "command": "node",
      "args": ["/path/to/universal-memory-mcp/dist/index.js"]
    }
  }
}
```

**Cursor IDE** - Add to your `.cursorrules` or settings:
```json
{
  "mcp": {
    "servers": {
      "universal-memory": {
        "command": "node",
        "args": ["/path/to/universal-memory-mcp/dist/index.js"]
      }
    }
  }
}
```

**Continue.dev** (VS Code) - Add to your `config.json`:
```json
{
  "mcpServers": {
    "universal-memory": {
      "command": "node",
      "args": ["/path/to/universal-memory-mcp/dist/index.js"]
    }
  }
}
```

> 📝 **Platform Paths**: On Windows use `%APPDATA%/Claude/claude_desktop_config.json`, on Linux use `~/.config/claude/claude_desktop_config.json`

3. **Start using it:**

Restart your MCP-compatible clients and start using the memory tools!

## Available Tools

### Core Memory Tools

- **`add_memory`** - Store a new memory or fact for future reference

  - Supports project organization, categories, and tags
  - Optional importance scoring (1-10)
  - Automatic content enhancement via local AI

- **`search_memories`** - Search for relevant memories based on query

  - Semantic search with similarity scoring
  - Context and project filtering
  - Configurable result limits

- **`get_memories`** - Get recent memories or all memories for a context

  - Filter by context, project, or timeframe
  - Chronological and importance-based sorting

- **`extract_memories`** - Extract and store important facts from conversation/text

  - Automatic fact extraction using local AI
  - Intelligent content parsing and organization

- **`delete_memory`** - Delete a specific memory by ID
  - Safe deletion with confirmation

### Todo Management Tools

- **`add_todo`** - Create new todo items with priority and organization
  - Status tracking: pending, in_progress, completed
  - Priority levels: low, medium, high  
  - Project and context organization
  - Tag support for categorization

- **`list_todos`** - View and filter your todo list
  - Filter by status, priority, project, or context
  - Clean formatting with emojis and timestamps
  - Configurable result limits

- **`update_todo`** - Update existing todos
  - Change status, priority, content, or organization
  - Track progress across all MCP clients

- **`delete_todo`** - Remove completed or obsolete todos
  - Clean up your task list efficiently

### Project Management Tools

- **`list_projects`** - Show all projects with memories

  - Overview of memory counts per project
  - Category summaries and last updated timestamps

- **`list_project_files`** - Show memory categories for a project

  - Organized view of project structure
  - Category-based memory organization

- **`memory_bank_update`** - Structured updates to project memories

  - Batch import of project-related memories
  - Support for categorization and tagging
  - Transaction-based updates for data integrity

- **`export_memory_bank`** - Export memories in different formats
  - **JSON**: Machine-readable structured export
  - **Markdown**: Human-readable documentation format
  - **CSV**: Spreadsheet-compatible data export
  - Project and category filtering options

### Usage Examples

```bash
# Add a memory with project organization
add_memory({
  "content": "The user prefers TypeScript for new projects",
  "project": "coding-preferences",
  "category": "languages",
  "importance": 8,
  "tags": ["typescript", "preferences"]
})

# Bulk update project memories
memory_bank_update({
  "project": "my-app",
  "category": "architecture",
  "memories": [
    {"content": "Using React with Vite for frontend"},
    {"content": "Node.js with Express for backend API", "importance": 9}
  ]
})

# Export project documentation
export_memory_bank({
  "project": "my-app",
  "format": "markdown"
})
```

## Configuration

Edit `config/default.json` to customize:

- Ollama model selection
- Memory storage location
- Processing preferences
- Protocol version compatibility

## Troubleshooting

### macOS Issues

**Ollama not starting:**
```bash
# Restart Ollama service
brew services restart ollama

# Check if Ollama is running
brew services list | grep ollama

# Test Ollama API
curl http://localhost:11434/api/tags
```

**Permission issues:**
```bash
# Make sure install script is executable
chmod +x install.sh

# Check Node.js permissions
sudo npm cache clean --force
```

**Model download issues:**
```bash
# Check available disk space (models are large)
df -h

# Manually pull the model
ollama pull llama3.1:8b

# List installed models
ollama list
```

### General Issues

**Memory server not responding:**
```bash
# Test the server
npm test

# Check if Node.js version is 18+
node --version

# Rebuild if needed
npm run clean && npm run build
```

**MCP connection issues:**
- Restart your AI client (Claude Desktop, etc.)
- Verify the path in your MCP configuration is correct
- Check that the server builds successfully with `npm run build`

## Examples

See the `examples/` directory for:

- Configuration files for different MCP clients
- Usage examples and common patterns
- Integration guides

## Development

```bash
# Run in development mode
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT License - see [LICENSE](LICENSE) for details.

---

**Finally, AI tools that remember who you are and what you're working on!**
