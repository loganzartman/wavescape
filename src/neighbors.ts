import {State} from './state';
import {Params} from './params';

const neighborTable = new Map<number, number[]>();
const keyParticlePairs: Array<[number, number]> = [];
const startCount: Array<[number, number]> = [];

const cellKey = (i: number, j: number) =>
  Math.abs((73856093 * i) ^ (19349663 * j));

const posToCell = (params: Params, x: number, y: number): [number, number] => {
  const neighborCellSize = 1.0 * params.hSmoothing;
  return [Math.floor(x / neighborCellSize), Math.floor(y / neighborCellSize)];
};

export const updateNeighbors = (state: State, params: Params) => {
  keyParticlePairs.length = 0;
  for (let i = 0; i < state.n; ++i) {
    const cellPos = posToCell(
      params,
      state.position[i * 2 + 0],
      state.position[i * 2 + 1]
    );
    const key = cellKey(cellPos[0], cellPos[1]) % state.n;
    keyParticlePairs.push([key, i]);
  }

  keyParticlePairs.sort((a, b) => a[0] - b[0]);

  startCount.length = 0;
  for (let i = 0; i < state.n; ++i) {
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
      const key = cellKey(cx, cy) % state.n;
      const [start, count] = startCount[key];
      for (let i = start; i < start + count; ++i) {
        fn(keyParticlePairs[i][1]);
      }
    }
  }
};

export const updateNeighborsx = (state: State, params: Params) => {
  neighborTable.clear();
  for (let i = 0; i < state.n; ++i) {
    const [cellX, cellY] = posToCell(
      params,
      state.position[i * 2 + 0],
      state.position[i * 2 + 1]
    );
    const key = cellKey(cellX, cellY);
    if (!neighborTable.has(key)) {
      neighborTable.set(key, []);
    }
    neighborTable.get(key)?.push(i);
  }
};

export const forEachNeighborx = (
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
      const neighbors = neighborTable.get(cellKey(cx, cy));
      if (neighbors) {
        for (const n of neighbors) {
          fn(n);
        }
      }
    }
  }
};

export const getNeighborsBrute = function* (
  state: State,
  params: Params,
  index: number
) {
  for (let j = 0; j < state.n; ++j) {
    if (index === j) continue;
    yield j;
  }
};
