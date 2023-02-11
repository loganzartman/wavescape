import {Params} from './params';
import {length} from './util';

export const W = (params: Params, dx: number, dy: number): number => {
  // cubic spline kernel
  const q = length(dx, dy) / params.hSmoothing;
  if (0 <= q && q <= 0.5) {
    return params.sigma * (6 * (q ** 3 - q ** 2) + 1);
  } else if (0.5 < q && q <= 1) {
    return params.sigma * (2 * (1 - q) ** 3);
  } else {
    return 0;
  }
};

export const dW = (
  params: Params,
  dx: number,
  dy: number
): [number, number] => {
  // derivative of cubic spline kernel
  const len = length(dx, dy);
  const dxq = dx / (params.hSmoothing * len + params.eta);
  const dyq = dy / (params.hSmoothing * len + params.eta);

  const q = len / params.hSmoothing;
  if (0 <= q && q <= 0.5) {
    const term = params.sigma * (18 * q ** 2 - 12 * q);
    return [term * dxq, term * dyq];
  } else if (0.5 < q && q <= 1) {
    const term = params.sigma * (-6 * (1 - q) ** 2);
    return [term * dxq, term * dyq];
  } else {
    return [0, 0];
  }
};
