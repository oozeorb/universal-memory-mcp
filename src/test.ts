#!/usr/bin/env node

import { createMemoryStore } from './memory-store.js';
import { createOllamaClient } from './ollama-client.js';
import { loadConfig } from './utils.js';
import type { MemoryData, ExtractedMemory } from './types.js';

async function runTests(): Promise<void> {
  console.log('🧪 Testing Universal Memory MCP...\\n');

  try {
    // Test config loading
    console.log('1. Testing config loading...');
    const config = loadConfig();
    console.log('✅ Config loaded successfully');
    console.log(`   Model: ${config.ollamaModel}`);
    console.log(`   Storage: ${config.memoryStorage.path}\\n`);

    // Test Ollama connection
    console.log('2. Testing Ollama connection...');
    const ollama = createOllamaClient(config.ollamaUrl, config.ollamaModel);
    await ollama.testConnection();
    console.log('✅ Ollama connection successful\\n');

    // Test memory store
    console.log('3. Testing memory store...');
    const memoryStore = createMemoryStore(config.memoryStorage);
    await memoryStore.initialize();
    console.log('✅ Memory store initialized successfully\\n');

    // Test adding a memory
    console.log('4. Testing memory operations...');
    const testMemoryData: MemoryData = {
      content: 'This is a test memory for the Universal Memory MCP system',
      context: 'testing',
      importance: 8,
      timestamp: new Date().toISOString(),
      source: 'manual',
    };

    const testMemory = await memoryStore.addMemory(testMemoryData);
    console.log('✅ Memory added successfully');
    console.log(`   ID: ${testMemory.id}\\n`);

    // Test searching memories
    const searchResults = await memoryStore.searchMemories('test memory', {
      limit: 5,
      context: 'testing',
    });
    console.log('✅ Memory search successful');
    console.log(`   Found ${searchResults.length} results\\n`);

    // Test memory extraction with Ollama
    console.log('5. Testing AI memory extraction...');
    const extractedMemories = await ollama.extractMemories(
      'I prefer using VS Code for development and I always use dark mode. My favorite programming language is TypeScript.',
      'preferences'
    );
    console.log('✅ Memory extraction successful');
    console.log(`   Extracted ${extractedMemories.length} memories:`);
    extractedMemories.forEach((memory: ExtractedMemory, i: number) => {
      console.log(`   ${i + 1}. ${memory.content} (importance: ${memory.importance})`);
    });

    // Test todo operations
    console.log('6. Testing todo operations...');
    
    // Add a todo
    const testTodo = await memoryStore.addTodo({
      content: 'Test the new todo system',
      status: 'pending',
      priority: 'high',
      project: 'universal-memory-mcp',
      context: 'testing',
      tags: ['test', 'todo'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    console.log('✅ Todo added successfully');
    console.log(`   ID: ${testTodo.id}`);

    // List todos
    const todos = await memoryStore.listTodos({ project: 'universal-memory-mcp' });
    console.log('✅ Todo listing successful');
    console.log(`   Found ${todos.length} todos`);

    // Update todo
    const updatedTodo = await memoryStore.updateTodo(testTodo.id, { status: 'completed' });
    console.log('✅ Todo update successful');
    console.log(`   Status: ${updatedTodo?.status}`);

    // Clean up
    await memoryStore.deleteMemory(testMemory.id);
    await memoryStore.deleteTodo(testTodo.id);
    await memoryStore.close();

    console.log('\\n🎉 All tests passed! The Universal Memory MCP system with todos is ready to use.');
    console.log('\\nNext steps:');
    console.log('1. Add the MCP server to your Claude Desktop config');
    console.log('2. Restart Claude Desktop');
    console.log('3. Start using memory and todo tools in conversations');
    console.log('\\nNew Todo Tools Available:');
    console.log('- add_todo: Create new tasks');
    console.log('- list_todos: View your todo list');
    console.log('- update_todo: Change status/priority');
    console.log('- delete_todo: Remove completed tasks');
  } catch (error) {
    console.error('❌ Test failed:', (error as Error).message);
    console.error('\\nTroubleshooting:');
    console.error('1. Make sure Ollama is running: ollama serve');
    console.error('2. Ensure the model is installed: ollama pull llama3.1:8b');
    console.error('3. Check that all dependencies are installed: npm install');
    process.exit(1);
  }
}

runTests();
