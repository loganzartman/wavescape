import {createFramebuffer, createTexture2D} from './gl';
import {nextPowerOf2} from './util';

export type PrimaryState = {
  n: number;
  position: number[][];
  velocity: number[][];
  mass: number[];
};

export type PrimaryGPUState = {
  n: number;
  position: WebGLTexture;
  positionFb: WebGLFramebuffer;
  velocity: WebGLTexture;
  velocityFb: WebGLFramebuffer;
  mass: WebGLTexture;
};

export type DerivedState = {
  density: number[];
  velocityGuess: number[][];
  fPressure: number[][];
};

export type DerivedGPUState = {
  density: WebGLTexture;
  velocityGuess: WebGLTexture;
  fPressure: WebGLTexture;
};

export type State = PrimaryState & DerivedState;
export type GPUState = PrimaryGPUState & DerivedGPUState;

export const allocateState = ({n}: {n: number}): State => ({
  n,
  position: Array.from({length: n}).map(() => [0, 0]),
  velocity: Array.from({length: n}).map(() => [0, 0]),
  mass: Array.from({length: n}).map(() => 0),
  density: Array.from({length: n}).map(() => 0),
  velocityGuess: Array.from({length: n}).map(() => [0, 0]),
  fPressure: Array.from({length: n}).map(() => [0, 0]),
});

export const allocateGPUState = ({
  n,
  gl,
}: {
  n: number;
  gl: WebGL2RenderingContext;
}): GPUState => {
  const base = {width: nextPowerOf2(n), height: 1};

  const position = createTexture2D(gl, {...base, internalFormat: gl.RG32F});
  const velocity = createTexture2D(gl, {...base, internalFormat: gl.RG32F});
  const mass = createTexture2D(gl, {...base, internalFormat: gl.R32F});
  const density = createTexture2D(gl, {...base, internalFormat: gl.R32F});
  const velocityGuess = createTexture2D(gl, {
    ...base,
    internalFormat: gl.RG32F,
  });
  const fPressure = createTexture2D(gl, {...base, internalFormat: gl.RG32F});

  const positionFb = createFramebuffer(gl, {colorAttachments: [position]});
  const velocityFb = createFramebuffer(gl, {colorAttachments: [velocity]});

  return {
    n,
    position,
    positionFb,
    velocity,
    velocityFb,
    mass,
    density,
    velocityGuess,
    fPressure,
  };
};

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
