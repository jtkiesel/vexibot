import LRUCache from 'lru-cache';

export default class Cache<V> {
  private readonly cache: LRUCache<string, V>;

  constructor(max = 0) {
    this.cache = new LRUCache(max);
  }

  public set(key: string, value: V): boolean {
    return this.cache.set(key, value);
  }

  public get(key: string): V {
    return this.cache.get(key);
  }

  public has(key: string): boolean {
    return this.cache.has(key);
  }

  public delete(key: string): void {
    this.cache.del(key);
  }

  public clear(): void {
    this.cache.reset();
  }

  public keys(): string[] {
    return this.cache.keys();
  }

  public values(): V[] {
    return this.cache.values();
  }
}
