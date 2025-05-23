#!/usr/bin/env node

import { createMemoryStore } from './memory-store.js';
import { createOllamaClient } from './ollama-client.js'; 
import { loadConfig } from './utils.js';

async function testHttpBridge() {
  console.log('🧪 Testing HTTP Bridge Core Functionality...\n');

  try {
    // Initialize components
    const config = loadConfig();
    const memoryStore = createMemoryStore(config.memoryStorage);
    const ollama = createOllamaClient(config.ollamaUrl, config.ollamaModel);
    
    await memoryStore.initialize();
    console.log('✅ Memory store initialized');

    // Test Ollama connection (non-fatal)
    try {
      await ollama.testConnection();
      console.log('✅ Ollama connected successfully');
    } catch (error) {
      console.log('⚠️  Ollama not available. AI features disabled.');
    }

    // Test adding a memory
    const testMemory = await memoryStore.addMemory({
      content: 'HTTP Bridge test memory',
      context: 'testing',
      importance: 8,
      timestamp: new Date().toISOString(),
      source: 'manual',
      project: 'http-bridge-test'
    });
    console.log('✅ Memory added via HTTP bridge core');

    // Test adding a todo
    const testTodo = await memoryStore.addTodo({
      content: 'Test HTTP bridge todo functionality',
      status: 'pending',
      priority: 'high',
      project: 'http-bridge-test',
      context: 'testing',
      tags: ['test', 'bridge'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    console.log('✅ Todo added via HTTP bridge core');

    // Test searching
    const memories = await memoryStore.searchMemories('HTTP Bridge', { limit: 5 });
    console.log(`✅ Memory search successful: Found ${memories.length} results`);

    const todos = await memoryStore.listTodos({ project: 'http-bridge-test' });
    console.log(`✅ Todo listing successful: Found ${todos.length} todos`);

    // Cleanup
    await memoryStore.deleteMemory(testMemory.id);
    await memoryStore.deleteTodo(testTodo.id);
    await memoryStore.close();

    console.log('\n🎉 HTTP Bridge core functionality works perfectly!');
    console.log('Ready to implement HTTP server with Express...');

  } catch (error) {
    console.error('❌ Test failed:', (error as Error).message);
    process.exit(1);
  }
}

testHttpBridge();