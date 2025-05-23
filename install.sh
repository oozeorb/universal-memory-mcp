#!/bin/bash

# Universal Memory MCP Installation Script

set -e

echo "🧠 Universal Memory MCP Installation"
echo "=================================="

# Get current user and setup paths
CURRENT_USER=$(whoami)
CURRENT_DIR=$(pwd)
GITHUB_URL="https://github.com/oozeorb/universal-memory-mcp"

echo "👤 Installing for user: $CURRENT_USER"
echo "📁 Project directory: $CURRENT_DIR"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first:"
    echo "   https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'.' -f1 | sed 's/v//')
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js 18+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"

# Check if TypeScript is available globally (install if needed)
if ! command -v tsc &> /dev/null; then
    echo "📦 Installing TypeScript globally..."
    npm install -g typescript
fi

echo "✅ TypeScript ready"

# Detect OS and install Ollama if needed
OS="$(uname -s)"
case "${OS}" in
    Linux*)     MACHINE=Linux;;
    Darwin*)    MACHINE=Mac;;
    *)          MACHINE="UNKNOWN:${OS}"
esac

if ! command -v ollama &> /dev/null; then
    echo "❌ Ollama is not installed. Installing Ollama..."
    
    if [[ "$MACHINE" == "Mac" ]]; then
        # Check if Homebrew is available
        if command -v brew &> /dev/null; then
            echo "🍺 Installing Ollama via Homebrew..."
            brew install ollama
            echo "🚀 Starting Ollama service..."
            brew services start ollama
            # Wait for Ollama to start
            sleep 3
        else
            echo "❌ Homebrew not found. Please install Homebrew first:"
            echo "   /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
            echo "   Then run this installer again."
            exit 1
        fi
    elif [[ "$MACHINE" == "Linux" ]]; then
        echo "🐧 Installing Ollama for Linux..."
        curl -fsSL https://ollama.ai/install.sh | sh
    else
        echo "❌ Unsupported operating system: $MACHINE"
        echo "   Please install Ollama manually from https://ollama.ai"
        exit 1
    fi
else
    echo "✅ Ollama detected"
    
    # Ensure Ollama service is running on macOS
    if [[ "$MACHINE" == "Mac" ]] && command -v brew &> /dev/null; then
        if ! brew services list | grep -q "ollama.*started"; then
            echo "🚀 Starting Ollama service..."
            brew services start ollama
            sleep 3
        fi
    fi
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build TypeScript
echo "🔨 Building TypeScript..."
npm run build

# Pull Ollama model
echo "🤖 Pulling Ollama model (this may take a few minutes)..."

# Wait for Ollama service to be ready
echo "⏳ Waiting for Ollama service to be ready..."
for i in {1..10}; do
    if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
        echo "✅ Ollama service is ready"
        break
    fi
    echo "   Attempt $i/10: Waiting for Ollama..."
    sleep 2
done

# Check if Ollama is responsive
if ! curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    echo "❌ Ollama service is not responding. Please check your installation."
    echo "   Try running: brew services restart ollama"
    exit 1
fi

ollama pull llama3.1:8b

# Test the server
echo "🧪 Testing the server..."
npm test

echo ""
echo "🎉 Installation complete!"
echo ""
echo "Next steps:"
echo "1. Add this to your Claude Desktop config:"
echo "   File: ~/Library/Application Support/Claude/claude_desktop_config.json"
echo ""
echo "   {"
echo "     \"mcpServers\": {"
echo "       \"universal-memory\": {"
echo "         \"command\": \"node\","
echo "         \"args\": [\"$CURRENT_DIR/dist/index.js\"]"
echo "       }"
echo "     }"
echo "   }"
echo ""
echo "2. Restart Claude Desktop"
echo "3. Start using memory tools in your conversations!"
echo ""
echo "📚 See examples/usage-examples.md for how to use the memory system"
echo "🔧 Edit config/default.json to customize settings"
echo "🌐 Project repository: $GITHUB_URL"
echo ""
echo "🚀 Your AI tools will now remember everything across sessions!"
