import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FileUtils } from '../../../src/utils/FileUtils';

describe('FileUtils', () => {
  const testDir = join(tmpdir(), 'testrail-helper-test');
  const testFile = join(testDir, 'test.txt');
  const testJsonFile = join(testDir, 'test.json');

  beforeEach(async () => {
    // Clean up test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Directory might not exist
    }
  });

  afterEach(async () => {
    // Clean up after tests
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Directory might not exist
    }
  });

  describe('ensureDir', () => {
    it('should create directory if it does not exist', async () => {
      await FileUtils.ensureDir(testDir);

      const stats = await fs.stat(testDir);
      expect(stats.isDirectory()).toBe(true);
    });

    it('should not throw if directory already exists', async () => {
      await fs.mkdir(testDir, { recursive: true });

      await expect(FileUtils.ensureDir(testDir)).resolves.not.toThrow();
    });

    it('should create nested directories', async () => {
      const nestedDir = join(testDir, 'nested', 'deep');
      await FileUtils.ensureDir(nestedDir);

      const stats = await fs.stat(nestedDir);
      expect(stats.isDirectory()).toBe(true);
    });
  });

  describe('writeFile', () => {
    it('should write file content', async () => {
      const content = 'Hello, World!';
      await FileUtils.writeFile(testFile, content);

      const readContent = await fs.readFile(testFile, 'utf8');
      expect(readContent).toBe(content);
    });

    it('should create directory if it does not exist', async () => {
      const nestedFile = join(testDir, 'nested', 'file.txt');
      await FileUtils.writeFile(nestedFile, 'content');

      const readContent = await fs.readFile(nestedFile, 'utf8');
      expect(readContent).toBe('content');
    });
  });

  describe('readFile', () => {
    it('should read file content', async () => {
      const content = 'Test content';
      await fs.mkdir(testDir, { recursive: true });
      await fs.writeFile(testFile, content, 'utf8');

      const readContent = await FileUtils.readFile(testFile);
      expect(readContent).toBe(content);
    });

    it('should throw error for non-existent file', async () => {
      await expect(FileUtils.readFile(testFile)).rejects.toThrow('File not found');
    });
  });

  describe('fileExists', () => {
    it('should return true for existing file', async () => {
      await fs.mkdir(testDir, { recursive: true });
      await fs.writeFile(testFile, 'content', 'utf8');

      const exists = await FileUtils.fileExists(testFile);
      expect(exists).toBe(true);
    });

    it('should return false for non-existent file', async () => {
      const exists = await FileUtils.fileExists(testFile);
      expect(exists).toBe(false);
    });
  });

  describe('deleteFile', () => {
    it('should delete existing file', async () => {
      await fs.mkdir(testDir, { recursive: true });
      await fs.writeFile(testFile, 'content', 'utf8');

      await FileUtils.deleteFile(testFile);

      const exists = await FileUtils.fileExists(testFile);
      expect(exists).toBe(false);
    });

    it('should not throw for non-existent file', async () => {
      await expect(FileUtils.deleteFile(testFile)).resolves.not.toThrow();
    });
  });

  describe('writeJson', () => {
    it('should write JSON data', async () => {
      const data = { name: 'test', value: 123, nested: { key: 'value' } };
      await FileUtils.writeJson(testJsonFile, data);

      const readData = await fs.readFile(testJsonFile, 'utf8');
      const parsed = JSON.parse(readData);
      expect(parsed).toEqual(data);
    });

    it('should format JSON with indentation', async () => {
      const data = { key: 'value' };
      await FileUtils.writeJson(testJsonFile, data);

      const content = await fs.readFile(testJsonFile, 'utf8');
      expect(content).toContain('  '); // Should have indentation
    });
  });

  describe('readJson', () => {
    it('should read and parse JSON file', async () => {
      const data = { name: 'test', value: 123 };
      await fs.mkdir(testDir, { recursive: true });
      await fs.writeFile(testJsonFile, JSON.stringify(data), 'utf8');

      const readData = await FileUtils.readJson(testJsonFile);
      expect(readData).toEqual(data);
    });

    it('should throw error for invalid JSON', async () => {
      await fs.mkdir(testDir, { recursive: true });
      await fs.writeFile(testJsonFile, 'invalid json', 'utf8');

      await expect(FileUtils.readJson(testJsonFile)).rejects.toThrow('Invalid JSON');
    });

    it('should throw error for non-existent file', async () => {
      await expect(FileUtils.readJson(testJsonFile)).rejects.toThrow('File not found');
    });
  });

  describe('lock file operations', () => {
    const lockFile = join(testDir, 'test.lock');

    it('should create lock file', async () => {
      await FileUtils.createLockFile(lockFile, 'lock data');

      const exists = await FileUtils.fileExists(lockFile);
      expect(exists).toBe(true);

      const content = await FileUtils.readFile(lockFile);
      expect(content).toBe('lock data');
    });

    it('should create lock file with timestamp if no data provided', async () => {
      await FileUtils.createLockFile(lockFile);

      const content = await FileUtils.readFile(lockFile);
      expect(content).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/); // ISO timestamp format
    });

    it('should remove lock file', async () => {
      await FileUtils.createLockFile(lockFile, 'test');
      await FileUtils.removeLockFile(lockFile);

      const exists = await FileUtils.fileExists(lockFile);
      expect(exists).toBe(false);
    });

    it('should wait for lock release', async () => {
      await FileUtils.createLockFile(lockFile);

      // Remove lock after short delay
      setTimeout(async () => {
        await FileUtils.removeLockFile(lockFile);
      }, 100);

      const startTime = Date.now();
      await FileUtils.waitForLockRelease(lockFile, 1000, 50);
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeGreaterThan(90); // Should wait at least ~100ms
      expect(elapsed).toBeLessThan(500); // But not too long
    });

    it('should timeout waiting for lock release', async () => {
      await FileUtils.createLockFile(lockFile);

      await expect(FileUtils.waitForLockRelease(lockFile, 200, 50)).rejects.toThrow(
        'Lock file timeout'
      );
    });

    it('should return immediately if no lock file exists', async () => {
      const startTime = Date.now();
      await FileUtils.waitForLockRelease(lockFile, 1000, 50);
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeLessThan(100); // Should return quickly
    });
  });
});
