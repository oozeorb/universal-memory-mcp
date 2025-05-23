# Configuration Guide

This guide covers all configuration options for Universal Memory MCP running in Docker.

## Docker Configuration (Recommended)

The Docker setup uses environment variables and the built-in configuration. The main configuration is handled automatically.

### Docker Compose Configuration

Location: `docker-compose.yml`

```yaml
services:
  ollama:
    image: ollama/ollama:latest
    container_name: ollama
    ports:
      - "11434:11434"
    volumes:
      - ollama_data:/root/.ollama
    restart: unless-stopped
    networks:
      - memory-bridge

  universal-memory-mcp:
    build: .
    container_name: universal-memory-mcp
    ports:
      - "3020:3020"
    volumes:
      - ./data:/app/data
      - ./config:/app/config:ro
    environment:
      - NODE_ENV=production
      - OLLAMA_URL=http://ollama:11434
      - OLLAMA_MODEL=llama3.1:8b
      - MEMORY_STORAGE_PATH=/app/data/universal-memories.db
    restart: unless-stopped
    depends_on:
      - ollama
    networks:
      - memory-bridge

volumes:
  ollama_data:

networks:
  memory-bridge:
    driver: bridge
```

### Environment Variables

You can customize the Docker setup using environment variables:

```bash
# .env file (create in project root)
OLLAMA_MODEL=llama3.1:8b
MCP_PORT=3020
MEMORY_DB_PATH=./data/universal-memories.db
NODE_ENV=production
```

### Built-in Configuration

Location: `config/default.json` (used inside container)

```json
{
  "ollamaModel": "llama3.1:8b",
  "ollamaUrl": "http://ollama:11434",
  "memoryStorage": {
    "type": "sqlite",
    "path": "/app/data/universal-memories.db"
  },
  "mcpProtocolVersion": "2024-11-05",
  "processing": {
    "autoExtract": true,
    "deduplication": true,
    "maxMemoriesPerQuery": 10,
    "similarityThreshold": 0.8
  },
  "logging": {
    "level": "info",
    "file": "/app/data/universal-memory-mcp.log"
  }
}
```

## Configuration Options

### Ollama Settings

#### `ollamaModel`
**Type**: String  
**Default**: `"llama3.1:8b"`  
**Description**: The Ollama model to use for AI processing

**Options by performance:**
- `"qwen2.5:0.5b"` - Fastest, basic quality (0.4GB)
- `"llama3.2:1b"` - Fast, good quality (1.3GB)
- `"llama3.1:8b"` - Balanced, excellent quality (4.7GB)
- `"qwen2.5:32b"` - Slow, superior quality (19GB)
- `"llama3.1:70b"` - Slowest, maximum quality (40GB)

#### `ollamaUrl`
**Type**: String  
**Default**: `"http://localhost:11434"`  
**Description**: URL of your Ollama server

**Examples:**
```json
"ollamaUrl": "http://localhost:11434"     // Local installation
"ollamaUrl": "http://192.168.1.100:11434" // Remote Ollama server
```

### Memory Storage

#### `memoryStorage.type`
**Type**: String  
**Default**: `"sqlite"`  
**Description**: Storage backend type

**Current options:**
- `"sqlite"` - Local SQLite database (recommended)

**Future options:**
- `"postgresql"` - PostgreSQL database
- `"mongodb"` - MongoDB collection
- `"file"` - Simple JSON files

#### `memoryStorage.path`
**Type**: String  
**Default**: `"~/universal-memories.db"`  
**Description**: Location of the memory database

**Path resolution:**
- `~/path` - Expands to home directory
- `/absolute/path` - Absolute path
- `relative/path` - Relative to project directory

**Examples:**
```json
"path": "~/memories/universal.db"           // Home directory
"path": "/var/lib/universal-memory/db"      // System location
"path": "./data/memories.db"                // Project relative
"path": "/Volumes/External/memories.db"     // External drive
```

### MCP Protocol

#### `mcpProtocolVersion`
**Type**: String  
**Default**: `"2024-11-05"`  
**Description**: MCP protocol version for compatibility

**Available versions:**
- `"2024-11-05"` - Legacy version (Claude Desktop compatible)
- `"2025-03-26"` - Modern version (Windsurf compatible)

### Processing Settings

#### `processing.autoExtract`
**Type**: Boolean  
**Default**: `true`  
**Description**: Automatically enhance memories using AI

When enabled, memories are processed through Ollama to:
- Improve clarity and searchability
- Extract additional context
- Standardize format

#### `processing.deduplication`
**Type**: Boolean  
**Default**: `true`  
**Description**: Prevent duplicate memories

When enabled:
- Similar memories are merged
- Importance levels are combined
- Storage space is optimized

#### `processing.maxMemoriesPerQuery`
**Type**: Number  
**Default**: `10`  
**Description**: Maximum memories returned in search results

**Recommendations:**
- `5` - Fast responses, focused results
- `10` - Balanced performance
- `20` - Comprehensive results, slower
- `50` - Deep searches, may be overwhelming

#### `processing.similarityThreshold`
**Type**: Number (0.0 - 1.0)  
**Default**: `0.8`  
**Description**: Minimum similarity for deduplication and search

**Values:**
- `0.9` - Very strict, only near-identical matches
- `0.8` - Strict, high-confidence matches
- `0.7` - Moderate, good balance
- `0.5` - Loose, more results but less relevant
- `0.3` - Very loose, many results

### Logging

#### `logging.level`
**Type**: String  
**Default**: `"info"`  
**Description**: Logging verbosity level

**Levels:**
- `"error"` - Only errors
- `"warn"` - Warnings and errors
- `"info"` - General information
- `"debug"` - Detailed debugging information

#### `logging.file`
**Type**: String  
**Default**: `"~/universal-memory-mcp.log"`  
**Description**: Log file location

Set to `null` to disable file logging.

## Environment-Specific Configurations

### Development Environment
```json
{
  "ollamaModel": "llama3.2:1b",
  "processing": {
    "autoExtract": false,
    "maxMemoriesPerQuery": 5
  },
  "logging": {
    "level": "debug",
    "file": "./dev.log"
  }
}
```

### Production Environment
```json
{
  "ollamaModel": "llama3.1:8b",
  "memoryStorage": {
    "path": "/var/lib/universal-memory/production.db"
  },
  "processing": {
    "autoExtract": true,
    "deduplication": true,
    "maxMemoriesPerQuery": 10
  },
  "logging": {
    "level": "warn",
    "file": "/var/log/universal-memory.log"
  }
}
```

### High-Performance Environment (M3 MacBook Pro)
```json
{
  "ollamaModel": "llama3.1:70b",
  "processing": {
    "autoExtract": true,
    "deduplication": true,
    "maxMemoriesPerQuery": 20,
    "similarityThreshold": 0.9
  },
  "logging": {
    "level": "info"
  }
}
```

### Resource-Constrained Environment
```json
{
  "ollamaModel": "qwen2.5:0.5b",
  "processing": {
    "autoExtract": false,
    "deduplication": false,
    "maxMemoriesPerQuery": 5,
    "similarityThreshold": 0.7
  },
  "logging": {
    "level": "error"
  }
}
```

## MCP Client Configurations

### Claude Desktop
Location: `~/Library/Application Support/Claude/claude_desktop_config.json`

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

### Windsurf
Add to your Windsurf MCP configuration:

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

### Multiple Instances
Run separate instances for different projects:

```json
{
  "mcpServers": {
    "work-memory": {
      "command": "node",
      "args": ["/path/to/universal-memory-mcp/dist/index.js"],
      "env": {
        "CONFIG_PATH": "/Users/username/.config/work-memory.json"
      }
    },
    "personal-memory": {
      "command": "node",
      "args": ["/path/to/universal-memory-mcp/dist/index.js"],
      "env": {
        "CONFIG_PATH": "/Users/username/.config/personal-memory.json"
      }
    }
  }
}
```

## Advanced Configuration

### Custom Model Endpoints
For custom Ollama setups:

```json
{
  "ollamaUrl": "http://gpu-server:11434",
  "ollamaModel": "custom-finetuned-model"
}
```

### Database Optimization
For large memory databases:

```json
{
  "memoryStorage": {
    "type": "sqlite",
    "path": "~/memories.db",
    "options": {
      "busyTimeout": 30000,
      "journalMode": "WAL",
      "synchronous": "NORMAL"
    }
  }
}
```

### Memory Organization
Predefined contexts for better organization:

```json
{
  "processing": {
    "defaultContexts": [
      "work-project-alpha",
      "work-project-beta", 
      "personal-coding",
      "learning-ai",
      "meeting-notes",
      "architecture-decisions"
    ]
  }
}
```

## Configuration Validation

The system validates configuration on startup:
- Checks if Ollama is accessible
- Verifies model availability
- Tests database connectivity
- Validates file paths and permissions

Invalid configurations will show helpful error messages with suggestions for fixes.

## Dynamic Configuration

Some settings can be modified at runtime through environment variables:

```bash
export OLLAMA_MODEL="llama3.2:1b"
export MEMORY_DB_PATH="~/test-memories.db"
export LOG_LEVEL="debug"

node src/index.js
```

This is useful for testing different configurations without modifying files.
