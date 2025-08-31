import { Logger } from './Logger';
import { PerformanceMonitor } from './PerformanceMonitor';

export interface BatchConfig {
  maxBatchSize: number;
  maxWaitTime: number; // milliseconds
  maxConcurrency: number;
  retryAttempts: number;
  retryDelay: number; // milliseconds
}

export interface BatchItem<T, R> {
  id: string;
  data: T;
  resolve: (result: R) => void;
  reject: (error: Error) => void;
  timestamp: number;
}

export interface BatchResult<R> {
  success: boolean;
  results: R[];
  errors: Error[];
  processedCount: number;
  duration: number;
}

/**
 * BatchProcessor optimizes API calls by batching multiple requests together
 */
export class BatchProcessor<T, R> {
  private readonly logger: Logger;
  private readonly performanceMonitor: PerformanceMonitor;
  private readonly config: BatchConfig;
  private readonly processorFn: (items: T[]) => Promise<R[]>;
  private readonly pendingItems: BatchItem<T, R>[] = [];
  private batchTimer?: NodeJS.Timeout | undefined;
  private processing = false;
  private activeBatches = 0;

  constructor(processorFn: (items: T[]) => Promise<R[]>, config?: Partial<BatchConfig>) {
    this.logger = new Logger('BatchProcessor');
    this.performanceMonitor = PerformanceMonitor.getInstance();
    this.processorFn = processorFn;

    this.config = {
      maxBatchSize: 50,
      maxWaitTime: 1000, // 1 second
      maxConcurrency: 3,
      retryAttempts: 3,
      retryDelay: 1000, // 1 second
      ...config,
    };

    this.logger.debug('BatchProcessor initialized', { config: this.config });
  }

  /**
   * Add item to batch for processing
   */
  async process(data: T): Promise<R> {
    return new Promise<R>((resolve, reject) => {
      const item: BatchItem<T, R> = {
        id: `${Date.now()}-${Math.random()}`,
        data,
        resolve,
        reject,
        timestamp: Date.now(),
      };

      this.pendingItems.push(item);
      this.logger.debug('Item added to batch', {
        itemId: item.id,
        pendingCount: this.pendingItems.length,
      });

      // Check if we should process immediately
      if (this.shouldProcessBatch()) {
        this.processBatch();
      } else if (!this.batchTimer) {
        // Start timer for batch processing
        this.startBatchTimer();
      }
    });
  }

  /**
   * Process multiple items in batch
   */
  async processMultiple(items: T[]): Promise<R[]> {
    const promises = items.map(item => this.process(item));
    return Promise.all(promises);
  }

  /**
   * Flush all pending items immediately
   */
  async flush(): Promise<void> {
    if (this.pendingItems.length === 0) {
      return;
    }

    this.logger.info('Flushing batch processor', {
      pendingItems: this.pendingItems.length,
    });

    await this.processBatch();
  }

  /**
   * Get current batch statistics
   */
  getStats(): {
    pendingItems: number;
    activeBatches: number;
    processing: boolean;
    config: BatchConfig;
  } {
    return {
      pendingItems: this.pendingItems.length,
      activeBatches: this.activeBatches,
      processing: this.processing,
      config: { ...this.config },
    };
  }

  /**
   * Shutdown the batch processor
   */
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down batch processor');

    // Clear timer
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = undefined;
    }

    // Process remaining items
    await this.flush();

    // Wait for active batches to complete
    while (this.activeBatches > 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    this.logger.info('Batch processor shutdown completed');
  }

  // Private methods

  private shouldProcessBatch(): boolean {
    return (
      this.pendingItems.length >= this.config.maxBatchSize ||
      this.activeBatches < this.config.maxConcurrency
    );
  }

  private startBatchTimer(): void {
    this.batchTimer = setTimeout(() => {
      this.batchTimer = undefined;
      if (this.pendingItems.length > 0) {
        this.processBatch();
      }
    }, this.config.maxWaitTime);
  }

  private async processBatch(): Promise<void> {
    if (this.processing || this.pendingItems.length === 0) {
      return;
    }

    // Check concurrency limit
    if (this.activeBatches >= this.config.maxConcurrency) {
      this.logger.debug('Batch processing delayed due to concurrency limit', {
        activeBatches: this.activeBatches,
        maxConcurrency: this.config.maxConcurrency,
      });
      return;
    }

    this.processing = true;
    this.activeBatches++;

    // Clear timer if set
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = undefined;
    }

    // Extract batch items
    const batchSize = Math.min(this.config.maxBatchSize, this.pendingItems.length);
    const batchItems = this.pendingItems.splice(0, batchSize);
    const batchData = batchItems.map(item => item.data);

    this.logger.info('Processing batch', {
      batchSize: batchItems.length,
      remainingItems: this.pendingItems.length,
    });

    try {
      const result = await this.performanceMonitor.timeOperation(
        'batch-process',
        () => this.processBatchWithRetry(batchData),
        { batchSize: batchItems.length }
      );

      // Resolve all items in batch
      for (let i = 0; i < batchItems.length; i++) {
        const item = batchItems[i];
        if (item && i < result.length && result[i] !== undefined) {
          item.resolve(result[i]!);
        } else if (item) {
          item.reject(new Error('Batch processing incomplete'));
        }
      }

      this.logger.info('Batch processed successfully', {
        batchSize: batchItems.length,
        resultCount: result.length,
      });
    } catch (error) {
      this.logger.error('Batch processing failed', {
        error,
        batchSize: batchItems.length,
      });

      // Reject all items in batch
      for (const item of batchItems) {
        item.reject(error instanceof Error ? error : new Error(String(error)));
      }
    } finally {
      this.processing = false;
      this.activeBatches--;

      // Process next batch if items are pending
      if (this.pendingItems.length > 0) {
        // Use setTimeout to avoid stack overflow
        setTimeout(() => this.processBatch(), 0);
      }
    }
  }

  protected async processBatchWithRetry(batchData: T[]): Promise<R[]> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        this.logger.debug('Batch processing attempt', {
          attempt,
          maxAttempts: this.config.retryAttempts,
          batchSize: batchData.length,
        });

        const result = await this.processorFn(batchData);

        if (attempt > 1) {
          this.logger.info('Batch processing succeeded after retry', {
            attempt,
            batchSize: batchData.length,
          });
        }

        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        this.logger.warn('Batch processing attempt failed', {
          attempt,
          error: lastError.message,
          batchSize: batchData.length,
        });

        // Wait before retry (except for last attempt)
        if (attempt < this.config.retryAttempts) {
          const delay = this.config.retryDelay * 2 ** (attempt - 1); // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error('Batch processing failed after all retry attempts');
  }
}

/**
 * Utility function to create a batch processor with common configuration
 */
export function createBatchProcessor<T, R>(
  processorFn: (items: T[]) => Promise<R[]>,
  config?: Partial<BatchConfig>
): BatchProcessor<T, R> {
  return new BatchProcessor(processorFn, config);
}

/**
 * Batch processor for API calls with rate limiting awareness
 */
export class RateLimitedBatchProcessor<T, R> extends BatchProcessor<T, R> {
  private lastRequestTime = 0;
  private readonly minRequestInterval: number;

  constructor(
    processorFn: (items: T[]) => Promise<R[]>,
    minRequestInterval: number = 100, // minimum ms between requests
    config?: Partial<BatchConfig>
  ) {
    // Wrap the processor function to add rate limiting
    const rateLimitedProcessor = async (items: T[]): Promise<R[]> => {
      // Ensure minimum interval between requests
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;

      if (timeSinceLastRequest < minRequestInterval) {
        const waitTime = minRequestInterval - timeSinceLastRequest;
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }

      this.lastRequestTime = Date.now();
      return processorFn(items);
    };

    super(rateLimitedProcessor, config);
    this.minRequestInterval = minRequestInterval;
  }
}
