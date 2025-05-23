# Contributing to Universal Memory MCP

Thank you for your interest in contributing! This project aims to solve the context fragmentation problem across AI development tools.

## Development Setup

1. **Fork and clone the repository:**

```bash
git clone https://github.com/oozeorb/universal-memory-mcp.git
cd universal-memory-mcp
```

2. **Install dependencies:**

```bash
npm install
```

3. **Build TypeScript:**

```bash
npm run build
```

4. **Install Ollama and model:**

```bash
curl -fsSL https://ollama.ai/install.sh | sh
ollama pull llama3.1:8b
```

5. **Run tests:**

```bash
npm test
```

## Project Structure

```
universal-memory-mcp/
├── src/
│   ├── index.ts           # Main MCP server
│   ├── memory-store.ts    # SQLite storage layer
│   ├── ollama-client.ts   # AI processing client
│   ├── types.ts           # TypeScript type definitions
│   └── utils.ts           # Utility functions
├── dist/                  # Compiled JavaScript output
├── config/
│   └── default.json       # Default configuration
├── examples/
│   ├── claude-desktop-config.json
│   └── usage-examples.md
├── docs/
│   └── installation.md
├── test.ts               # Test runner
├── tsconfig.json         # TypeScript configuration
└── install.sh           # Installation script
```

## How to Contribute

### 1. Bug Reports

- Use GitHub Issues with the "bug" label
- Include your OS, Node.js version, and Ollama version
- Provide reproduction steps and error messages
- Include relevant configuration (remove sensitive data)

### 2. Feature Requests

- Use GitHub Issues with the "enhancement" label
- Describe the problem you're trying to solve
- Explain how it would improve cross-tool memory sharing
- Consider backward compatibility with existing MCP clients

### 3. Code Contributions

#### Before You Start

- Check existing issues and PRs to avoid duplication
- For large features, create an issue to discuss the approach
- Follow the existing code style and patterns

#### Development Guidelines

**Code Style:**

- Use TypeScript with strict type checking
- Follow ESLint rules defined in .eslintrc.js
- Use ES6+ modules (import/export)
- Follow camelCase for variables and functions
- Use descriptive variable names
- Add JSDoc comments for public functions
- Handle errors gracefully with meaningful messages
- Use proper TypeScript types and interfaces

**Testing:**

- Test your changes with `npm test`
- Verify compatibility with Claude Desktop
- Test with different Ollama models if relevant
- Include edge case handling

**Memory Storage:**

- All database operations should be async
- Handle SQLite errors gracefully
- Maintain backward compatibility with existing databases
- Consider performance impact of new queries

**Ollama Integration:**

- Always handle API failures gracefully
- Provide fallback behavior when AI processing fails
- Test with different model sizes
- Consider timeout handling for slow models

#### Pull Request Process

1. **Create a feature branch:**

```bash
git checkout -b feature/your-feature-name
```

2. **Make your changes:**

- Follow the coding guidelines above
- Add tests for new functionality
- Update documentation if needed

3. **Test thoroughly:**

```bash
npm run build
npm test
# Test with Claude Desktop
# Test with different configurations
```

4. **Commit with clear messages:**

```bash
git commit -m "feat: add semantic search with embeddings"
git commit -m "fix: handle database connection failures"
git commit -m "docs: update installation guide for Windows"
```

5. **Push and create PR:**

```bash
git push origin feature/your-feature-name
```

Create a pull request with:

- Clear description of the changes
- Why the change is needed
- How to test the changes
- Any breaking changes or migration notes

## Areas for Contribution

### High Priority

- **Windows and Linux support**: Test and fix platform-specific issues
- **Better error handling**: Improve error messages and recovery
- **Performance optimization**: Optimize database queries and AI processing
- **Protocol compatibility**: Support newer MCP protocol versions

### Medium Priority

- **Additional storage backends**: PostgreSQL, MongoDB, cloud storage
- **Memory import/export**: Backup and migration tools
- **Advanced search**: Better semantic search algorithms
- **Memory visualization**: Tools to explore and manage memories

### Documentation

- **Integration guides**: For Cursor, other MCP clients
- **Video tutorials**: Setup and usage demonstrations
- **API documentation**: Detailed tool documentation
- **Best practices**: Memory organization strategies

## Testing

### Manual Testing Checklist

- [ ] Server starts without errors
- [ ] Ollama connection works
- [ ] Database initializes correctly
- [ ] Memory CRUD operations work
- [ ] AI extraction functions properly
- [ ] Search returns relevant results
- [ ] Works with Claude Desktop
- [ ] Configuration changes take effect

### Automated Testing

We need help building a comprehensive test suite:

- Unit tests for core functions
- Integration tests with Ollama
- Database operation tests
- MCP protocol compliance tests

## Release Process

1. **Version bump** in package.json
2. **Update changelog** with new features and fixes
3. **Test installation** script and documentation
4. **Tag release** and create GitHub release
5. **Update examples** if API changes

## Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Help others learn and grow
- Assume good intentions

## Questions?

- Create a GitHub Issue for questions
- Check existing documentation first
- Be specific about your use case
- Include relevant system information

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

**Let's build the best cross-platform AI memory system together!**
