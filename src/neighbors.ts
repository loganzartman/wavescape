import {State} from './state';
import {Params} from './params';

const keyParticlePairs: Array<[number, number]> = [];
const startCount: Array<[number, number]> = [];

const cellKey = (params: Params, i: number, j: number) =>
  j * params.cellResolutionX + i;

const posToCell = (params: Params, x: number, y: number): [number, number] => {
  const neighborCellSize = 1.0 * params.hSmoothing;
  return [
    Math.max(
      0,
      Math.min(params.cellResolutionX - 1, Math.floor(x / neighborCellSize))
    ),
    Math.max(
      0,
      Math.min(params.cellResolutionY - 1, Math.floor(y / neighborCellSize))
    ),
  ];
};

export const updateNeighbors = (state: State, params: Params) => {
  keyParticlePairs.length = 0;
  for (let i = 0; i < state.n; ++i) {
    const cellPos = posToCell(
      params,
      state.position[i * 2 + 0],
      state.position[i * 2 + 1]
    );
    const key = cellKey(params, cellPos[0], cellPos[1]);
    keyParticlePairs.push([key, i]);
  }

  keyParticlePairs.sort((a, b) => a[0] - b[0]);

  startCount.length = 0;
  for (let i = 0; i < params.cellResolutionX * params.cellResolutionY; ++i) {
    startCount.push([state.n, 0]);
  }

  for (let i = 0; i < state.n; ++i) {
    const [key, _] = keyParticlePairs[i];
    startCount[key][0] = Math.min(startCount[key][0], i);
    startCount[key][1] += 1;
  }
};

export const forEachNeighbor = (
  state: State,
  params: Params,
  index: number,
  fn: (i: number) => void
) => {
  const [cx0, cy0] = posToCell(
    params,
    state.position[index * 2 + 0] - params.hSmoothing,
    state.position[index * 2 + 1] - params.hSmoothing
  );
  const [cx1, cy1] = posToCell(
    params,
    state.position[index * 2 + 0] + params.hSmoothing,
    state.position[index * 2 + 1] + params.hSmoothing
  );
  for (let cx = cx0; cx <= cx1; ++cx) {
    for (let cy = cy0; cy <= cy1; ++cy) {
      const key = cellKey(params, cx, cy);
      const [start, count] = startCount[key];
      for (let i = start; i < start + count; ++i) {
        fn(keyParticlePairs[i][1]);
      }
    }
  }
};
