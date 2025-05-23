# Universal Memory MCP Usage Examples

## Basic Memory Operations

### Adding Memories Manually
```
Use the add_memory tool to store important facts:

Tool: add_memory
Content: "I prefer using React with TypeScript for frontend projects"
Context: "coding-preferences"
Importance: 8
```

### Searching for Relevant Memories
```
Use the search_memories tool to find related information:

Tool: search_memories
Query: "React TypeScript preferences"
Limit: 5
Context: "coding-preferences"
```

### Getting Recent Memories
```
Use the get_memories tool to see what you've stored:

Tool: get_memories
Context: "current-project"
Limit: 10
Since: "2024-01-01T00:00:00.000Z"
```

## Advanced Usage

### Auto-Extracting from Conversations
```
Use the extract_memories tool on meeting notes or long conversations:

Tool: extract_memories
Text: "In today's meeting, we decided to use PostgreSQL for the database, deploy on AWS ECS, and set the project deadline for March 15th. John will handle the API design, and Sarah will work on the frontend. We agreed to use Tailwind CSS for styling."
Context: "project-alpha-meeting"
```

This will automatically extract multiple memories:
- Database choice: PostgreSQL
- Deployment platform: AWS ECS  
- Project deadline: March 15th
- Team assignments: John (API), Sarah (frontend)
- Styling framework: Tailwind CSS

### Context-Based Organization
Organize your memories by context for better retrieval:

- `coding-preferences` - Your coding style and tool preferences
- `project-alpha` - Everything related to Project Alpha
- `meeting-notes` - Important decisions from meetings
- `personal-info` - Personal preferences and information
- `architecture-decisions` - Technical architecture choices

## Integration Patterns

### Cross-Tool Workflow Example

1. **Morning in ChatGPT**: Brainstorm API design
   - Memories stored: API endpoints, data models, authentication approach

2. **Afternoon in Windsurf**: Start implementing
   - Search for API design memories
   - Code with context of previous decisions

3. **Evening in Claude Desktop**: Document the API
   - Retrieve all project-related memories
   - Write documentation with full context

### Best Practices

1. **Use descriptive contexts**: Instead of "work", use "project-name" or "client-name"
2. **Set appropriate importance levels**: 1-3 for minor details, 7-10 for critical decisions
3. **Regular extraction**: Use extract_memories on meeting notes and important conversations
4. **Search before asking**: Check existing memories before asking the AI to re-explain concepts

## Memory Management

### Cleaning Up Old Memories
```
Tool: get_memories
Context: "old-project"
Limit: 50

# Review the returned memories and delete irrelevant ones:
Tool: delete_memory
ID: "memory-id-here"
```

### Backing Up Your Memories
Your memories are stored in: `~/universal-memories.db`

Create regular backups:
```bash
cp ~/universal-memories.db ~/Backups/memories-$(date +%Y%m%d).db
```

## Troubleshooting

### If memories aren't being found:
1. Check your search terms - try different keywords
2. Verify the context matches what you used when storing
3. Lower the similarity threshold in config if needed

### If Ollama isn't working:
1. Ensure Ollama is running: `ollama serve`
2. Check if your model is available: `ollama list`
3. Pull the model if needed: `ollama pull llama3.1:8b`

### If Claude Desktop shows "Server disconnected":
1. Check that Node.js is installed and accessible
2. Verify the path to index.js in your config
3. Look at the MCP server logs for error messages
