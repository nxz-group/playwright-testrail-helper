import { Logger } from './Logger';

export interface CacheEntry<T> {
  key: string;
  value: T;
  createdAt: number;
  expiresAt: number;
  accessCount: number;
  lastAccessed: number;
  size: number;
}

export interface CacheStats {
  totalEntries: number;
  totalSize: number;
  hitCount: number;
  missCount: number;
  hitRate: number;
  evictionCount: number;
  oldestEntry: number | undefined;
  newestEntry: number | undefined;
}

export interface CacheConfig {
  maxSize: number; // Maximum number of entries
  maxMemory: number; // Maximum memory usage in bytes
  defaultTtl: number; // Default TTL in milliseconds
  cleanupInterval: number; // Cleanup interval in milliseconds
  enableStats: boolean;
}

/**
 * Advanced caching system with TTL, LRU eviction, and memory management
 */
export class CacheManager<T = unknown> {
  private readonly logger: Logger;
  private readonly config: CacheConfig;
  private readonly cache: Map<string, CacheEntry<T>> = new Map();
  private cleanupTimer?: NodeJS.Timeout | undefined;
  private stats = {
    hitCount: 0,
    missCount: 0,
    evictionCount: 0,
  };

  constructor(config?: Partial<CacheConfig>) {
    this.logger = new Logger('CacheManager');
    this.config = {
      maxSize: 1000,
      maxMemory: 50 * 1024 * 1024, // 50MB
      defaultTtl: 5 * 60 * 1000, // 5 minutes
      cleanupInterval: 60 * 1000, // 1 minute
      enableStats: true,
      ...config,
    };

    this.startCleanup();
    this.logger.debug('CacheManager initialized', { config: this.config });
  }

  /**
   * Get value from cache
   */
  get(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      if (this.config.enableStats) {
        this.stats.missCount++;
      }
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      if (this.config.enableStats) {
        this.stats.missCount++;
      }
      return null;
    }

    // Update access info
    entry.accessCount++;
    entry.lastAccessed = Date.now();

    if (this.config.enableStats) {
      this.stats.hitCount++;
    }

    this.logger.debug('Cache hit', { key, accessCount: entry.accessCount });
    return entry.value;
  }

  /**
   * Set value in cache
   */
  set(key: string, value: T, ttl?: number): void {
    const now = Date.now();
    const expirationTime = ttl || this.config.defaultTtl;
    const size = this.estimateSize(value);

    const entry: CacheEntry<T> = {
      key,
      value,
      createdAt: now,
      expiresAt: now + expirationTime,
      accessCount: 0,
      lastAccessed: now,
      size,
    };

    // Check if we need to evict entries
    this.evictIfNecessary(size);

    this.cache.set(key, entry);
    this.logger.debug('Cache set', { key, size, ttl: expirationTime });
  }

  /**
   * Delete value from cache
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.logger.debug('Cache delete', { key });
    }
    return deleted;
  }

  /**
   * Check if key exists in cache
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Get or set pattern - get value, or compute and cache if not found
   */
  async getOrSet<R extends T>(key: string, factory: () => Promise<R>, ttl?: number): Promise<R> {
    const cached = this.get(key);
    if (cached !== null) {
      return cached as R;
    }

    const value = await factory();
    this.set(key, value, ttl);
    return value;
  }

  /**
   * Get or set pattern (synchronous)
   */
  getOrSetSync<R extends T>(key: string, factory: () => R, ttl?: number): R {
    const cached = this.get(key);
    if (cached !== null) {
      return cached as R;
    }

    const value = factory();
    this.set(key, value, ttl);
    return value;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    this.logger.info('Cache cleared', { entriesRemoved: size });
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const entries = Array.from(this.cache.values());
    const totalSize = entries.reduce((sum, entry) => sum + entry.size, 0);
    const totalRequests = this.stats.hitCount + this.stats.missCount;
    const hitRate = totalRequests > 0 ? this.stats.hitCount / totalRequests : 0;

    const timestamps = entries.map(e => e.createdAt);
    const oldestEntry = timestamps.length > 0 ? Math.min(...timestamps) : undefined;
    const newestEntry = timestamps.length > 0 ? Math.max(...timestamps) : undefined;

    return {
      totalEntries: this.cache.size,
      totalSize,
      hitCount: this.stats.hitCount,
      missCount: this.stats.missCount,
      hitRate,
      evictionCount: this.stats.evictionCount,
      oldestEntry,
      newestEntry,
    };
  }

  /**
   * Get all cache keys
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get cache entries matching pattern
   */
  getByPattern(pattern: RegExp): Array<{ key: string; value: T }> {
    const matches: Array<{ key: string; value: T }> = [];

    for (const [key, entry] of this.cache.entries()) {
      if (pattern.test(key)) {
        // Check if expired
        if (Date.now() <= entry.expiresAt) {
          matches.push({ key, value: entry.value });
        }
      }
    }

    return matches;
  }

  /**
   * Delete entries matching pattern
   */
  deleteByPattern(pattern: RegExp): number {
    let deletedCount = 0;

    for (const key of this.cache.keys()) {
      if (pattern.test(key)) {
        this.cache.delete(key);
        deletedCount++;
      }
    }

    this.logger.debug('Cache pattern delete', { pattern: pattern.source, deletedCount });
    return deletedCount;
  }

  /**
   * Set TTL for existing entry
   */
  setTtl(key: string, ttl: number): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    entry.expiresAt = Date.now() + ttl;
    this.logger.debug('Cache TTL updated', { key, ttl });
    return true;
  }

  /**
   * Get TTL for entry
   */
  getTtl(key: string): number | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const remaining = entry.expiresAt - Date.now();
    return remaining > 0 ? remaining : 0;
  }

  /**
   * Cleanup expired entries
   */
  cleanup(): number {
    const now = Date.now();
    let removedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        removedCount++;
      }
    }

    if (removedCount > 0) {
      this.logger.debug('Cache cleanup completed', { removedCount });
    }

    return removedCount;
  }

  /**
   * Shutdown cache manager
   */
  shutdown(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
    this.clear();
    this.logger.info('CacheManager shutdown completed');
  }

  // Private methods

  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  private evictIfNecessary(newEntrySize: number): void {
    // Check size limit
    while (this.cache.size >= this.config.maxSize) {
      this.evictLRU();
    }

    // Check memory limit
    const currentMemory = this.getCurrentMemoryUsage();
    if (currentMemory + newEntrySize > this.config.maxMemory) {
      // Evict entries until we have enough space
      while (
        this.getCurrentMemoryUsage() + newEntrySize > this.config.maxMemory &&
        this.cache.size > 0
      ) {
        this.evictLRU();
      }
    }
  }

  private evictLRU(): void {
    let oldestEntry: CacheEntry<T> | null = null;
    let oldestKey: string | null = null;

    for (const [key, entry] of this.cache.entries()) {
      if (!oldestEntry || entry.lastAccessed < oldestEntry.lastAccessed) {
        oldestEntry = entry;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      if (this.config.enableStats) {
        this.stats.evictionCount++;
      }
      this.logger.debug('Cache LRU eviction', { key: oldestKey });
    }
  }

  private getCurrentMemoryUsage(): number {
    return Array.from(this.cache.values()).reduce((sum, entry) => sum + entry.size, 0);
  }

  private estimateSize(value: T): number {
    try {
      // Simple size estimation based on JSON serialization
      const jsonString = JSON.stringify(value);
      return jsonString.length * 2; // Rough estimate for UTF-16 encoding
    } catch (_error) {
      // Fallback for non-serializable objects
      return 1024; // 1KB default estimate
    }
  }
}

/**
 * Global cache manager instance
 */
export const globalCache = new CacheManager();
