import { promises as fs } from 'fs';
import { dirname, join } from 'path';

/**
 * Utility class for async file operations
 */
export class FileUtils {
  /**
   * Ensure directory exists, create if it doesn't
   */
  static async ensureDir(dirPath: string): Promise<void> {
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
    }
  }

  /**
   * Write data to file, ensuring directory exists
   */
  static async writeFile(filePath: string, data: string): Promise<void> {
    const dir = dirname(filePath);
    await FileUtils.ensureDir(dir);
    await fs.writeFile(filePath, data, 'utf8');
  }

  /**
   * Read file content as string
   */
  static async readFile(filePath: string): Promise<string> {
    try {
      return await fs.readFile(filePath, 'utf8');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new Error(`File not found: ${filePath}`);
      }
      throw error;
    }
  }

  /**
   * Check if file exists
   */
  static async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Delete file if it exists
   */
  static async deleteFile(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }

  /**
   * Write JSON data to file
   */
  static async writeJson(filePath: string, data: unknown): Promise<void> {
    const jsonString = JSON.stringify(data, null, 2);
    await FileUtils.writeFile(filePath, jsonString);
  }

  /**
   * Read and parse JSON file
   */
  static async readJson<T = unknown>(filePath: string): Promise<T> {
    const content = await FileUtils.readFile(filePath);
    try {
      return JSON.parse(content) as T;
    } catch (error) {
      throw new Error(`Invalid JSON in file ${filePath}: ${(error as Error).message}`);
    }
  }

  /**
   * Create a lock file for coordination
   */
  static async createLockFile(lockPath: string, data?: string): Promise<void> {
    const lockData = data || new Date().toISOString();
    await FileUtils.writeFile(lockPath, lockData);
  }

  /**
   * Remove lock file
   */
  static async removeLockFile(lockPath: string): Promise<void> {
    await FileUtils.deleteFile(lockPath);
  }

  /**
   * Wait for lock file to be removed (with timeout)
   */
  static async waitForLockRelease(
    lockPath: string,
    timeoutMs: number = 30000,
    checkIntervalMs: number = 100
  ): Promise<void> {
    const startTime = Date.now();

    while (await FileUtils.fileExists(lockPath)) {
      if (Date.now() - startTime > timeoutMs) {
        throw new Error(`Lock file timeout: ${lockPath}`);
      }
      await new Promise(resolve => setTimeout(resolve, checkIntervalMs));
    }
  }

  /**
   * Alias for ensureDir for compatibility
   */
  static async ensureDirectoryExists(dirPath: string): Promise<void> {
    return FileUtils.ensureDir(dirPath);
  }

  /**
   * Alias for writeJson with options support
   */
  static async writeJsonFile<T>(
    filePath: string,
    data: T,
    options?: { flag?: string }
  ): Promise<void> {
    const dir = dirname(filePath);
    await FileUtils.ensureDir(dir);
    const jsonString = JSON.stringify(data, null, 2);
    await fs.writeFile(filePath, jsonString, { encoding: 'utf8', ...options });
  }

  /**
   * Alias for readJson
   */
  static async readJsonFile<T>(filePath: string): Promise<T> {
    return FileUtils.readJson<T>(filePath);
  }

  /**
   * List files in directory
   */
  static async listFiles(dirPath: string): Promise<string[]> {
    try {
      return await fs.readdir(dirPath);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return [];
      }
      throw new Error(`Failed to list files in ${dirPath}: ${error.message}`);
    }
  }
}
