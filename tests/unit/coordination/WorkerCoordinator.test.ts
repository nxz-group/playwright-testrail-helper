import * as path from 'node:path';
import type { ConfigManager } from '../../../src/config/TestRailConfig';
import {
  type CoordinationConfig,
  WorkerCoordinator,
} from '../../../src/coordination/WorkerCoordinator';
import type { TestResult } from '../../../src/types';
import { FileUtils } from '../../../src/utils/FileUtils';

// Mock dependencies
jest.mock('../../../src/utils/FileUtils');
jest.mock('../../../src/utils/Logger');

const mockFileUtils = FileUtils as jest.Mocked<typeof FileUtils>;

describe('WorkerCoordinator', () => {
  let coordinator: WorkerCoordinator;
  let testRailConfig: ConfigManager;
  let coordinationConfig: Partial<CoordinationConfig>;
  let mockCoordinationDir: string;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock the ConfigManager to avoid initialization issues
    testRailConfig = {
      getConfig: jest.fn().mockReturnValue({
        host: 'https://test.testrail.com',
        username: 'test@example.com',
        password: 'test-password',
        projectId: 1,
      }),
    } as any;
    mockCoordinationDir = '/tmp/test-coordination';

    coordinationConfig = {
      lockTimeout: 5000,
      heartbeatInterval: 1000,
      workerTimeout: 10000,
      maxRetries: 2,
      coordinationDir: mockCoordinationDir,
    };

    coordinator = new WorkerCoordinator(testRailConfig, coordinationConfig);

    // Setup FileUtils mocks
    mockFileUtils.ensureDirectoryExists.mockResolvedValue(undefined);
    mockFileUtils.writeJsonFile.mockResolvedValue(undefined);
    mockFileUtils.readJsonFile.mockResolvedValue({});
    mockFileUtils.deleteFile.mockResolvedValue(undefined);
    mockFileUtils.listFiles.mockResolvedValue([]);
  });

  afterEach(async () => {
    if (coordinator) {
      await coordinator.shutdown();
    }
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      await coordinator.initialize();

      expect(mockFileUtils.ensureDirectoryExists).toHaveBeenCalledWith(mockCoordinationDir);
      expect(mockFileUtils.ensureDirectoryExists).toHaveBeenCalledWith(
        path.join(mockCoordinationDir, 'workers')
      );
      expect(mockFileUtils.ensureDirectoryExists).toHaveBeenCalledWith(
        path.join(mockCoordinationDir, 'locks')
      );
      expect(mockFileUtils.ensureDirectoryExists).toHaveBeenCalledWith(
        path.join(mockCoordinationDir, 'results')
      );
    });

    it('should register worker on initialization', async () => {
      await coordinator.initialize();

      expect(mockFileUtils.writeJsonFile).toHaveBeenCalledWith(
        expect.stringContaining('.worker'),
        expect.objectContaining({
          pid: process.pid,
          status: 'active',
          testCount: 0,
          resultsProcessed: 0,
        })
      );
    });

    it('should handle initialization errors', async () => {
      mockFileUtils.ensureDirectoryExists.mockRejectedValue(new Error('Directory creation failed'));

      await expect(coordinator.initialize()).rejects.toThrow('Directory creation failed');
    });
  });

  describe('distributed locking', () => {
    beforeEach(async () => {
      await coordinator.initialize();
    });

    it('should acquire lock successfully', async () => {
      mockFileUtils.readJsonFile.mockRejectedValue(new Error('File not found'));
      mockFileUtils.writeJsonFile.mockResolvedValue(undefined);

      const acquired = await coordinator.acquireLock('test-resource');

      expect(acquired).toBe(true);
      expect(mockFileUtils.writeJsonFile).toHaveBeenCalledWith(
        expect.stringContaining('test-resource.lock'),
        expect.objectContaining({
          resource: 'test-resource',
          workerId: expect.any(String),
        }),
        { flag: 'wx' }
      );
    });

    it('should fail to acquire lock when already held', async () => {
      const existingLock = {
        workerId: 'other-worker',
        resource: 'test-resource',
        acquiredAt: new Date(),
        expiresAt: new Date(Date.now() + 10000),
      };
      mockFileUtils.readJsonFile.mockResolvedValue(existingLock);

      const acquired = await coordinator.acquireLock('test-resource');

      expect(acquired).toBe(false);
    });

    it('should acquire expired lock', async () => {
      const expiredLock = {
        workerId: 'other-worker',
        resource: 'test-resource',
        acquiredAt: new Date(Date.now() - 20000),
        expiresAt: new Date(Date.now() - 10000),
      };
      mockFileUtils.readJsonFile.mockResolvedValue(expiredLock);
      mockFileUtils.writeJsonFile.mockResolvedValue(undefined);

      const acquired = await coordinator.acquireLock('test-resource');

      expect(acquired).toBe(true);
      expect(mockFileUtils.deleteFile).toHaveBeenCalled();
    });

    it('should release lock successfully', async () => {
      const ownLock = {
        workerId: (coordinator as any).workerId,
        resource: 'test-resource',
        acquiredAt: new Date(),
        expiresAt: new Date(Date.now() + 10000),
      };
      mockFileUtils.readJsonFile.mockResolvedValue(ownLock);

      const released = await coordinator.releaseLock('test-resource');

      expect(released).toBe(true);
      expect(mockFileUtils.deleteFile).toHaveBeenCalledWith(
        expect.stringContaining('test-resource.lock')
      );
    });

    it('should fail to release lock not owned', async () => {
      const otherLock = {
        workerId: 'other-worker',
        resource: 'test-resource',
        acquiredAt: new Date(),
        expiresAt: new Date(Date.now() + 10000),
      };
      mockFileUtils.readJsonFile.mockResolvedValue(otherLock);

      const released = await coordinator.releaseLock('test-resource');

      expect(released).toBe(false);
      expect(mockFileUtils.deleteFile).not.toHaveBeenCalled();
    });
  });

  describe('worker management', () => {
    beforeEach(async () => {
      await coordinator.initialize();
    });

    it('should get active workers', async () => {
      const mockWorkers = [
        {
          id: 'worker-1',
          pid: 1234,
          startTime: new Date(),
          lastHeartbeat: new Date(),
          status: 'active' as const,
          testCount: 5,
          resultsProcessed: 3,
        },
        {
          id: 'worker-2',
          pid: 5678,
          startTime: new Date(),
          lastHeartbeat: new Date(Date.now() - 20000), // Old heartbeat
          status: 'active' as const,
          testCount: 2,
          resultsProcessed: 1,
        },
      ];

      mockFileUtils.listFiles.mockResolvedValue(['worker-1.worker', 'worker-2.worker']);
      mockFileUtils.readJsonFile
        .mockResolvedValueOnce(mockWorkers[0])
        .mockResolvedValueOnce(mockWorkers[1]);

      const activeWorkers = await coordinator.getActiveWorkers();

      // Only worker-1 should be considered alive (recent heartbeat)
      expect(activeWorkers).toHaveLength(1);
      expect(activeWorkers[0]?.id).toBe('worker-1');
    });

    it('should handle worker file read errors', async () => {
      mockFileUtils.listFiles.mockResolvedValue(['invalid.worker']);
      mockFileUtils.readJsonFile.mockRejectedValue(new Error('Invalid JSON'));

      const activeWorkers = await coordinator.getActiveWorkers();

      expect(activeWorkers).toHaveLength(0);
    });

    it('should wait for all workers to complete', async () => {
      // Mock scenario where workers complete during wait
      let callCount = 0;
      mockFileUtils.listFiles.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve(['worker-1.worker']);
        }
        return Promise.resolve([]);
      });

      mockFileUtils.readJsonFile.mockResolvedValue({
        id: 'worker-1',
        status: 'active',
        lastHeartbeat: new Date(),
      });

      const completed = await coordinator.waitForAllWorkers(5000);

      expect(completed).toBe(true);
    });

    it('should timeout waiting for workers', async () => {
      mockFileUtils.listFiles.mockResolvedValue(['worker-1.worker']);
      mockFileUtils.readJsonFile.mockResolvedValue({
        id: 'worker-1',
        status: 'active',
        lastHeartbeat: new Date(),
      });

      const completed = await coordinator.waitForAllWorkers(100); // Very short timeout

      expect(completed).toBe(false);
    });
  });

  describe('result aggregation', () => {
    beforeEach(async () => {
      await coordinator.initialize();
    });

    it('should aggregate results from all workers', async () => {
      const mockResults1: TestResult[] = [
        { case_id: 1, status_id: 1, comment: 'Test 1 passed', assignedto_id: 1, elapsed: 10 },
        { case_id: 2, status_id: 5, comment: 'Test 2 failed', assignedto_id: 1, elapsed: 15 },
      ];
      const mockResults2: TestResult[] = [
        { case_id: 3, status_id: 1, comment: 'Test 3 passed', assignedto_id: 1, elapsed: 8 },
      ];

      mockFileUtils.listFiles.mockResolvedValue(['worker-1.results', 'worker-2.results']);
      mockFileUtils.readJsonFile
        .mockResolvedValueOnce(mockResults1)
        .mockResolvedValueOnce(mockResults2);

      const aggregatedResults = await coordinator.aggregateResults();

      expect(aggregatedResults).toHaveLength(3);
      expect(aggregatedResults).toEqual([...mockResults1, ...mockResults2]);
    });

    it('should handle result file read errors', async () => {
      mockFileUtils.listFiles.mockResolvedValue(['invalid.results']);
      mockFileUtils.readJsonFile.mockRejectedValue(new Error('Invalid JSON'));

      const aggregatedResults = await coordinator.aggregateResults();

      expect(aggregatedResults).toHaveLength(0);
    });

    it('should store results for worker', async () => {
      const testResults: TestResult[] = [
        { case_id: 1, status_id: 1, comment: 'Test passed', assignedto_id: 1, elapsed: 12 },
        { case_id: 2, status_id: 5, comment: 'Test failed', assignedto_id: 1, elapsed: 18 },
      ];

      await coordinator.storeResults(testResults);

      expect(mockFileUtils.writeJsonFile).toHaveBeenCalledWith(
        expect.stringContaining('.results'),
        testResults
      );
    });
  });

  describe('cleanup operations', () => {
    beforeEach(async () => {
      await coordinator.initialize();
    });

    it('should cleanup stale workers', async () => {
      const staleWorker = {
        id: 'stale-worker',
        lastHeartbeat: new Date(Date.now() - 120000), // 2 minutes ago
        status: 'active',
      };

      mockFileUtils.listFiles.mockResolvedValue(['stale-worker.worker']);
      mockFileUtils.readJsonFile.mockResolvedValue(staleWorker);

      // Trigger cleanup by calling private method through initialization
      await coordinator.initialize();

      expect(mockFileUtils.deleteFile).toHaveBeenCalledWith(
        expect.stringContaining('stale-worker.worker')
      );
    });

    it('should cleanup expired locks', async () => {
      const expiredLock = {
        workerId: 'some-worker',
        resource: 'expired-resource',
        expiresAt: new Date(Date.now() - 10000), // Expired 10 seconds ago
      };

      mockFileUtils.listFiles.mockResolvedValue(['expired-resource.lock']);
      mockFileUtils.readJsonFile.mockResolvedValue(expiredLock);

      await coordinator.initialize();

      expect(mockFileUtils.deleteFile).toHaveBeenCalledWith(
        expect.stringContaining('expired-resource.lock')
      );
    });

    it('should release all locks on shutdown', async () => {
      const ownLock = {
        workerId: (coordinator as any).workerId,
        resource: 'my-resource',
        expiresAt: new Date(Date.now() + 10000),
      };

      mockFileUtils.listFiles.mockResolvedValue(['my-resource.lock']);
      mockFileUtils.readJsonFile.mockResolvedValue(ownLock);

      await coordinator.shutdown();

      expect(mockFileUtils.deleteFile).toHaveBeenCalledWith(
        expect.stringContaining('my-resource.lock')
      );
    });
  });

  describe('error handling', () => {
    it('should handle lock acquisition errors gracefully', async () => {
      await coordinator.initialize();
      mockFileUtils.writeJsonFile.mockRejectedValue(new Error('Write failed'));

      const acquired = await coordinator.acquireLock('test-resource');

      expect(acquired).toBe(false);
    });

    it('should handle lock release errors gracefully', async () => {
      await coordinator.initialize();
      mockFileUtils.readJsonFile.mockRejectedValue(new Error('Read failed'));

      const released = await coordinator.releaseLock('test-resource');

      expect(released).toBe(false);
    });

    it('should handle shutdown errors gracefully', async () => {
      await coordinator.initialize();
      mockFileUtils.deleteFile.mockRejectedValue(new Error('Delete failed'));

      // Should not throw
      await expect(coordinator.shutdown()).resolves.not.toThrow();
    });
  });

  describe('configuration', () => {
    it('should use default configuration when not provided', () => {
      const defaultCoordinator = new WorkerCoordinator(testRailConfig);
      const config = (defaultCoordinator as any).config;

      expect(config.lockTimeout).toBe(30000);
      expect(config.heartbeatInterval).toBe(5000);
      expect(config.workerTimeout).toBe(60000);
      expect(config.maxRetries).toBe(3);
    });

    it('should merge provided configuration with defaults', () => {
      const customConfig = { lockTimeout: 15000, maxRetries: 5 };
      const customCoordinator = new WorkerCoordinator(testRailConfig, customConfig);
      const config = (customCoordinator as any).config;

      expect(config.lockTimeout).toBe(15000);
      expect(config.maxRetries).toBe(5);
      expect(config.heartbeatInterval).toBe(5000); // Default value
    });
  });
});
