/** Lazily instanciate a value */
export class Lazy<T> {
  private value: T | undefined;

  constructor(private readonly factory: () => T) {}

  get(): T {
    if (!this.value) {
      this.value = this.factory();
    }
    return this.value;
  }

  clear(destructor?: (value: T) => void) {
    if (!this.value) return;
    destructor?.(this.value);
    this.value = undefined;
  }
}

/** Cache values in a map with lazy instanciation */
export class CacheMap<K, V> {
  private map = new Map<K, V>();

  constructor(private readonly factory: (key: K) => V) {}

  get(key: K): V {
    if (!this.map.has(key)) {
      this.map.set(key, this.factory(key));
    }
    return this.map.get(key)!;
  }

  remove(key: K, destructor?: (value: V) => void) {
    const value = this.map.get(key);

    if (!value) return;
    this.map.delete(key);
    destructor?.(value);
  }

  clear(destructor?: (value: V) => void) {
    this.map.forEach((value, key) => {
      destructor?.(value);
      this.map.delete(key);
    });
  }
}
