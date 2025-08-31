import { BatchProcessor, createBatchProcessor, RateLimitedBatchProcessor } from '../../../src/utils/BatchProcessor';

// Mock dependencies
jest.mock('../../../src/utils/Logger');
jest.mock('../../../src/utils/PerformanceMonitor', () => ({
  PerformanceMonitor: {
    getInstance: jest.fn(() => ({
      timeOperation: jest.fn((name, operation) => operation())
    }))
  }
}));

describe('BatchProcessor', () => {
  let processor: BatchProcessor<number, string>;
  let mockProcessorFn: jest.Mock<Promise<string[]>, [number[]]>;

  beforeEach(() => {
    mockProcessorFn = jest.fn();
    processor = new BatchProcessor(mockProcessorFn, {
      maxBatchSize: 3,
      maxWaitTime: 100,
      maxConcurrency: 2,
      retryAttempts: 2,
      retryDelay: 50
    });
  });

  afterEach(async () => {
    await processor.shutdown();
  });

  describe('basic batch processing', () => {
    it('should process single item', async () => {
      mockProcessorFn.mockResolvedValue(['result-1']);

      const result = await processor.process(1);

      expect(result).toBe('result-1');
      expect(mockProcessorFn).toHaveBeenCalledWith([1]);
    });

    it('should batch multiple items together', async () => {
      mockProcessorFn.mockResolvedValue(['result-1', 'result-2', 'result-3']);

      const promises = [
        processor.process(1),
        processor.process(2),
        processor.process(3)
      ];

      const results = await Promise.all(promises);

      expect(results).toEqual(['result-1', 'result-2', 'result-3']);
      expect(mockProcessorFn).toHaveBeenCalledTimes(1);
      expect(mockProcessorFn).toHaveBeenCalledWith([1, 2, 3]);
    });

    it('should process items when batch size is reached', async () => {
      mockProcessorFn.mockResolvedValue(['result-1', 'result-2', 'result-3']);

      // Add items one by one
      const promise1 = processor.process(1);
      const promise2 = processor.process(2);
      const promise3 = processor.process(3); // Should trigger batch processing

      const results = await Promise.all([promise1, promise2, promise3]);

      expect(results).toEqual(['result-1', 'result-2', 'result-3']);
      expect(mockProcessorFn).toHaveBeenCalledTimes(1);
    });

    it('should process items after wait time expires', async () => {
      mockProcessorFn.mockResolvedValue(['result-1']);

      const promise = processor.process(1);

      // Wait for batch timer to trigger
      await new Promise(resolve => setTimeout(resolve, 150));

      const result = await promise;

      expect(result).toBe('result-1');
      expect(mockProcessorFn).toHaveBeenCalledWith([1]);
    });
  });

  describe('multiple batch processing', () => {
    it('should process multiple items in batch', async () => {
      const items = [1, 2, 3, 4, 5];
      const expectedResults = ['result-1', 'result-2', 'result-3', 'result-4', 'result-5'];
      
      mockProcessorFn.mockResolvedValue(expectedResults);

      const results = await processor.processMultiple(items);

      expect(results).toEqual(expectedResults);
    });

    it('should handle empty array', async () => {
      const results = await processor.processMultiple([]);

      expect(results).toEqual([]);
      expect(mockProcessorFn).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should reject all items in batch when processing fails', async () => {
      const error = new Error('Processing failed');
      mockProcessorFn.mockRejectedValue(error);

      const promises = [
        processor.process(1),
        processor.process(2)
      ];

      await expect(Promise.all(promises)).rejects.toThrow('Processing failed');
    });

    it('should retry failed operations', async () => {
      const error = new Error('Temporary failure');
      mockProcessorFn
        .mockRejectedValueOnce(error)
        .mockResolvedValue(['result-1']);

      const result = await processor.process(1);

      expect(result).toBe('result-1');
      expect(mockProcessorFn).toHaveBeenCalledTimes(2);
    });

    it('should fail after max retry attempts', async () => {
      const error = new Error('Persistent failure');
      mockProcessorFn.mockRejectedValue(error);

      await expect(processor.process(1)).rejects.toThrow('Persistent failure');
      expect(mockProcessorFn).toHaveBeenCalledTimes(2); // Initial + 1 retry
    });

    it('should handle incomplete results', async () => {
      mockProcessorFn.mockResolvedValue(['result-1']); // Only 1 result for 2 items

      const promises = [
        processor.process(1),
        processor.process(2)
      ];

      const results = await Promise.allSettled(promises);

      expect(results[0]?.status).toBe('fulfilled');
      expect((results[0] as PromiseFulfilledResult<string>).value).toBe('result-1');
      expect(results[1]?.status).toBe('rejected');
      expect((results[1] as PromiseRejectedResult).reason.message).toBe('Batch processing incomplete');
    });
  });

  describe('concurrency control', () => {
    it('should respect max concurrency limit', async () => {
      let activeProcessing = 0;
      let maxConcurrentProcessing = 0;

      mockProcessorFn.mockImplementation(async (items) => {
        activeProcessing++;
        maxConcurrentProcessing = Math.max(maxConcurrentProcessing, activeProcessing);
        
        await new Promise(resolve => setTimeout(resolve, 50));
        
        activeProcessing--;
        return items.map((_, i) => `result-${i}`);
      });

      // Start multiple batches
      const promises = [];
      for (let i = 0; i < 9; i++) { // 3 batches of 3 items each
        promises.push(processor.process(i));
      }

      await Promise.all(promises);

      expect(maxConcurrentProcessing).toBeLessThanOrEqual(2); // maxConcurrency = 2
    });

    it('should queue batches when concurrency limit is reached', async () => {
      let processingOrder: number[] = [];

      mockProcessorFn.mockImplementation(async (items) => {
        processingOrder.push(items[0] || 0);
        await new Promise(resolve => setTimeout(resolve, 30));
        return items.map(item => `result-${item}`);
      });

      // Start items that will create multiple batches
      const promises = [];
      for (let i = 0; i < 6; i++) {
        promises.push(processor.process(i));
      }

      await Promise.all(promises);

      expect(processingOrder).toHaveLength(2); // 2 batches processed
    });
  });

  describe('flush operations', () => {
    it('should flush pending items immediately', async () => {
      mockProcessorFn.mockResolvedValue(['result-1', 'result-2']);

      // Add items without triggering batch
      const promise1 = processor.process(1);
      const promise2 = processor.process(2);

      // Flush immediately
      await processor.flush();

      const results = await Promise.all([promise1, promise2]);

      expect(results).toEqual(['result-1', 'result-2']);
      expect(mockProcessorFn).toHaveBeenCalledWith([1, 2]);
    });

    it('should handle flush with no pending items', async () => {
      await expect(processor.flush()).resolves.not.toThrow();
      expect(mockProcessorFn).not.toHaveBeenCalled();
    });
  });

  describe('statistics and monitoring', () => {
    it('should provide current statistics', () => {
      const stats = processor.getStats();

      expect(stats).toEqual({
        pendingItems: 0,
        activeBatches: 0,
        processing: false,
        config: expect.objectContaining({
          maxBatchSize: 3,
          maxWaitTime: 100,
          maxConcurrency: 2,
          retryAttempts: 2,
          retryDelay: 50
        })
      });
    });

    it('should update statistics during processing', async () => {
      mockProcessorFn.mockImplementation(async (items) => {
        // Check stats during processing
        const stats = processor.getStats();
        expect(stats.activeBatches).toBeGreaterThan(0);
        
        return items.map(item => `result-${item}`);
      });

      await processor.process(1);
    });
  });

  describe('shutdown', () => {
    it('should process remaining items on shutdown', async () => {
      mockProcessorFn.mockResolvedValue(['result-1', 'result-2']);

      const promise1 = processor.process(1);
      const promise2 = processor.process(2);

      await processor.shutdown();

      const results = await Promise.all([promise1, promise2]);
      expect(results).toEqual(['result-1', 'result-2']);
    });

    it('should wait for active batches to complete', async () => {
      let processingComplete = false;

      mockProcessorFn.mockImplementation(async (items) => {
        await new Promise(resolve => setTimeout(resolve, 100));
        processingComplete = true;
        return items.map(item => `result-${item}`);
      });

      const promise = processor.process(1);
      
      // Start shutdown while processing
      const shutdownPromise = processor.shutdown();

      expect(processingComplete).toBe(false);
      
      await shutdownPromise;
      await promise;

      expect(processingComplete).toBe(true);
    });
  });

  describe('utility functions', () => {
    it('should create batch processor with factory function', () => {
      const factoryProcessor = createBatchProcessor(
        async (items: number[]) => items.map(i => `result-${i}`),
        { maxBatchSize: 5 }
      );

      expect(factoryProcessor).toBeInstanceOf(BatchProcessor);
      factoryProcessor.shutdown();
    });
  });

  describe('edge cases', () => {
    it('should handle rapid successive operations', async () => {
      mockProcessorFn.mockImplementation(async (items) => 
        items.map(item => `result-${item}`)
      );

      const promises = [];
      for (let i = 0; i < 50; i++) {
        promises.push(processor.process(i));
      }

      const results = await Promise.all(promises);

      expect(results).toHaveLength(50);
      expect(results[0]).toBe('result-0');
      expect(results[49]).toBe('result-49');
    });

    it('should handle processor function that returns fewer results', async () => {
      mockProcessorFn.mockResolvedValue([]); // Empty results

      await expect(processor.process(1)).rejects.toThrow('Batch processing incomplete');
    });

    it('should handle processor function that throws non-Error', async () => {
      mockProcessorFn.mockRejectedValue('String error');

      await expect(processor.process(1)).rejects.toThrow('String error');
    });
  });
});

describe('RateLimitedBatchProcessor', () => {
  let processor: RateLimitedBatchProcessor<number, string>;
  let mockProcessorFn: jest.Mock<Promise<string[]>, [number[]]>;

  beforeEach(() => {
    mockProcessorFn = jest.fn();
    processor = new RateLimitedBatchProcessor(
      mockProcessorFn,
      100, // 100ms minimum interval
      {
        maxBatchSize: 2,
        maxWaitTime: 50,
        maxConcurrency: 1,
        retryAttempts: 1,
        retryDelay: 10
      }
    );
  });

  afterEach(async () => {
    await processor.shutdown();
  });

  it('should enforce minimum request interval', async () => {
    const timestamps: number[] = [];

    mockProcessorFn.mockImplementation(async (items) => {
      timestamps.push(Date.now());
      return items.map(item => `result-${item}`);
    });

    // Process two batches
    const promises = [
      processor.process(1),
      processor.process(2),
      processor.process(3),
      processor.process(4)
    ];

    await Promise.all(promises);

    expect(timestamps).toHaveLength(2);
    if (timestamps.length >= 2) {
      const interval = (timestamps[1] || 0) - (timestamps[0] || 0);
      expect(interval).toBeGreaterThanOrEqual(90); // Allow some timing variance
    }
  });

  it('should work correctly with single batch', async () => {
    mockProcessorFn.mockResolvedValue(['result-1']);

    const result = await processor.process(1);

    expect(result).toBe('result-1');
    expect(mockProcessorFn).toHaveBeenCalledWith([1]);
  });
});