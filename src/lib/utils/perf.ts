export type Fn<T extends unknown[], R> = (...args: T) => R;

export const getCacheFunction = <Args extends unknown[], Return, Key>(fn: Fn<Args, Return>, getKey: Fn<Args, Key>): Fn<Args, Return> => {
  const cache = new Map<Key, Return>();
  return (...args: Args) => {
    const key = getKey(...args);
    if (cache.has(key)) {
      // biome-ignore lint: we know the cache is there.
      return cache.get(key)!;
    }
    const result = fn(...args);
    cache.set(key, result);
    return result;
  };
};
