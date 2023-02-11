import {State, clearState} from './state';
import {Params} from './params';

export const makeDamBreak = (state: State, params: Params) => {
  const size = params.particleRadius * 2;
  const border = 0.05;
  let i = 0;
  let x = 0;
  let y = 0;
  let h = Math.floor((1 - border * 2) / size);

  clearState(state);
  while (i < state.n) {
    state.mass[i] = 1.0;
    state.position[i][0] = border + x * size;
    state.position[i][1] = border + y * size;
    ++i;
    ++y;
    if (y > h) {
      ++x;
      y = 0;
    }
  }
};
