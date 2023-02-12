import {State} from './state';
import {Params} from './params';

const neighborTable = new Map<number, number[]>();

const cellKey = (i: number, j: number) => (73856093 * i) ^ (19349663 * j);

const posToCell = (params: Params, x: number, y: number): [number, number] => {
  const neighborCellSize = 1.0 * params.hSmoothing;
  return [Math.floor(x / neighborCellSize), Math.floor(y / neighborCellSize)];
};

export const updateNeighbors = (state: State, params: Params) => {
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
