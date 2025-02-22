// Takes an existing generator, and returns pairs of values lie [0, 1], [1, 2], [2, 3] etc
export function* pairGenerator<T>(generator: Generator<T>): Generator<[T, T]> {
  let lastValue = generator.next();
  let nextValue = generator.next();

  while (!lastValue.done && !nextValue.done) {
    yield [lastValue.value, nextValue.value];
    lastValue = nextValue;
    nextValue = generator.next();
  }
}

export function* printGenerator<A>(generator: Generator<A>): Generator<A> {
  let v = generator.next();

  while (!v.done) {
    console.log(v.value);
    yield v.value;
    v = generator.next();
  }
}
