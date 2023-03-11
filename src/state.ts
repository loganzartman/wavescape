import {createTexture2D, PingPongTexture, RenderTexture} from './gl/gl';
import {Params} from './params';
import {dataTextureSize} from './util';

export type CPUState = {
  phase: Int8Array;
  position: Float32Array;
  velocity: Float32Array;
  mass: Float32Array;
  density: Float32Array;
  velocityGuess: Float32Array;
  pressure: Float32Array;
  fPressure: Float32Array;
  keyParticlePairs: Int32Array;
  neighborsTable: Float32Array;
};

export type GPUState = {
  dataW: number;
  dataH: number;
  phase: RenderTexture;
  position: PingPongTexture;
  velocity: PingPongTexture;
  mass: PingPongTexture;
  density: PingPongTexture;
  velocityGuess: PingPongTexture;
  pressure: PingPongTexture;
  fPressure: PingPongTexture;
  keyParticlePairs: PingPongTexture;
  neighborsTable: RenderTexture;
  maxSpeed: RenderTexture;
};

export type State = {
  capacity: number;
  cpu: CPUState | null;
  gpu: GPUState | null;
};

export const createState = (): State => {
  return {capacity: 0, cpu: null, gpu: null};
};

export const setCapacity = ({
  state,
  capacity,
  params,
  gl,
}: {
  state: State;
  capacity: number;
  params: Params;
  gl: WebGL2RenderingContext | null;
}) => {
  if (state.gpu) {
    deallocateGPUState(state.gpu);
  }
  const {cellResolutionX, cellResolutionY} = params;
  state.cpu = allocateCPUState({capacity, cellResolutionX, cellResolutionY});
  if (gl) {
    state.gpu = allocateGPUState({
      gl,
      capacity,
      cellResolutionX,
      cellResolutionY,
    });
  }
  state.capacity = capacity;
};

const allocateCPUState = ({
  capacity,
  cellResolutionX,
  cellResolutionY,
}: {
  capacity: number;
  cellResolutionX: number;
  cellResolutionY: number;
}): CPUState => {
  const size = dataTextureSize(capacity) ** 2;
  return {
    phase: new Int8Array(size).map(() => 0),
    position: new Float32Array(size * 2).map(() => 0),
    velocity: new Float32Array(size * 2).map(() => 0),
    mass: new Float32Array(size).map(() => 0),
    density: new Float32Array(size).map(() => 0),
    velocityGuess: new Float32Array(size * 2).map(() => 0),
    pressure: new Float32Array(size).map(() => 0),
    fPressure: new Float32Array(size * 2).map(() => 0),
    keyParticlePairs: new Int32Array(size * 2).map(() => 0),
    neighborsTable: new Float32Array(cellResolutionX * cellResolutionY * 2).map(
      () => 0
    ),
  };
};

const allocateGPUState = ({
  gl,
  capacity,
  cellResolutionX,
  cellResolutionY,
}: {
  gl: WebGL2RenderingContext;
  capacity: number;
  cellResolutionX: number;
  cellResolutionY: number;
}): GPUState => {
  const dataW = dataTextureSize(capacity);
  const dataH = dataTextureSize(capacity);
  const base = {width: dataW, height: dataH};

  const phase = new RenderTexture(gl, () =>
    createTexture2D(gl, {...base, internalFormat: gl.R8I})
  );
  const position = new PingPongTexture(gl, () =>
    createTexture2D(gl, {...base, internalFormat: gl.RG32F})
  );
  const velocity = new PingPongTexture(gl, () =>
    createTexture2D(gl, {...base, internalFormat: gl.RG32F})
  );
  const mass = new PingPongTexture(gl, () =>
    createTexture2D(gl, {...base, internalFormat: gl.R32F})
  );
  const density = new PingPongTexture(gl, () =>
    createTexture2D(gl, {...base, internalFormat: gl.R32F})
  );
  const velocityGuess = new PingPongTexture(gl, () =>
    createTexture2D(gl, {
      ...base,
      internalFormat: gl.RG32F,
    })
  );
  const pressure = new PingPongTexture(gl, () =>
    createTexture2D(gl, {...base, internalFormat: gl.R32F})
  );
  const fPressure = new PingPongTexture(gl, () =>
    createTexture2D(gl, {...base, internalFormat: gl.RG32F})
  );

  const keyParticlePairs = new PingPongTexture(gl, () =>
    createTexture2D(gl, {...base, internalFormat: gl.RG32I})
  );
  const neighborsTable = new RenderTexture(gl, () =>
    // this has to be a float texture to support blending
    createTexture2D(gl, {
      width: cellResolutionX,
      height: cellResolutionY,
      internalFormat: gl.RG32F,
    })
  );

  const maxSpeed = new RenderTexture(gl, () =>
    createTexture2D(gl, {width: 1, height: 1, internalFormat: gl.R32F})
  );

  return {
    dataW,
    dataH,
    phase,
    position,
    velocity,
    mass,
    density,
    velocityGuess,
    pressure,
    fPressure,
    keyParticlePairs,
    neighborsTable,
    maxSpeed,
  };
};

const deallocateGPUState = (gpuState: GPUState) => {
  gpuState.density.delete();
  gpuState.fPressure.delete();
  gpuState.keyParticlePairs.delete();
  gpuState.mass.delete();
  gpuState.neighborsTable.delete();
  gpuState.phase.delete();
  gpuState.position.delete();
  gpuState.pressure.delete();
  gpuState.velocity.delete();
  gpuState.velocityGuess.delete();
};
