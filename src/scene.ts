import {State, clearState} from './state';
import {Params} from './params';

export const makeDamBreak = (state: State, params: Params) => {
  clearState(state);
  fillRectWithParticles({
    state,
    params,
    x0: 0.02,
    y0: 0.4,
    x1: 0.4,
    y1: 0.98,
  });
};

export const fillRectWithParticles = ({
  state,
  params,
  x0,
  y0,
  x1,
  y1,
}: {
  state: State;
  params: Params;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}) => {
  const n = state.n;
  const area = (x1 - x0) * (y1 - y0);
  const particleArea = area / n;
  const particleSpacing = Math.sqrt(particleArea);

  const countX = (x1 - x0) / particleSpacing;
  const countY = (y1 - y0) / particleSpacing;

  let i = 0;
  for (let ix = 0; ix < countX; ++ix) {
    for (let iy = 0; iy < countY; ++iy) {
      if (i > n) return;
      const x = x0 + ix * particleSpacing;
      const y = y0 + iy * particleSpacing;

      // place the particle
      state.position[i * 2 + 0] = x;
      state.position[i * 2 + 1] = y;
      state.mass[i] = params.restDensity * particleArea;
      ++i;
    }
  }
};
