import {State} from './state';
import {Params} from './params';

const cellKey = (params: Params, i: number, j: number) =>
  j * params.cellResolutionX + i;

const posToCell = (params: Params, x: number, y: number): [number, number] => {
  return [
    Math.max(
      0,
      Math.min(params.cellResolutionX - 1, Math.floor(x / params.cellWidth))
    ),
    Math.max(
      0,
      Math.min(params.cellResolutionY - 1, Math.floor(y / params.cellHeight))
    ),
  ];
};

export const updateNeighbors = (state: State, params: Params) => {
  const pairs = [];
  for (let i = 0; i < state.capacity; ++i) {
    const cellPos = posToCell(
      params,
      state.cpu.position[i * 2 + 0],
      state.cpu.position[i * 2 + 1]
    );
    const key = cellKey(params, cellPos[0], cellPos[1]);
    pairs.push([key, i]);
  }

  pairs.sort((a, b) => a[0] - b[0]);

  for (let i = 0; i < state.capacity; ++i) {
    const [key, value] = pairs[i];
    state.cpu.keyParticlePairs[i * 2 + 0] = key;
    state.cpu.keyParticlePairs[i * 2 + 1] = value;
  }

  for (let i = 0; i < params.cellResolutionX * params.cellResolutionY; ++i) {
    state.cpu.neighborsTable[i * 2 + 0] = state.capacity;
    state.cpu.neighborsTable[i * 2 + 1] = 0;
  }

  for (let i = 0; i < state.capacity; ++i) {
    const key = state.cpu.keyParticlePairs[i * 2 + 0];
    state.cpu.neighborsTable[key * 2 + 0] = Math.min(
      state.cpu.neighborsTable[key * 2 + 0],
      i
    );
    state.cpu.neighborsTable[key * 2 + 1] += 1;
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
    state.cpu.position[index * 2 + 0] - params.hSmoothing,
    state.cpu.position[index * 2 + 1] - params.hSmoothing
  );
  const [cx1, cy1] = posToCell(
    params,
    state.cpu.position[index * 2 + 0] + params.hSmoothing,
    state.cpu.position[index * 2 + 1] + params.hSmoothing
  );
  for (let cx = cx0; cx <= cx1; ++cx) {
    for (let cy = cy0; cy <= cy1; ++cy) {
      const key = cellKey(params, cx, cy);
      const start = state.cpu.neighborsTable[key * 2 + 0];
      const count = state.cpu.neighborsTable[key * 2 + 1];
      for (let i = start; i < start + count; ++i) {
        fn(state.cpu.keyParticlePairs[i * 2 + 1]);
      }
    }
  }
};
