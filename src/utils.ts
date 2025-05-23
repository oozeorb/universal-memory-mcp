import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';
import { execSync } from 'child_process';
import type { Config, MemoryData, ValidationResult, Logger, StoredMemory } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function loadConfig(): Config {
  const configPath = path.join(__dirname, '../config/default.json');

  try {
    const config = fs.readJsonSync(configPath) as Config;

    // Override with environment variables (Docker-friendly)
    if (process.env.OLLAMA_URL) {
      config.ollamaUrl = process.env.OLLAMA_URL;
    }
    if (process.env.OLLAMA_MODEL) {
      config.ollamaModel = process.env.OLLAMA_MODEL;
    }
    if (process.env.MEMORY_STORAGE_PATH) {
      config.memoryStorage = config.memoryStorage || { type: 'sqlite', path: '' };
      config.memoryStorage.path = process.env.MEMORY_STORAGE_PATH;
    }

    // Resolve paths
    if (config.memoryStorage?.path) {
      config.memoryStorage.path = resolvePath(config.memoryStorage.path);
    }

    if (config.logging?.file) {
      config.logging.file = resolvePath(config.logging.file);
    }

    return config;
  } catch (error) {
    console.error('Failed to load config, using defaults:', (error as Error).message);
    return getDefaultConfig();
  }
}

export function resolvePath(configPath: string): string {
  if (configPath.startsWith('~/')) {
    return path.join(os.homedir(), configPath.slice(2));
  }
  if (path.isAbsolute(configPath)) {
    return configPath;
  }
  return path.resolve(process.cwd(), configPath);
}

export function getDefaultConfig(): Config {
  return {
    ollamaModel: process.env.OLLAMA_MODEL || 'llama3.1:8b',
    ollamaUrl: process.env.OLLAMA_URL || 'http://localhost:11434',
    memoryStorage: {
      type: 'sqlite',
      path: path.join(os.homedir(), 'universal-memories.db'),
    },
    mcpProtocolVersion: '2024-11-05',
    processing: {
      autoExtract: true,
      deduplication: true,
      maxMemoriesPerQuery: 10,
      similarityThreshold: 0.8,
    },
    logging: {
      level: 'info',
      file: path.join(os.homedir(), 'universal-memory-mcp.log'),
    },
  };
}

export function setupLogging(config: Config): Logger {
  const logLevel = config.logging?.level || 'info';
  const logFile = config.logging?.file;

  if (logFile) {
    // Ensure log directory exists
    fs.ensureDirSync(path.dirname(logFile));
  }

  return {
    info: (message: string, ...args: unknown[]) => {
      if (['debug', 'info', 'warn', 'error'].includes(logLevel)) {
        console.error(`[INFO] ${message}`, ...args);
        if (logFile) {
          appendToLogFile(logFile, 'INFO', message, ...args);
        }
      }
    },
    warn: (message: string, ...args: unknown[]) => {
      if (['warn', 'error'].includes(logLevel)) {
        console.error(`[WARN] ${message}`, ...args);
        if (logFile) {
          appendToLogFile(logFile, 'WARN', message, ...args);
        }
      }
    },
    error: (message: string, ...args: unknown[]) => {
      if (['error'].includes(logLevel)) {
        console.error(`[ERROR] ${message}`, ...args);
        if (logFile) {
          appendToLogFile(logFile, 'ERROR', message, ...args);
        }
      }
    },
    debug: (message: string, ...args: unknown[]) => {
      if (logLevel === 'debug') {
        console.error(`[DEBUG] ${message}`, ...args);
        if (logFile) {
          appendToLogFile(logFile, 'DEBUG', message, ...args);
        }
      }
    },
  };
}

function appendToLogFile(
  logFile: string,
  level: string,
  message: string,
  ...args: unknown[]
): void {
  try {
    const timestamp = new Date().toISOString();
    const logLine = `${timestamp} [${level}] ${message} ${args.length > 0 ? JSON.stringify(args) : ''}\\n`;
    fs.appendFileSync(logFile, logLine);
  } catch {
    // Ignore logging errors to avoid infinite loops
  }
}

export function validateMemoryData(data: Partial<MemoryData>): ValidationResult {
  const errors: string[] = [];

  if (!data.content || typeof data.content !== 'string' || data.content.trim().length === 0) {
    errors.push('Content is required and must be a non-empty string');
  }

  if (data.importance !== undefined) {
    const importance = Number(data.importance);
    if (isNaN(importance) || importance < 1 || importance > 10) {
      errors.push('Importance must be a number between 1 and 10');
    }
  }

  if (data.context && typeof data.context !== 'string') {
    errors.push('Context must be a string');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function formatMemoryForDisplay(memory: StoredMemory): string {
  const timestamp = new Date(memory.timestamp).toLocaleString();
  const importance = '★'.repeat(Math.floor(memory.importance / 2));

  return `[${timestamp}] ${importance} ${memory.context}: ${memory.content}`;
}

export function sanitizeContext(context?: string): string {
  if (!context || typeof context !== 'string') {
    return 'general';
  }

  // Remove special characters, convert to lowercase
  return context
    .toLowerCase()
    .replace(/[^a-z0-9\s-_]/g, '')
    .replace(/\\s+/g, '-')
    .trim();
}

export function truncateText(text: string, maxLength = 100): string {
  if (!text || text.length <= maxLength) {
    return text;
  }

  return text.slice(0, maxLength - 3) + '...';
}

// Types for the functional performance timer
export type PerformanceTimer = {
  end(): number;
};

// Factory function to create a performance timer
export const createPerformanceTimer = (name: string): PerformanceTimer => {
  const start = Date.now();

  return {
    end(): number {
      const duration = Date.now() - start;
      console.error(`[PERF] ${name}: ${duration}ms`);
      return duration;
    },
  };
};

export function createBackup(sourcePath: string, backupDir: string): string {
  try {
    fs.ensureDirSync(backupDir);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(backupDir, `backup-${timestamp}.db`);
    fs.copySync(sourcePath, backupPath);
    console.error(`Backup created: ${backupPath}`);
    return backupPath;
  } catch (error) {
    console.error('Failed to create backup:', (error as Error).message);
    throw error;
  }
}

export function getCurrentUser(): string {
  return process.env.USER || process.env.USERNAME || 'user';
}

export function getProjectPath(): string {
  // Try to get project path from environment variable first
  if (process.env.PROJECT_PATH) {
    return process.env.PROJECT_PATH;
  }

  // Fall back to detecting current directory if running from within the project
  if (process.cwd().includes('universal-memory-mcp')) {
    return process.cwd();
  }

  // Final fallback to a common location pattern
  return path.join(os.homedir(), 'universal-memory-mcp');
}

export function getGitHubUrl(): string {
  // Get from package.json or environment variable
  return process.env.GITHUB_REPO_URL || 'https://github.com/oozeorb/universal-memory-mcp';
}

export interface RepositoryInfo {
  repoName?: string;
  branch?: string;
  remoteName?: string;
  remoteUrl?: string;
  isGitRepo: boolean;
  tags: string[];
}

export function detectRepositoryInfo(workingDir?: string): RepositoryInfo {
  const cwd = workingDir || process.cwd();
  const result: RepositoryInfo = {
    isGitRepo: false,
    tags: []
  };

  try {
    // Check if we're in a git repository
    execSync('git rev-parse --git-dir', { cwd, stdio: 'pipe' });
    result.isGitRepo = true;

    // Get repository name from remote URL
    try {
      const remoteUrl = execSync('git remote get-url origin', { cwd, encoding: 'utf8' }).trim();
      result.remoteUrl = remoteUrl;
      
      // Extract repo name from URL (works for GitHub, GitLab, etc.)
      const match = remoteUrl.match(/[\/:]([^\/]+\/[^\/]+?)(?:\.git)?$/);
      if (match && match[1]) {
        result.repoName = match[1];
        result.tags.push(`repo:${match[1].replace('/', '-')}`);
      }
    } catch {
      // No remote or error getting remote URL
    }

    // Get current branch
    try {
      const branch = execSync('git branch --show-current', { cwd, encoding: 'utf8' }).trim();
      if (branch) {
        result.branch = branch;
        result.tags.push(`branch:${branch}`);
      }
    } catch {
      // Error getting branch (detached HEAD, etc.)
    }

    // Get remote name (usually 'origin')
    try {
      const remoteName = execSync('git remote', { cwd, encoding: 'utf8' }).trim().split('\n')[0];
      if (remoteName) {
        result.remoteName = remoteName;
      }
    } catch {
      // No remotes
    }

    // Add generic git tag
    result.tags.push('git-repo');

  } catch {
    // Not a git repository
    result.isGitRepo = false;
  }

  return result;
}

export function enhanceMemoryWithRepoInfo(memoryData: MemoryData, workingDir?: string): MemoryData {
  const repoInfo = detectRepositoryInfo(workingDir);
  const enhanced = { ...memoryData };

  // Add repository tags
  if (repoInfo.isGitRepo && repoInfo.tags.length > 0) {
    enhanced.tags = [...(enhanced.tags || []), ...repoInfo.tags];
  }

  // Set project name from repo if not already set
  if (!enhanced.project && repoInfo.repoName) {
    enhanced.project = repoInfo.repoName;
  }

  // Add repository context if not already specified
  if (!enhanced.context || enhanced.context === 'general') {
    if (repoInfo.repoName) {
      enhanced.context = `repo-${repoInfo.repoName.replace('/', '-')}`;
    }
  }

  return enhanced;
}
