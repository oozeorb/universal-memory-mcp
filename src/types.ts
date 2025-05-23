export interface MemoryData {
  content: string;
  originalContent?: string | undefined;
  context: string;
  importance: number;
  timestamp: string;
  source: 'manual' | 'auto-extracted';
  project?: string | undefined;
  category?: string | undefined;
  tags?: string[] | undefined;
}

export interface StoredMemory extends MemoryData {
  id: string;
  originalContent?: string | undefined;
  project?: string | undefined;
  category?: string | undefined;
  tags?: string[] | undefined;
  createdAt: string;
  updatedAt: string;
}

export interface SearchOptions {
  limit?: number;
  context?: string;
  threshold?: number;
}

export interface GetMemoriesOptions {
  context?: string;
  limit?: number;
  since?: Date;
}

export interface ExtractedMemory {
  content: string;
  context?: string;
  importance?: number;
}

export interface MemoryStats {
  totalMemories: number;
  uniqueContexts: number;
  avgImportance: number;
  latestMemory: string;
  contexts: ContextStats[];
}

export interface ContextStats {
  context: string;
  count: number;
}

export interface Config {
  ollamaModel: string;
  ollamaUrl: string;
  memoryStorage: StorageConfig;
  mcpProtocolVersion: string;
  processing: ProcessingConfig;
  logging: LoggingConfig;
}

export interface StorageConfig {
  type: 'sqlite';
  path: string;
  options?: Record<string, unknown>;
  deduplication?: boolean;
}

export interface ProcessingConfig {
  autoExtract: boolean;
  deduplication: boolean;
  maxMemoriesPerQuery: number;
  similarityThreshold: number;
}

export interface LoggingConfig {
  level: 'debug' | 'info' | 'warn' | 'error';
  file?: string;
}

export interface Logger {
  debug: (message: string, ...args: unknown[]) => void;
  info: (message: string, ...args: unknown[]) => void;
  warn: (message: string, ...args: unknown[]) => void;
  error: (message: string, ...args: unknown[]) => void;
}

export interface OllamaResponse {
  response: string;
  model: string;
  done: boolean;
}

export interface OllamaModel {
  name: string;
  size: number;
  digest: string;
  modified_at: string;
}

export interface OllamaListResponse {
  models: OllamaModel[];
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface AddMemoryArgs {
  content: string;
  context?: string;
  importance?: number;
  project?: string | undefined;
  category?: string | undefined;
  tags?: string[] | undefined;
}

export interface SearchMemoriesArgs {
  query: string;
  context?: string;
  limit?: number;
  threshold?: number;
}

export interface GetMemoriesArgs {
  context?: string;
  limit?: number;
  since?: string;
}

export interface ExtractMemoriesArgs {
  text: string;
  context?: string;
}

export interface DeleteMemoryArgs {
  id: string;
}

export type ListProjectsArgs = Record<string, never>;

export interface ListProjectFilesArgs {
  project: string;
}

export interface MemoryBankUpdateArgs {
  project: string;
  category?: string;
  memories: {
    content: string;
    importance?: number;
    tags?: string[];
  }[];
}

export interface ExportMemoryBankArgs {
  project?: string;
  format: 'json' | 'markdown' | 'csv';
  category?: string;
}

export interface ProjectMemoryStats {
  project: string;
  totalMemories: number;
  categories: string[];
  lastUpdated: string;
}

export interface MemoryBankExport {
  project?: string | undefined;
  category?: string | undefined;
  format: string;
  exportedAt: string;
  memories: StoredMemory[];
}

// Todo Types
export interface TodoData {
  content: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  project?: string | undefined;
  context?: string | undefined;
  tags?: string[] | undefined;
  createdAt: string;
  updatedAt: string;
}

export interface StoredTodo extends TodoData {
  id: string;
}

export interface AddTodoArgs {
  content: string;
  status?: 'pending' | 'in_progress' | 'completed';
  priority?: 'low' | 'medium' | 'high';
  project?: string | undefined;
  context?: string | undefined;
  tags?: string[] | undefined;
}

export interface UpdateTodoArgs {
  id: string;
  content?: string;
  status?: 'pending' | 'in_progress' | 'completed';
  priority?: 'low' | 'medium' | 'high';
  project?: string | undefined;
  context?: string | undefined;
  tags?: string[] | undefined;
}

export interface ListTodosArgs {
  status?: 'pending' | 'in_progress' | 'completed';
  priority?: 'low' | 'medium' | 'high';
  project?: string | undefined;
  context?: string | undefined;
  limit?: number;
}

export interface DeleteTodoArgs {
  id: string;
}
