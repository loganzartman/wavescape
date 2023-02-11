export const rand = (a = 0.0, b = 1.0) => Math.random() * (b - a) + a;

export const length = (x, y): number => Math.sqrt(x * x + y * y);

export const dot = (x1, y1, x2, y2): number => x1 * x2 + y1 * y2;
