import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import type {
  StorageConfig,
  MemoryData,
  StoredMemory,
  SearchOptions,
  GetMemoriesOptions,
  MemoryStats,
  ProjectMemoryStats,
  MemoryBankExport,
  TodoData,
  StoredTodo,
  ListTodosArgs,
} from './types.js';

// Handle SQLite3 import issues
const sqlite = sqlite3.verbose();

// Types for the functional memory store
export type MemoryStore = {
  initialize(): Promise<void>;
  addMemory(memoryData: MemoryData): Promise<StoredMemory>;
  searchMemories(
    query: string,
    options?: SearchOptions
  ): Promise<(StoredMemory & { similarity: number })[]>;
  getMemories(options?: GetMemoriesOptions): Promise<StoredMemory[]>;
  deleteMemory(id: string): Promise<boolean>;
  getMemoryById(id: string): Promise<StoredMemory | null>;
  getStats(): Promise<MemoryStats>;
  listProjects(): Promise<ProjectMemoryStats[]>;
  listProjectFiles(project: string): Promise<string[]>;
  updateMemoryBank(
    project: string,
    category: string | undefined,
    memories: Array<{ content: string; importance?: number; tags?: string[] }>
  ): Promise<void>;
  exportMemoryBank(
    project?: string,
    category?: string,
    format?: 'json' | 'markdown' | 'csv'
  ): Promise<MemoryBankExport>;
  
  // Todo operations
  addTodo(todoData: TodoData): Promise<StoredTodo>;
  listTodos(options?: ListTodosArgs): Promise<StoredTodo[]>;
  updateTodo(id: string, updates: Partial<TodoData>): Promise<StoredTodo | null>;
  deleteTodo(id: string): Promise<boolean>;
  getTodoById(id: string): Promise<StoredTodo | null>;
  
  close(): Promise<void>;
};

// Utility functions
const resolvePath = (configPath: string): string => {
  if (configPath.startsWith('~/')) {
    return path.join(os.homedir(), configPath.slice(2));
  }
  if (path.isAbsolute(configPath)) {
    return configPath;
  }
  return path.resolve(process.cwd(), configPath);
};

const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 11);
};

const calculateTextSimilarity = (text1: string, text2: string): number => {
  // Improved similarity that favors query word matches
  const query = text1.toLowerCase().split(/\s+/);
  const content = text2.toLowerCase().split(/\s+/);
  
  let matches = 0;
  for (const queryWord of query) {
    if (content.some(contentWord => contentWord.includes(queryWord) || queryWord.includes(contentWord))) {
      matches++;
    }
  }
  
  // Return ratio of query words found (more generous for search)
  return query.length > 0 ? matches / query.length : 0;
};

const createTables = async (db: Database): Promise<void> => {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS memories (
      id TEXT PRIMARY KEY,
      content TEXT NOT NULL,
      original_content TEXT,
      context TEXT NOT NULL DEFAULT 'general',
      importance INTEGER DEFAULT 5,
      timestamp TEXT NOT NULL,
      source TEXT DEFAULT 'manual',
      project TEXT,
      category TEXT,
      tags TEXT,
      embedding TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_context ON memories(context);
    CREATE INDEX IF NOT EXISTS idx_timestamp ON memories(timestamp);
    CREATE INDEX IF NOT EXISTS idx_importance ON memories(importance);
    CREATE INDEX IF NOT EXISTS idx_source ON memories(source);

    CREATE TABLE IF NOT EXISTS todos (
      id TEXT PRIMARY KEY,
      content TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      priority TEXT NOT NULL DEFAULT 'medium',
      project TEXT,
      context TEXT,
      tags TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_todo_status ON todos(status);
    CREATE INDEX IF NOT EXISTS idx_todo_priority ON todos(priority);
    CREATE INDEX IF NOT EXISTS idx_todo_project ON todos(project);
    CREATE INDEX IF NOT EXISTS idx_todo_context ON todos(context);
    CREATE INDEX IF NOT EXISTS idx_project ON memories(project);
    CREATE INDEX IF NOT EXISTS idx_category ON memories(category);

    CREATE TABLE IF NOT EXISTS memory_metadata (
      memory_id TEXT,
      key TEXT,
      value TEXT,
      FOREIGN KEY(memory_id) REFERENCES memories(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_metadata_memory ON memory_metadata(memory_id);
    CREATE INDEX IF NOT EXISTS idx_metadata_key ON memory_metadata(key);
  `);
};

const updateMemory = async (
  db: Database,
  id: string,
  updates: Record<string, unknown>
): Promise<void> => {
  const setClause = Object.keys(updates)
    .map(key => `${key} = ?`)
    .join(', ');
  const values = Object.values(updates);
  values.push(id);

  await db.run(
    `
    UPDATE memories 
    SET ${setClause}, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `,
    values
  );
};

const findSimilarMemory = async (
  db: Database,
  content: string,
  context: string,
  threshold = 0.9
): Promise<StoredMemory | null> => {
  // Simple similarity check - in a real implementation, you'd use embeddings
  const memories = (await db.all(
    `
    SELECT * FROM memories 
    WHERE context = ? AND content LIKE ?
    ORDER BY created_at DESC
    LIMIT 5
  `,
    [context, `%${content.slice(0, 50)}%`]
  )) as StoredMemory[];

  for (const memory of memories) {
    const similarity = calculateTextSimilarity(content, memory.content);
    if (similarity > threshold) {
      return {
        ...memory,
        createdAt: memory.createdAt || memory.timestamp,
        updatedAt: memory.updatedAt || memory.timestamp,
      };
    }
  }

  return null;
};

// Factory function to create a memory store
export const createMemoryStore = (config: StorageConfig): MemoryStore => {
  const dbPath = resolvePath(config.path);
  let db: Database | null = null;

  return {
    async initialize(): Promise<void> {
      // Ensure the directory exists
      const dbDir = path.dirname(dbPath);
      await fs.ensureDir(dbDir);

      // Open the database
      db = await open({
        filename: dbPath,
        driver: sqlite.Database,
      });

      // Create tables
      await createTables(db);

      console.error('Memory store initialized successfully');
    },

    async addMemory(memoryData: MemoryData): Promise<StoredMemory> {
      if (!db) throw new Error('Database not initialized');

      const id = generateId();
      const {
        content,
        originalContent,
        context = 'general',
        importance = 5,
        timestamp,
        source = 'manual',
        project,
        category,
        tags,
      } = memoryData;

      // Check for duplicates if deduplication is enabled
      if (config.deduplication !== false) {
        const existing = await findSimilarMemory(db, content, context);
        if (existing) {
          // Update the existing memory instead of creating a duplicate
          await updateMemory(db, existing.id, {
            content,
            importance: Math.max(existing.importance, importance),
            updatedAt: new Date().toISOString(),
          });
          return {
            ...existing,
            content,
            importance,
            createdAt: existing.createdAt || existing.timestamp,
            updatedAt: new Date().toISOString(),
          };
        }
      }

      const now = new Date().toISOString();

      const tagsJson = tags ? JSON.stringify(tags) : null;

      await db.run(
        `
        INSERT INTO memories (id, content, original_content, context, importance, timestamp, source, project, category, tags)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
        [
          id,
          content,
          originalContent,
          context,
          importance,
          timestamp,
          source,
          project,
          category,
          tagsJson,
        ]
      );

      return {
        id,
        content,
        originalContent,
        context,
        importance,
        timestamp,
        source,
        project,
        category,
        tags,
        createdAt: now,
        updatedAt: now,
      };
    },

    async searchMemories(
      query: string,
      options: SearchOptions = {}
    ): Promise<(StoredMemory & { similarity: number })[]> {
      if (!db) throw new Error('Database not initialized');

      const { limit = 5, context, threshold = 0.1 } = options;

      let sql = `
        SELECT * FROM memories 
        WHERE 1=1
      `;
      const params: unknown[] = [];

      // Add context filter
      if (context) {
        sql += ` AND context = ?`;
        params.push(context);
      }

      // Simple text search - in production, use vector similarity
      const queryWords = query.toLowerCase().split(/\s+/);
      const searchConditions = queryWords.map(() => `content LIKE ?`).join(' OR ');
      sql += ` AND (${searchConditions})`;
      params.push(...queryWords.map(word => `%${word}%`));

      sql += ` ORDER BY importance DESC, created_at DESC LIMIT ?`;
      params.push(limit);

      const memories = (await db.all(sql, params)) as StoredMemory[];

      // Calculate similarity scores and add missing fields
      return memories
        .map(memory => ({
          ...memory,
          createdAt: memory.createdAt || memory.timestamp,
          updatedAt: memory.updatedAt || memory.timestamp,
          similarity: calculateTextSimilarity(query, memory.content),
        }))
        .filter(memory => memory.similarity >= threshold)
        .sort((a, b) => b.similarity - a.similarity);
    },

    async getMemories(options: GetMemoriesOptions = {}): Promise<StoredMemory[]> {
      if (!db) throw new Error('Database not initialized');

      const { context, limit = 10, since } = options;

      let sql = `SELECT * FROM memories WHERE 1=1`;
      const params: unknown[] = [];

      if (context) {
        sql += ` AND context = ?`;
        params.push(context);
      }

      if (since) {
        sql += ` AND datetime(timestamp) >= datetime(?)`;
        params.push(since.toISOString());
      }

      sql += ` ORDER BY created_at DESC LIMIT ?`;
      params.push(limit);

      const memories = (await db.all(sql, params)) as StoredMemory[];

      return memories.map(memory => ({
        ...memory,
        createdAt: memory.createdAt || memory.timestamp,
        updatedAt: memory.updatedAt || memory.timestamp,
      }));
    },

    async deleteMemory(id: string): Promise<boolean> {
      if (!db) throw new Error('Database not initialized');

      const result = await db.run(`DELETE FROM memories WHERE id = ?`, [id]);
      return (result.changes || 0) > 0;
    },

    async getMemoryById(id: string): Promise<StoredMemory | null> {
      if (!db) throw new Error('Database not initialized');

      const memory = (await db.get(`SELECT * FROM memories WHERE id = ?`, [id])) as
        | StoredMemory
        | undefined;

      if (!memory) return null;

      return {
        ...memory,
        createdAt: memory.createdAt || memory.timestamp,
        updatedAt: memory.updatedAt || memory.timestamp,
      };
    },

    async getStats(): Promise<MemoryStats> {
      if (!db) throw new Error('Database not initialized');

      const stats = (await db.get(`
        SELECT 
          COUNT(*) as total_memories,
          COUNT(DISTINCT context) as unique_contexts,
          AVG(importance) as avg_importance,
          MAX(created_at) as latest_memory
        FROM memories
      `)) as {
        total_memories: number;
        unique_contexts: number;
        avg_importance: number;
        latest_memory: string;
      };

      const contextStats = (await db.all(`
        SELECT context, COUNT(*) as count
        FROM memories 
        GROUP BY context 
        ORDER BY count DESC
      `)) as { context: string; count: number }[];

      return {
        totalMemories: stats.total_memories,
        uniqueContexts: stats.unique_contexts,
        avgImportance: stats.avg_importance,
        latestMemory: stats.latest_memory,
        contexts: contextStats,
      };
    },

    async listProjects(): Promise<ProjectMemoryStats[]> {
      if (!db) throw new Error('Database not initialized');

      const projects = (await db.all(`
        SELECT 
          project,
          COUNT(*) as total_memories,
          GROUP_CONCAT(DISTINCT category) as categories,
          MAX(updated_at) as last_updated
        FROM memories 
        WHERE project IS NOT NULL 
        GROUP BY project 
        ORDER BY last_updated DESC
      `)) as Array<{
        project: string;
        total_memories: number;
        categories: string;
        last_updated: string;
      }>;

      return projects.map(p => ({
        project: p.project,
        totalMemories: p.total_memories,
        categories: p.categories ? p.categories.split(',').filter(Boolean) : [],
        lastUpdated: p.last_updated,
      }));
    },

    async listProjectFiles(project: string): Promise<string[]> {
      if (!db) throw new Error('Database not initialized');

      const categories = (await db.all(
        `
        SELECT DISTINCT category 
        FROM memories 
        WHERE project = ? AND category IS NOT NULL
        ORDER BY category
      `,
        [project]
      )) as Array<{ category: string }>;

      return categories.map(c => c.category);
    },

    async updateMemoryBank(
      project: string,
      category: string | undefined,
      memories: Array<{ content: string; importance?: number; tags?: string[] }>
    ): Promise<void> {
      if (!db) throw new Error('Database not initialized');

      // Begin transaction
      await db.run('BEGIN TRANSACTION');

      try {
        for (const memory of memories) {
          const id = generateId();
          const now = new Date().toISOString();
          const tagsJson = memory.tags ? JSON.stringify(memory.tags) : null;

          await db.run(
            `
            INSERT INTO memories (id, content, context, importance, timestamp, source, project, category, tags, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
            [
              id,
              memory.content,
              category || 'general',
              memory.importance || 5,
              now,
              'manual',
              project,
              category,
              tagsJson,
              now,
              now,
            ]
          );
        }

        await db.run('COMMIT');
      } catch (error) {
        await db.run('ROLLBACK');
        throw error;
      }
    },

    async exportMemoryBank(
      project?: string,
      category?: string,
      format: 'json' | 'markdown' | 'csv' = 'json'
    ): Promise<MemoryBankExport> {
      if (!db) throw new Error('Database not initialized');

      let sql = 'SELECT * FROM memories WHERE 1=1';
      const params: (string | undefined)[] = [];

      if (project) {
        sql += ' AND project = ?';
        params.push(project);
      }

      if (category) {
        sql += ' AND category = ?';
        params.push(category);
      }

      sql += ' ORDER BY created_at DESC';

      const rawMemories = (await db.all(sql, params)) as Array<{
        id: string;
        content: string;
        original_content?: string;
        context: string;
        importance: number;
        timestamp: string;
        source: string;
        project?: string;
        category?: string;
        tags?: string;
        created_at: string;
        updated_at: string;
      }>;

      const memories: StoredMemory[] = rawMemories.map(m => ({
        id: m.id,
        content: m.content,
        originalContent: m.original_content,
        context: m.context,
        importance: m.importance,
        timestamp: m.timestamp,
        source: m.source as 'manual' | 'auto-extracted',
        project: m.project,
        category: m.category,
        tags: m.tags
          ? (() => {
              try {
                return JSON.parse(m.tags) as string[];
              } catch {
                return undefined;
              }
            })()
          : undefined,
        createdAt: m.created_at,
        updatedAt: m.updated_at,
      }));

      return {
        project,
        category,
        format,
        exportedAt: new Date().toISOString(),
        memories,
      };
    },

    // Todo operations
    async addTodo(todoData: TodoData): Promise<StoredTodo> {
      if (!db) throw new Error('Database not initialized');

      const id = generateId();
      const now = new Date().toISOString();

      await db.run(
        `INSERT INTO todos (id, content, status, priority, project, context, tags, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          todoData.content,
          todoData.status || 'pending',
          todoData.priority || 'medium',
          todoData.project || null,
          todoData.context || null,
          todoData.tags ? JSON.stringify(todoData.tags) : null,
          now,
          now,
        ]
      );

      return {
        id,
        content: todoData.content,
        status: todoData.status || 'pending',
        priority: todoData.priority || 'medium',
        project: todoData.project,
        context: todoData.context,
        tags: todoData.tags,
        createdAt: now,
        updatedAt: now,
      };
    },

    async listTodos(options: ListTodosArgs = {}): Promise<StoredTodo[]> {
      if (!db) throw new Error('Database not initialized');

      let sql = 'SELECT * FROM todos WHERE 1=1';
      const params: (string | number)[] = [];

      if (options.status) {
        sql += ' AND status = ?';
        params.push(options.status);
      }

      if (options.priority) {
        sql += ' AND priority = ?';
        params.push(options.priority);
      }

      if (options.project) {
        sql += ' AND project = ?';
        params.push(options.project);
      }

      if (options.context) {
        sql += ' AND context = ?';
        params.push(options.context);
      }

      sql += ' ORDER BY created_at DESC';

      if (options.limit) {
        sql += ' LIMIT ?';
        params.push(options.limit);
      }

      const rawTodos = (await db.all(sql, params)) as Array<{
        id: string;
        content: string;
        status: 'pending' | 'in_progress' | 'completed';
        priority: 'low' | 'medium' | 'high';
        project?: string;
        context?: string;
        tags?: string;
        created_at: string;
        updated_at: string;
      }>;

      return rawTodos.map(t => ({
        id: t.id,
        content: t.content,
        status: t.status,
        priority: t.priority,
        project: t.project || undefined,
        context: t.context || undefined,
        tags: t.tags
          ? (() => {
              try {
                return JSON.parse(t.tags) as string[];
              } catch {
                return undefined;
              }
            })()
          : undefined,
        createdAt: t.created_at,
        updatedAt: t.updated_at,
      }));
    },

    async updateTodo(id: string, updates: Partial<TodoData>): Promise<StoredTodo | null> {
      if (!db) throw new Error('Database not initialized');

      const existing = await this.getTodoById(id);
      if (!existing) return null;

      const updatedAt = new Date().toISOString();
      const updateFields: string[] = [];
      const params: (string | null)[] = [];

      if (updates.content !== undefined) {
        updateFields.push('content = ?');
        params.push(updates.content);
      }

      if (updates.status !== undefined) {
        updateFields.push('status = ?');
        params.push(updates.status);
      }

      if (updates.priority !== undefined) {
        updateFields.push('priority = ?');
        params.push(updates.priority);
      }

      if (updates.project !== undefined) {
        updateFields.push('project = ?');
        params.push(updates.project || null);
      }

      if (updates.context !== undefined) {
        updateFields.push('context = ?');
        params.push(updates.context || null);
      }

      if (updates.tags !== undefined) {
        updateFields.push('tags = ?');
        params.push(updates.tags ? JSON.stringify(updates.tags) : null);
      }

      updateFields.push('updated_at = ?');
      params.push(updatedAt);

      params.push(id);

      await db.run(
        `UPDATE todos SET ${updateFields.join(', ')} WHERE id = ?`,
        params
      );

      return this.getTodoById(id);
    },

    async deleteTodo(id: string): Promise<boolean> {
      if (!db) throw new Error('Database not initialized');

      const result = await db.run('DELETE FROM todos WHERE id = ?', [id]);
      return (result.changes || 0) > 0;
    },

    async getTodoById(id: string): Promise<StoredTodo | null> {
      if (!db) throw new Error('Database not initialized');

      const rawTodo = (await db.get('SELECT * FROM todos WHERE id = ?', [id])) as {
        id: string;
        content: string;
        status: 'pending' | 'in_progress' | 'completed';
        priority: 'low' | 'medium' | 'high';
        project?: string;
        context?: string;
        tags?: string;
        created_at: string;
        updated_at: string;
      } | undefined;

      if (!rawTodo) return null;

      return {
        id: rawTodo.id,
        content: rawTodo.content,
        status: rawTodo.status,
        priority: rawTodo.priority,
        project: rawTodo.project || undefined,
        context: rawTodo.context || undefined,
        tags: rawTodo.tags
          ? (() => {
              try {
                return JSON.parse(rawTodo.tags) as string[];
              } catch {
                return undefined;
              }
            })()
          : undefined,
        createdAt: rawTodo.created_at,
        updatedAt: rawTodo.updated_at,
      };
    },

    async close(): Promise<void> {
      if (db) {
        await db.close();
      }
    },
  };
};
