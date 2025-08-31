import { CacheManager } from '../../../src/utils/CacheManager';

// Mock Logger
jest.mock('../../../src/utils/Logger');

describe('CacheManager', () => {
  let cache: CacheManager<string>;

  beforeEach(() => {
    cache = new CacheManager<string>({
      maxSize: 5,
      maxMemory: 1024 * 1024, // 1MB
      defaultTtl: 1000, // 1 second
      cleanupInterval: 100, // 100ms
      enableStats: true,
    });
  });

  afterEach(() => {
    cache.shutdown();
  });

  describe('basic operations', () => {
    it('should set and get values', () => {
      cache.set('key1', 'value1');
      const value = cache.get('key1');

      expect(value).toBe('value1');
    });

    it('should return null for non-existent keys', () => {
      const value = cache.get('non-existent');
      expect(value).toBeNull();
    });

    it('should delete values', () => {
      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');

      const deleted = cache.delete('key1');
      expect(deleted).toBe(true);
      expect(cache.get('key1')).toBeNull();
    });

    it('should return false when deleting non-existent key', () => {
      const deleted = cache.delete('non-existent');
      expect(deleted).toBe(false);
    });

    it('should check if key exists', () => {
      cache.set('key1', 'value1');

      expect(cache.has('key1')).toBe(true);
      expect(cache.has('non-existent')).toBe(false);
    });

    it('should clear all entries', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      expect(cache.get('key1')).toBe('value1');
      expect(cache.get('key2')).toBe('value2');

      cache.clear();

      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBeNull();
    });
  });

  describe('TTL (Time To Live)', () => {
    it('should expire entries after TTL', async () => {
      cache.set('key1', 'value1', 50); // 50ms TTL

      expect(cache.get('key1')).toBe('value1');

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 60));

      expect(cache.get('key1')).toBeNull();
    });

    it('should use default TTL when not specified', async () => {
      cache.set('key1', 'value1'); // Uses default TTL (1000ms)

      expect(cache.get('key1')).toBe('value1');

      // Should still be valid after 100ms
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(cache.get('key1')).toBe('value1');
    });

    it('should update TTL for existing entries', () => {
      cache.set('key1', 'value1', 1000);

      const updated = cache.setTtl('key1', 2000);
      expect(updated).toBe(true);

      const ttl = cache.getTtl('key1');
      expect(ttl).toBeGreaterThan(1500); // Should be close to 2000ms
    });

    it('should return false when setting TTL for non-existent key', () => {
      const updated = cache.setTtl('non-existent', 1000);
      expect(updated).toBe(false);
    });

    it('should return null TTL for non-existent key', () => {
      const ttl = cache.getTtl('non-existent');
      expect(ttl).toBeNull();
    });

    it('should return 0 TTL for expired entries', async () => {
      cache.set('key1', 'value1', 50);

      await new Promise(resolve => setTimeout(resolve, 60));

      const ttl = cache.getTtl('key1');
      expect(ttl).toBe(0);
    });
  });

  describe('get or set pattern', () => {
    it('should get existing value', async () => {
      cache.set('key1', 'existing-value');

      const value = await cache.getOrSet('key1', async () => 'new-value');

      expect(value).toBe('existing-value');
    });

    it('should set and return new value when key does not exist', async () => {
      const value = await cache.getOrSet('key1', async () => 'new-value');

      expect(value).toBe('new-value');
      expect(cache.get('key1')).toBe('new-value');
    });

    it('should handle factory function errors', async () => {
      const error = new Error('Factory failed');

      await expect(
        cache.getOrSet('key1', async () => {
          throw error;
        })
      ).rejects.toThrow('Factory failed');

      expect(cache.get('key1')).toBeNull();
    });

    it('should work with synchronous factory', () => {
      const value = cache.getOrSetSync('key1', () => 'sync-value');

      expect(value).toBe('sync-value');
      expect(cache.get('key1')).toBe('sync-value');
    });
  });

  describe('size and memory management', () => {
    it('should evict LRU entries when max size exceeded', () => {
      // Fill cache to max size
      for (let i = 1; i <= 5; i++) {
        cache.set(`key${i}`, `value${i}`);
      }

      // Access key2 to make it more recently used
      cache.get('key2');

      // Add one more entry, should evict key1 (least recently used)
      cache.set('key6', 'value6');

      expect(cache.get('key1')).toBeNull(); // Should be evicted
      expect(cache.get('key2')).toBe('value2'); // Should still exist
      expect(cache.get('key6')).toBe('value6'); // Should exist
    });

    it('should track access count', () => {
      cache.set('key1', 'value1');

      cache.get('key1');
      cache.get('key1');
      cache.get('key1');

      const stats = cache.getStats();
      expect(stats.hitCount).toBe(3);
    });

    it('should track cache misses', () => {
      cache.get('non-existent-1');
      cache.get('non-existent-2');

      const stats = cache.getStats();
      expect(stats.missCount).toBe(2);
    });
  });

  describe('pattern operations', () => {
    beforeEach(() => {
      cache.set('user:1', 'user1-data');
      cache.set('user:2', 'user2-data');
      cache.set('post:1', 'post1-data');
      cache.set('post:2', 'post2-data');
    });

    it('should get entries by pattern', () => {
      const userEntries = cache.getByPattern(/^user:/);

      expect(userEntries).toHaveLength(2);
      expect(userEntries.map(e => e.key)).toContain('user:1');
      expect(userEntries.map(e => e.key)).toContain('user:2');
      expect(userEntries.map(e => e.value)).toContain('user1-data');
      expect(userEntries.map(e => e.value)).toContain('user2-data');
    });

    it('should delete entries by pattern', () => {
      const deletedCount = cache.deleteByPattern(/^user:/);

      expect(deletedCount).toBe(2);
      expect(cache.get('user:1')).toBeNull();
      expect(cache.get('user:2')).toBeNull();
      expect(cache.get('post:1')).toBe('post1-data'); // Should remain
      expect(cache.get('post:2')).toBe('post2-data'); // Should remain
    });

    it('should not return expired entries in pattern search', async () => {
      cache.set('temp:1', 'temp-data', 50); // 50ms TTL

      await new Promise(resolve => setTimeout(resolve, 60));

      const tempEntries = cache.getByPattern(/^temp:/);
      expect(tempEntries).toHaveLength(0);
    });
  });

  describe('statistics', () => {
    beforeEach(() => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      cache.get('key1'); // Hit
      cache.get('key1'); // Hit
      cache.get('non-existent'); // Miss
    });

    it('should calculate correct statistics', () => {
      const stats = cache.getStats();

      expect(stats.totalEntries).toBe(2);
      expect(stats.hitCount).toBe(2);
      expect(stats.missCount).toBe(1);
      expect(stats.hitRate).toBeCloseTo(2 / 3, 2);
      expect(stats.totalSize).toBeGreaterThan(0);
      expect(stats.oldestEntry).toBeDefined();
      expect(stats.newestEntry).toBeDefined();
    });

    it('should track evictions', () => {
      // Fill cache beyond max size to trigger evictions
      for (let i = 1; i <= 10; i++) {
        cache.set(`evict-key${i}`, `evict-value${i}`);
      }

      const stats = cache.getStats();
      expect(stats.evictionCount).toBeGreaterThan(0);
    });

    it('should handle empty cache statistics', () => {
      const emptyCache = new CacheManager();
      const stats = emptyCache.getStats();

      expect(stats.totalEntries).toBe(0);
      expect(stats.hitCount).toBe(0);
      expect(stats.missCount).toBe(0);
      expect(stats.hitRate).toBe(0);
      expect(stats.oldestEntry).toBeUndefined();
      expect(stats.newestEntry).toBeUndefined();

      emptyCache.shutdown();
    });
  });

  describe('cleanup operations', () => {
    it('should automatically cleanup expired entries', async () => {
      cache.set('key1', 'value1', 50); // 50ms TTL
      cache.set('key2', 'value2', 200); // 200ms TTL

      expect(cache.get('key1')).toBe('value1');
      expect(cache.get('key2')).toBe('value2');

      // Wait for first key to expire and cleanup to run
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(cache.get('key1')).toBeNull(); // Should be cleaned up
      expect(cache.get('key2')).toBe('value2'); // Should still exist
    });

    it('should manually cleanup expired entries', async () => {
      cache.set('key1', 'value1', 50);
      cache.set('key2', 'value2', 50);

      await new Promise(resolve => setTimeout(resolve, 60));

      const removedCount = cache.cleanup();
      expect(removedCount).toBe(2);
    });

    it('should return 0 when no entries to cleanup', () => {
      cache.set('key1', 'value1', 10000); // Long TTL

      const removedCount = cache.cleanup();
      expect(removedCount).toBe(0);
    });
  });

  describe('utility methods', () => {
    beforeEach(() => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');
    });

    it('should return all keys', () => {
      const keys = cache.keys();

      expect(keys).toHaveLength(3);
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
      expect(keys).toContain('key3');
    });

    it('should handle shutdown gracefully', () => {
      expect(() => cache.shutdown()).not.toThrow();

      // After shutdown, cache should be empty
      expect(cache.get('key1')).toBeNull();
    });
  });

  describe('configuration', () => {
    it('should use default configuration when not provided', () => {
      const defaultCache = new CacheManager();

      // Test that it works with defaults
      defaultCache.set('test', 'value');
      expect(defaultCache.get('test')).toBe('value');

      defaultCache.shutdown();
    });

    it('should merge provided configuration with defaults', () => {
      const customCache = new CacheManager({
        maxSize: 10,
        defaultTtl: 5000,
      });

      customCache.set('test', 'value');
      expect(customCache.get('test')).toBe('value');

      customCache.shutdown();
    });

    it('should disable stats when configured', () => {
      const noStatsCache = new CacheManager({
        enableStats: false,
      });

      noStatsCache.set('key1', 'value1');
      noStatsCache.get('key1');
      noStatsCache.get('non-existent');

      const stats = noStatsCache.getStats();
      expect(stats.hitCount).toBe(0);
      expect(stats.missCount).toBe(0);

      noStatsCache.shutdown();
    });
  });

  describe('edge cases', () => {
    it('should handle null and undefined values', () => {
      cache.set('null-key', null as any);
      cache.set('undefined-key', undefined as any);

      expect(cache.get('null-key')).toBeNull();
      expect(cache.get('undefined-key')).toBeUndefined();
    });

    it('should handle complex objects', () => {
      const complexObject = {
        id: 1,
        name: 'test',
        nested: {
          array: [1, 2, 3],
          date: new Date(),
        },
      };

      const complexCache = new CacheManager<typeof complexObject>();
      complexCache.set('complex', complexObject);

      const retrieved = complexCache.get('complex');
      expect(retrieved).toEqual(complexObject);

      complexCache.shutdown();
    });

    it('should handle very large values', () => {
      const largeValue = 'x'.repeat(10000); // 10KB string

      cache.set('large', largeValue);
      expect(cache.get('large')).toBe(largeValue);
    });

    it('should handle rapid successive operations', () => {
      // Rapid set/get operations
      for (let i = 0; i < 100; i++) {
        cache.set(`rapid-${i}`, `value-${i}`);
        expect(cache.get(`rapid-${i}`)).toBe(`value-${i}`);
      }
    });
  });
});
