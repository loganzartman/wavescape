import {GPUState, State} from './state';

export const copyToTexture = (
  gl: WebGL2RenderingContext,
  src: ArrayBufferView,
  dst: WebGLTexture,
  width: number,
  height: number,
  format: number,
  type: number = gl.FLOAT
) => {
  gl.bindTexture(gl.TEXTURE_2D, dst);
  gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, width, height, format, type, src);
  gl.bindTexture(gl.TEXTURE_2D, null);
};

export const copyStateToGPU = (
  gl: WebGL2RenderingContext,
  state: State,
  gpuState: GPUState
) => {
  copyToTexture(
    gl,
    state.phase,
    gpuState.phase.texture,
    gpuState.dataW,
    gpuState.dataH,
    gl.RED_INTEGER,
    gl.BYTE
  );
  copyToTexture(
    gl,
    state.position,
    gpuState.position.read.texture,
    gpuState.dataW,
    gpuState.dataH,
    gl.RG
  );
  copyToTexture(
    gl,
    state.velocity,
    gpuState.velocity.read.texture,
    gpuState.dataW,
    gpuState.dataH,
    gl.RG
  );
  copyToTexture(
    gl,
    state.mass,
    gpuState.mass.read.texture,
    gpuState.dataW,
    gpuState.dataH,
    gl.RED
  );
  copyToTexture(
    gl,
    state.density,
    gpuState.density.read.texture,
    gpuState.dataW,
    gpuState.dataH,
    gl.RED
  );
  copyToTexture(
    gl,
    state.velocityGuess,
    gpuState.velocityGuess.read.texture,
    gpuState.dataW,
    gpuState.dataH,
    gl.RG
  );
  copyToTexture(
    gl,
    state.fPressure,
    gpuState.fPressure.read.texture,
    gpuState.dataW,
    gpuState.dataH,
    gl.RG
  );
};

export const copyFromTexture = (
  gl: WebGL2RenderingContext,
  src: WebGLTexture,
  dst: ArrayBufferView,
  width: number,
  height: number,
  format: number,
  type: number = gl.FLOAT
) => {
  gl.bindFramebuffer(gl.FRAMEBUFFER, src);
  gl.readPixels(0, 0, width, height, format, type, dst);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
};

export const copyStateFromGPU = (
  gl: WebGL2RenderingContext,
  state: State,
  gpuState: GPUState
) => {
  copyFromTexture(
    gl,
    gpuState.phase.framebuffer,
    state.phase,
    gpuState.dataW,
    gpuState.dataH,
    gl.RED_INTEGER,
    gl.BYTE
  );
  copyFromTexture(
    gl,
    gpuState.position.read.framebuffer,
    state.position,
    gpuState.dataW,
    gpuState.dataH,
    gl.RG
  );
  copyFromTexture(
    gl,
    gpuState.velocity.read.framebuffer,
    state.velocity,
    gpuState.dataW,
    gpuState.dataH,
    gl.RG
  );
  copyFromTexture(
    gl,
    gpuState.mass.read.framebuffer,
    state.mass,
    gpuState.dataW,
    gpuState.dataH,
    gl.RED
  );
  copyFromTexture(
    gl,
    gpuState.density.read.framebuffer,
    state.density,
    gpuState.dataW,
    gpuState.dataH,
    gl.RED
  );
  copyFromTexture(
    gl,
    gpuState.velocityGuess.read.framebuffer,
    state.velocityGuess,
    gpuState.dataW,
    gpuState.dataH,
    gl.RG
  );
  copyFromTexture(
    gl,
    gpuState.fPressure.read.framebuffer,
    state.fPressure,
    gpuState.dataW,
    gpuState.dataH,
    gl.RG
  );
};
