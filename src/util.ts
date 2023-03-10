export const rand = (a = 0.0, b = 1.0) => Math.random() * (b - a) + a;

export const length = (x: number, y: number): number =>
  Math.sqrt(x * x + y * y);

export const dot = (x1: number, y1: number, x2: number, y2: number): number =>
  x1 * x2 + y1 * y2;

export const normalize = (x: number, y: number): [number, number] => {
  const l = length(x, y);
  return [x / l, y / l];
};

export const clamp = (x: number, min: number, max: number) =>
  Math.max(min, Math.min(max, x));

export const nextPowerOf2 = (x: number): number => 2 ** Math.ceil(Math.log2(x));

export const memoize = <F extends (...args: any[]) => any>(f: F): F => {
  let cached = false;
  let cachedArgs: Parameters<F>;
  let cachedResult: ReturnType<F>;
  const memoized: any = (...args: Parameters<F>) => {
    if (
      !cached ||
      !cachedArgs.every((_, i) => Object.is(cachedArgs![i], args[i]))
    ) {
      cached = true;
      cachedArgs = args;
      cachedResult = f(...args);
    }
    return cachedResult;
  };
  return memoized;
};

export const shuffle = <T extends any[] | (ArrayBufferView & {length: number})>(
  a: T
): T => {
  for (let i = a.length - 1; i >= 0; --i) {
    const swapIndex = Math.floor(Math.random() * i);
    const temp = a[i];
    a[i] = a[swapIndex];
    a[swapIndex] = temp;
  }
  return a;
};

export const time = (fn: CallableFunction): number => {
  const t0 = performance.now();
  fn();
  return performance.now() - t0;
};

export const groupNComponents = <T>(a: T[], n: number): T[][] => {
  const result: T[][] = [];
  let i = 0;
  while (i < a.length) {
    let tup: T[] = [];
    for (let j = 0; j < n && i < a.length; ++j, ++i) {
      tup.push(a[i]);
    }
    result.push(tup);
  }
  return result;
};

export const dataTextureSize = (n: number) => Math.ceil(Math.sqrt(n));
