export type PrimaryState = {
  n: number;
  position: number[][];
  velocity: number[][];
  mass: number[];
};

export type DerivedState = {
  density: number[];
  velocityGuess: number[][];
  fPressure: number[][];
};

export type State = PrimaryState & DerivedState;

export const allocateState = ({n}: {n: number}): State => ({
  n,
  position: Array.from({length: n}).map(() => [0, 0]),
  velocity: Array.from({length: n}).map(() => [0, 0]),
  mass: Array.from({length: n}).map(() => 0),
  density: Array.from({length: n}).map(() => 0),
  velocityGuess: Array.from({length: n}).map(() => [0, 0]),
  fPressure: Array.from({length: n}).map(() => [0, 0]),
});

export const clearState = (state: State) => {
  for (let i = 0; i < state.n; ++i) {
    state.position[i][0] = 0;
    state.position[i][1] = 0;
    state.velocity[i][0] = 0;
    state.velocity[i][1] = 0;
    state.mass[i] = 0;
    state.density[i] = 0;
    state.velocityGuess[i][0] = 0;
    state.velocityGuess[i][1] = 0;
    state.fPressure[i][0] = 0;
    state.fPressure[i][1] = 0;
  }
};
