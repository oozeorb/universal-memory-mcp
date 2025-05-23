# Installation Guide

## Prerequisites

### Option 1: Docker (Recommended)
- **Docker Desktop**: Download from [docker.com](https://docker.com)
- **Docker Compose**: Usually included with Docker Desktop

### Option 2: Local Installation
- **Node.js 18+**: Download from [nodejs.org](https://nodejs.org/)
- **Ollama**: AI model runner for local processing

## Quick Installation

### Option 1: Docker Setup (Recommended)

**Complete setup with AI enhancement in under 2 minutes!**

1. **Clone and start:**
```bash
git clone https://github.com/oozeorb/universal-memory-mcp.git
cd universal-memory-mcp
docker compose up -d
```

2. **Verify installation:**
```bash
curl http://localhost:3020/health
```

Should return:
```json
{"status":"healthy","timestamp":"...","tools":13,"version":"1.0.0"}
```

3. **Check containers:**
```bash
docker compose ps
```

Should show:
- `universal-memory-mcp` (healthy)
- `ollama` (running)

**Benefits:**
- No Node.js/Ollama installation needed
- Automatic AI model downloading
- Health checks and auto-restart
- Clean isolation and easy updates

### Option 2: Local Installation

```bash
git clone https://github.com/oozeorb/universal-memory-mcp.git
cd universal-memory-mcp
chmod +x install.sh
./install.sh
```

The install script will:
- Install Ollama (if not present) 
- Install Node.js dependencies
- Pull the required AI model (`llama3.1:8b`)
- Build the project
- Test the installation

## Client Configuration

All AI tools use the same configuration to connect to the Docker container:

### Claude Desktop

**Location**: `~/Library/Application Support/Claude/claude_desktop_config.json`

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

### Windsurf

**Location**: `~/.codeium/windsurf/mcp_config.json`

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

### Claude Code

Add `CLAUDE.md` to your project root (auto-detected):

```markdown
# Universal Memory MCP Configuration

This project uses Universal Memory MCP Docker container.

## MCP Server Configuration
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

Available tools: add_memory, search_memories, get_memories, extract_memories, delete_memory, add_todo, list_todos, update_todo, delete_todo, list_projects, memory_bank_update, export_memory_bank
```

### After Configuration

1. **Update file paths**: Replace `/path/to/universal-memory-mcp` with your actual path
2. **Restart AI tools**: Close and reopen Claude Desktop, Windsurf, etc.
3. **Verify connection**: Look for green dots or successful tool loading
4. **Test functionality**: Try using `add_memory` or `list_todos`

## Verification

### Test the Container

```bash
# Check health
curl http://localhost:3020/health

# Test adding a memory
curl -X POST http://localhost:3020/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "add_memory",
      "arguments": {
        "content": "Installation test successful",
        "importance": 8
      }
    }
  }'

# Test listing memories
curl -X POST http://localhost:3020/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0", 
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "get_memories",
      "arguments": {"limit": 5}
    }
  }'
```

### Test in AI Tools

After restarting your AI tools:

1. **Claude Desktop**: Start a new conversation, look for memory tools
2. **Windsurf**: Check for green MCP dot in status bar
3. **Claude Code**: Open a project with CLAUDE.md, verify tool availability

Try adding a test memory:
- Tool: `add_memory`
- Content: "Installation verification test"
- Context: "setup-testing"

## Docker Management

### Basic Commands

```bash
# Start containers
docker compose up -d

# Stop containers  
docker compose down

# View logs
docker compose logs -f

# Restart specific service
docker compose restart universal-memory-mcp

# Update containers
docker compose pull
docker compose up -d
```

### Customization

Edit `docker-compose.yml` or create `.env` file:

```bash
# .env file
OLLAMA_MODEL=llama3.1:8b
MCP_PORT=3020
MEMORY_DB_PATH=./data/memories.db
```

### Data Persistence

- **Memory database**: Stored in `./data/universal-memories.db`
- **Ollama models**: Stored in Docker volume `ollama_data`
- **Backup**: Copy `./data/` directory

## Troubleshooting

### Docker Issues

**Containers won't start:**
```bash
# Check Docker status
docker --version
docker compose --version

# View detailed logs
docker compose logs universal-memory-mcp
docker compose logs ollama
```

**Port conflicts:**
```bash
# Check what's using port 3020
lsof -i :3020

# Use different port
docker compose down
# Edit docker-compose.yml, change "3020:3020" to "3021:3020"
docker compose up -d
```

**Health check failures:**
```bash
# Check container health
docker compose ps

# Test health endpoint directly
docker exec universal-memory-mcp curl http://localhost:3020/health
```

### Connection Issues

**"Server disconnected" in Claude Desktop:**
- Verify path in configuration is correct
- Check that `mcp-http-client.js` exists
- Restart Claude Desktop after config changes

**"Red dot" in Windsurf:**
- Restart Windsurf after configuration changes
- Check `mcp_config.json` syntax is valid
- Verify HTTP_SERVER_URL is `http://localhost:3020`

**Tools not available in Claude Code:**
- Ensure `CLAUDE.md` is in project root
- Check file syntax and formatting
- Restart Claude Code session

### Performance Issues

**Slow AI processing:**
```bash
# Switch to faster model
docker compose down
# Edit docker-compose.yml: change OLLAMA_MODEL to "llama3.2:1b"  
docker compose up -d
```

**High memory usage:**
```bash
# Check resource usage
docker stats

# Limit container resources in docker-compose.yml:
services:
  universal-memory-mcp:
    deploy:
      resources:
        limits:
          memory: 2G
```

## Updates and Maintenance

### Updating the System

```bash
cd /path/to/universal-memory-mcp
git pull origin main
docker compose down
docker compose build --no-cache
docker compose up -d
```

### Backup and Restore

**Create backup:**
```bash
# Backup memory database
cp ./data/universal-memories.db ./backups/memories-$(date +%Y%m%d).db

# Backup entire data directory  
tar -czf backup-$(date +%Y%m%d).tar.gz ./data/
```

**Restore from backup:**
```bash
cp ./backups/memories-20241201.db ./data/universal-memories.db
docker compose restart universal-memory-mcp
```

### Monitor Health

```bash
# Continuous health monitoring
watch -n 30 'curl -s http://localhost:3020/health | jq'

# Check memory usage
curl -s http://localhost:3020/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "id": 1, "method": "tools/call", "params": {"name": "list_projects", "arguments": {}}}'
```

## Alternative Installation

### Local HTTP Server (Without Docker)

If you prefer running without Docker:

```bash
npm install
npm run build
npm run server
```

Use the same client configuration but server runs locally on your system.

### Direct MCP (Legacy)

For tools that don't support HTTP bridge:

```json
{
  "mcpServers": {
    "universal-memory": {
      "command": "node",
      "args": ["/path/to/universal-memory-mcp/dist/index.js"],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

**Note**: Direct MCP doesn't provide shared state across tools and has lower performance.