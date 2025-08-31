import { Logger } from '../utils/Logger';
import { ConfigManager } from '../config/TestRailConfig';
import { TestResult } from '../types';
import { FileUtils } from '../utils/FileUtils';
import * as path from 'path';
import * as crypto from 'crypto';

export interface WorkerInfo {
  id: string;
  pid: number;
  startTime: Date;
  lastHeartbeat: Date;
  status: 'active' | 'idle' | 'failed' | 'completed';
  testCount: number;
  resultsProcessed: number;
}

export interface WorkerLock {
  workerId: string;
  resource: string;
  acquiredAt: Date;
  expiresAt: Date;
}

export interface CoordinationConfig {
  lockTimeout: number; // milliseconds
  heartbeatInterval: number; // milliseconds
  workerTimeout: number; // milliseconds
  maxRetries: number;
  coordinationDir: string;
}

/**
 * WorkerCoordinator manages multi-worker synchronization for TestRail operations.
 * Provides distributed locking, health monitoring, and result aggregation.
 */
export class WorkerCoordinator {
  private readonly logger: Logger;
  private readonly config: CoordinationConfig;
  private readonly workerId: string;
  private readonly coordinationDir: string;
  private heartbeatTimer?: NodeJS.Timeout;
  private isShuttingDown = false;

  constructor(
    testRailConfig: ConfigManager,
    coordinationConfig?: Partial<CoordinationConfig>
  ) {
    this.logger = new Logger('WorkerCoordinator');
    this.workerId = this.generateWorkerId();
    
    this.config = {
      lockTimeout: 30000, // 30 seconds
      heartbeatInterval: 5000, // 5 seconds
      workerTimeout: 60000, // 1 minute
      maxRetries: 3,
      coordinationDir: path.join(process.cwd(), '.testrail-coordination'),
      ...coordinationConfig
    };

    this.coordinationDir = this.config.coordinationDir;
    this.logger.info('WorkerCoordinator initialized', {
      workerId: this.workerId,
      config: this.config
    });
  }

  /**
   * Initialize the worker coordinator
   */
  async initialize(): Promise<void> {
    try {
      // Ensure coordination directory exists
      await FileUtils.ensureDirectoryExists(this.coordinationDir);
      await FileUtils.ensureDirectoryExists(path.join(this.coordinationDir, 'workers'));
      await FileUtils.ensureDirectoryExists(path.join(this.coordinationDir, 'locks'));
      await FileUtils.ensureDirectoryExists(path.join(this.coordinationDir, 'results'));

      // Register this worker
      await this.registerWorker();

      // Start heartbeat
      this.startHeartbeat();

      // Clean up stale workers and locks
      await this.cleanupStaleResources();

      this.logger.info('WorkerCoordinator initialized successfully', {
        workerId: this.workerId
      });
    } catch (error) {
      this.logger.error('Failed to initialize WorkerCoordinator', { error });
      throw error;
    }
  }

  /**
   * Shutdown the worker coordinator
   */
  async shutdown(): Promise<void> {
    this.isShuttingDown = true;

    try {
      // Stop heartbeat
      if (this.heartbeatTimer) {
        clearInterval(this.heartbeatTimer);
        this.heartbeatTimer = undefined as any;
      }

      // Release all locks held by this worker
      await this.releaseAllLocks();

      // Unregister worker
      await this.unregisterWorker();

      this.logger.info('WorkerCoordinator shutdown completed', {
        workerId: this.workerId
      });
    } catch (error) {
      this.logger.error('Error during WorkerCoordinator shutdown', { error });
      throw error;
    }
  }

  /**
   * Acquire a distributed lock for a resource
   */
  async acquireLock(resource: string, timeout?: number): Promise<boolean> {
    const lockTimeout = timeout || this.config.lockTimeout;
    const lockFile = path.join(this.coordinationDir, 'locks', `${resource}.lock`);
    const expiresAt = new Date(Date.now() + lockTimeout);

    const lock: WorkerLock = {
      workerId: this.workerId,
      resource,
      acquiredAt: new Date(),
      expiresAt
    };

    try {
      // Try to acquire lock atomically
      const acquired = await this.tryAcquireLock(lockFile, lock);
      
      if (acquired) {
        this.logger.debug('Lock acquired', { resource, workerId: this.workerId });
        return true;
      }

      this.logger.debug('Lock acquisition failed', { resource, workerId: this.workerId });
      return false;
    } catch (error) {
      this.logger.error('Error acquiring lock', { resource, error });
      return false;
    }
  }

  /**
   * Release a distributed lock
   */
  async releaseLock(resource: string): Promise<boolean> {
    const lockFile = path.join(this.coordinationDir, 'locks', `${resource}.lock`);

    try {
      // Check if we own the lock
      const currentLock = await this.getCurrentLock(lockFile);
      if (!currentLock || currentLock.workerId !== this.workerId) {
        this.logger.warn('Attempted to release lock not owned by this worker', {
          resource,
          workerId: this.workerId,
          lockOwner: currentLock?.workerId
        });
        return false;
      }

      // Remove lock file
      await FileUtils.deleteFile(lockFile);
      this.logger.debug('Lock released', { resource, workerId: this.workerId });
      return true;
    } catch (error) {
      this.logger.error('Error releasing lock', { resource, error });
      return false;
    }
  }

  /**
   * Get list of active workers
   */
  async getActiveWorkers(): Promise<WorkerInfo[]> {
    const workersDir = path.join(this.coordinationDir, 'workers');
    const workers: WorkerInfo[] = [];

    try {
      const workerFiles = await FileUtils.listFiles(workersDir);
      
      for (const file of workerFiles) {
        if (file.endsWith('.worker')) {
          try {
            const workerPath = path.join(workersDir, file);
            const workerData = await FileUtils.readJsonFile<WorkerInfo>(workerPath);
            
            // Check if worker is still alive
            if (this.isWorkerAlive(workerData)) {
              workers.push(workerData);
            }
          } catch (error) {
            this.logger.warn('Failed to read worker file', { file, error });
          }
        }
      }

      return workers;
    } catch (error) {
      this.logger.error('Error getting active workers', { error });
      return [];
    }
  }

  /**
   * Aggregate results from all workers
   */
  async aggregateResults(): Promise<TestResult[]> {
    const resultsDir = path.join(this.coordinationDir, 'results');
    const allResults: TestResult[] = [];

    try {
      const resultFiles = await FileUtils.listFiles(resultsDir);
      
      for (const file of resultFiles) {
        if (file.endsWith('.results')) {
          try {
            const resultsPath = path.join(resultsDir, file);
            const results = await FileUtils.readJsonFile<TestResult[]>(resultsPath);
            allResults.push(...results);
          } catch (error) {
            this.logger.warn('Failed to read results file', { file, error });
          }
        }
      }

      this.logger.info('Results aggregated', {
        totalResults: allResults.length,
        fileCount: resultFiles.length
      });

      return allResults;
    } catch (error) {
      this.logger.error('Error aggregating results', { error });
      return [];
    }
  }

  /**
   * Store results for this worker
   */
  async storeResults(results: TestResult[]): Promise<void> {
    const resultsFile = path.join(
      this.coordinationDir,
      'results',
      `${this.workerId}.results`
    );

    try {
      await FileUtils.writeJsonFile(resultsFile, results);
      
      // Update worker info
      await this.updateWorkerInfo({ resultsProcessed: results.length });
      
      this.logger.info('Results stored', {
        workerId: this.workerId,
        resultCount: results.length
      });
    } catch (error) {
      this.logger.error('Error storing results', { error });
      throw error;
    }
  }

  /**
   * Wait for all workers to complete
   */
  async waitForAllWorkers(timeout: number = 300000): Promise<boolean> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const workers = await this.getActiveWorkers();
      const activeWorkers = workers.filter(w => w.status === 'active');
      
      if (activeWorkers.length === 0) {
        this.logger.info('All workers completed');
        return true;
      }

      this.logger.debug('Waiting for workers to complete', {
        activeWorkers: activeWorkers.length,
        totalWorkers: workers.length
      });

      // Wait before checking again
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    this.logger.warn('Timeout waiting for workers to complete');
    return false;
  }

  // Private methods

  private generateWorkerId(): string {
    const timestamp = Date.now().toString();
    const random = crypto.randomBytes(4).toString('hex');
    const pid = process.pid.toString();
    return `worker-${timestamp}-${pid}-${random}`;
  }

  private async registerWorker(): Promise<void> {
    const workerFile = path.join(
      this.coordinationDir,
      'workers',
      `${this.workerId}.worker`
    );

    const workerInfo: WorkerInfo = {
      id: this.workerId,
      pid: process.pid,
      startTime: new Date(),
      lastHeartbeat: new Date(),
      status: 'active',
      testCount: 0,
      resultsProcessed: 0
    };

    await FileUtils.writeJsonFile(workerFile, workerInfo);
  }

  private async unregisterWorker(): Promise<void> {
    const workerFile = path.join(
      this.coordinationDir,
      'workers',
      `${this.workerId}.worker`
    );

    try {
      await FileUtils.deleteFile(workerFile);
    } catch (error) {
      this.logger.warn('Failed to unregister worker', { error });
    }
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(async () => {
      if (this.isShuttingDown) return;

      try {
        await this.updateWorkerInfo({ lastHeartbeat: new Date() });
      } catch (error) {
        this.logger.error('Heartbeat failed', { error });
      }
    }, this.config.heartbeatInterval);
  }

  private async updateWorkerInfo(updates: Partial<WorkerInfo>): Promise<void> {
    const workerFile = path.join(
      this.coordinationDir,
      'workers',
      `${this.workerId}.worker`
    );

    try {
      const currentInfo = await FileUtils.readJsonFile<WorkerInfo>(workerFile);
      const updatedInfo = { ...currentInfo, ...updates };
      await FileUtils.writeJsonFile(workerFile, updatedInfo);
    } catch (error) {
      this.logger.error('Failed to update worker info', { error });
    }
  }

  private async tryAcquireLock(lockFile: string, lock: WorkerLock): Promise<boolean> {
    try {
      // Check if lock file exists and is still valid
      const existingLock = await this.getCurrentLock(lockFile);
      
      if (existingLock) {
        // Check if lock has expired
        if (new Date() > existingLock.expiresAt) {
          // Lock expired, remove it
          await FileUtils.deleteFile(lockFile);
        } else {
          // Lock is still valid and owned by another worker
          return false;
        }
      }

      // Try to create lock file atomically
      await FileUtils.writeJsonFile(lockFile, lock, { flag: 'wx' });
      return true;
    } catch (error: any) {
      if (error.code === 'EEXIST') {
        // Lock file was created by another process
        return false;
      }
      throw error;
    }
  }

  private async getCurrentLock(lockFile: string): Promise<WorkerLock | null> {
    try {
      return await FileUtils.readJsonFile<WorkerLock>(lockFile);
    } catch (error) {
      return null;
    }
  }

  private async releaseAllLocks(): Promise<void> {
    const locksDir = path.join(this.coordinationDir, 'locks');
    
    try {
      const lockFiles = await FileUtils.listFiles(locksDir);
      
      for (const file of lockFiles) {
        if (file.endsWith('.lock')) {
          const lockFile = path.join(locksDir, file);
          const lock = await this.getCurrentLock(lockFile);
          
          if (lock && lock.workerId === this.workerId) {
            await FileUtils.deleteFile(lockFile);
          }
        }
      }
    } catch (error) {
      this.logger.error('Error releasing all locks', { error });
    }
  }

  private async cleanupStaleResources(): Promise<void> {
    await this.cleanupStaleWorkers();
    await this.cleanupExpiredLocks();
  }

  private async cleanupStaleWorkers(): Promise<void> {
    const workersDir = path.join(this.coordinationDir, 'workers');
    
    try {
      const workerFiles = await FileUtils.listFiles(workersDir);
      
      for (const file of workerFiles) {
        if (file.endsWith('.worker')) {
          const workerPath = path.join(workersDir, file);
          const worker = await FileUtils.readJsonFile<WorkerInfo>(workerPath);
          
          if (!this.isWorkerAlive(worker)) {
            await FileUtils.deleteFile(workerPath);
            this.logger.info('Cleaned up stale worker', { workerId: worker.id });
          }
        }
      }
    } catch (error) {
      this.logger.error('Error cleaning up stale workers', { error });
    }
  }

  private async cleanupExpiredLocks(): Promise<void> {
    const locksDir = path.join(this.coordinationDir, 'locks');
    
    try {
      const lockFiles = await FileUtils.listFiles(locksDir);
      
      for (const file of lockFiles) {
        if (file.endsWith('.lock')) {
          const lockFile = path.join(locksDir, file);
          const lock = await this.getCurrentLock(lockFile);
          
          if (lock && new Date() > lock.expiresAt) {
            await FileUtils.deleteFile(lockFile);
            this.logger.info('Cleaned up expired lock', { resource: lock.resource });
          }
        }
      }
    } catch (error) {
      this.logger.error('Error cleaning up expired locks', { error });
    }
  }

  private isWorkerAlive(worker: WorkerInfo): boolean {
    const now = Date.now();
    const lastHeartbeat = new Date(worker.lastHeartbeat).getTime();
    const timeSinceHeartbeat = now - lastHeartbeat;
    
    return timeSinceHeartbeat < this.config.workerTimeout;
  }
}