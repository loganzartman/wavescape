import {createFramebuffer, createTexture2D} from './gl';
import {nextPowerOf2} from './util';

export type PrimaryState = {
  n: number;
  position: Float32Array;
  velocity: Float32Array;
  mass: Float32Array;
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
  density: Float32Array;
  velocityGuess: Float32Array;
  fPressure: Float32Array;
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
  position: new Float32Array(n * 2).map(() => 0),
  velocity: new Float32Array(n * 2).map(() => 0),
  mass: new Float32Array(n).map(() => 0),
  density: new Float32Array(n).map(() => 0),
  velocityGuess: new Float32Array(n * 2).map(() => 0),
  fPressure: new Float32Array(n * 2).map(() => 0),
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
    state.position[i * 2 + 0] = 0;
    state.position[i * 2 + 1] = 0;
    state.velocity[i * 2 + 0] = 0;
    state.velocity[i * 2 + 1] = 0;
    state.mass[i] = 0;
    state.density[i] = 0;
    state.velocityGuess[i * 2 + 0] = 0;
    state.velocityGuess[i * 2 + 1] = 0;
    state.fPressure[i * 2 + 0] = 0;
    state.fPressure[i * 2 + 1] = 0;
  }
};
