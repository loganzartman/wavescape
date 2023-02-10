const DEBUG = true;

export const notNaN = DEBUG
  ? (x: number): number => {
      if (Number.isNaN(x)) {
        debugger;
        throw new Error(`Assigning NaN to prop`);
      }
      if (!Number.isFinite(x)) {
        debugger;
        throw new Error(`Assigning Infinity to prop`);
      }
      return x;
    }
  : (x) => x;

export const debugData = <T extends object>(object: T): T => {
  if (!DEBUG) {
    return object;
  }
  return debugNaNs(object);
};

export const debugNaNs = <T extends object>(object: T): T => {
  return new Proxy<T>(object, {
    set: (target, prop, value) => {
      if (typeof value === 'object') {
        target[prop] = debugNaNs(value);
        return true;
      }

      if (typeof value === 'number') {
        value = notNaN(value);
      }
      target[prop] = value;
      return true;
    },
  });
};
