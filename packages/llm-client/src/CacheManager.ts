import type { CacheEntry, CacheManagerOptions } from "./types.js";

export class CacheManager {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private maxSize: number;
  private defaultTtlMs: number;

  constructor(options: CacheManagerOptions = {}) {
    this.maxSize = options.maxSize ?? 200;
    this.defaultTtlMs = options.defaultTtlMs ?? 300000; // 5 minutes
  }

  /**
   * Get a cached value by key.
   */
  get<T>(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    if (Date.now() - entry.createdAt > this.defaultTtlMs) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.value as T;
  }

  /**
   * Store a value in the cache.
   */
  set<T>(key: string, value: T, customTtlMs?: number): void {
    if (this.cache.size >= this.maxSize) {
      this._evictLRU();
    }

    this.cache.set(key, {
      value,
      createdAt: Date.now(),
      promptHash: key,
      stateHash: "",
    });

    // If custom TTL is very short, schedule early cleanup
    if (customTtlMs && customTtlMs < this.defaultTtlMs) {
      setTimeout(() => this.cache.delete(key), customTtlMs);
    }
  }

  /**
   * Check if a key exists and is not expired.
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    if (Date.now() - entry.createdAt > this.defaultTtlMs) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }

  /**
   * Delete a specific key.
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all entries.
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Invalidate entries matching a predicate.
   */
  invalidateWhere(predicate: (key: string, entry: CacheEntry<unknown>) => boolean): number {
    let count = 0;
    for (const [key, entry] of this.cache) {
      if (predicate(key, entry)) {
        this.cache.delete(key);
        count++;
      }
    }
    return count;
  }

  /**
   * Get cache statistics.
   */
  stats(): { size: number; maxSize: number; hitRate?: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
    };
  }

  /**
   * Build a deterministic cache key from template + context + state hashes.
   */
  static buildKey(templateId: string, stateHash: string, actionHash: string): string {
    const combined = `${templateId}:${stateHash}:${actionHash}`;
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return `cache:${Math.abs(hash).toString(36)}`;
  }

  private _evictLRU(): void {
    let oldestKey: string | undefined;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache) {
      if (entry.createdAt < oldestTime) {
        oldestTime = entry.createdAt;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }
}
