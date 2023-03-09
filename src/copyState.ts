import {Params} from './params';
import {State} from './state';

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
  params: Params
) => {
  copyToTexture(
    gl,
    state.cpu.phase,
    state.gpu.phase.texture,
    state.gpu.dataW,
    state.gpu.dataH,
    gl.RED_INTEGER,
    gl.BYTE
  );
  copyToTexture(
    gl,
    state.cpu.position,
    state.gpu.position.read.texture,
    state.gpu.dataW,
    state.gpu.dataH,
    gl.RG
  );
  copyToTexture(
    gl,
    state.cpu.velocity,
    state.gpu.velocity.read.texture,
    state.gpu.dataW,
    state.gpu.dataH,
    gl.RG
  );
  copyToTexture(
    gl,
    state.cpu.mass,
    state.gpu.mass.read.texture,
    state.gpu.dataW,
    state.gpu.dataH,
    gl.RED
  );
  copyToTexture(
    gl,
    state.cpu.density,
    state.gpu.density.read.texture,
    state.gpu.dataW,
    state.gpu.dataH,
    gl.RED
  );
  copyToTexture(
    gl,
    state.cpu.velocityGuess,
    state.gpu.velocityGuess.read.texture,
    state.gpu.dataW,
    state.gpu.dataH,
    gl.RG
  );
  copyToTexture(
    gl,
    state.cpu.fPressure,
    state.gpu.fPressure.read.texture,
    state.gpu.dataW,
    state.gpu.dataH,
    gl.RG
  );
  copyToTexture(
    gl,
    state.cpu.keyParticlePairs,
    state.gpu.keyParticlePairs.read.texture,
    state.gpu.dataW,
    state.gpu.dataH,
    gl.RG_INTEGER,
    gl.INT
  );
  copyToTexture(
    gl,
    state.cpu.neighborsTable,
    state.gpu.neighborsTable.texture,
    params.cellResolutionX,
    params.cellResolutionY,
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
  gl.viewport(0, 0, width, height);
  gl.readPixels(0, 0, width, height, format, type, dst);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
};

export const copyStateFromGPU = (
  gl: WebGL2RenderingContext,
  state: State,
  params: Params
) => {
  copyFromTexture(
    gl,
    state.gpu.phase.framebuffer,
    state.cpu.phase,
    state.gpu.dataW,
    state.gpu.dataH,
    gl.RED_INTEGER,
    gl.BYTE
  );
  copyFromTexture(
    gl,
    state.gpu.position.read.framebuffer,
    state.cpu.position,
    state.gpu.dataW,
    state.gpu.dataH,
    gl.RG
  );
  copyFromTexture(
    gl,
    state.gpu.velocity.read.framebuffer,
    state.cpu.velocity,
    state.gpu.dataW,
    state.gpu.dataH,
    gl.RG
  );
  copyFromTexture(
    gl,
    state.gpu.mass.read.framebuffer,
    state.cpu.mass,
    state.gpu.dataW,
    state.gpu.dataH,
    gl.RED
  );
  copyFromTexture(
    gl,
    state.gpu.density.read.framebuffer,
    state.cpu.density,
    state.gpu.dataW,
    state.gpu.dataH,
    gl.RED
  );
  copyFromTexture(
    gl,
    state.gpu.velocityGuess.read.framebuffer,
    state.cpu.velocityGuess,
    state.gpu.dataW,
    state.gpu.dataH,
    gl.RG
  );
  copyFromTexture(
    gl,
    state.gpu.fPressure.read.framebuffer,
    state.cpu.fPressure,
    state.gpu.dataW,
    state.gpu.dataH,
    gl.RG
  );
  copyFromTexture(
    gl,
    state.gpu.keyParticlePairs.read.framebuffer,
    state.cpu.keyParticlePairs,
    params.cellResolutionX,
    params.cellResolutionY,
    gl.RG_INTEGER,
    gl.INT
  );
  copyFromTexture(
    gl,
    state.gpu.neighborsTable.framebuffer,
    state.cpu.neighborsTable,
    params.cellResolutionX,
    params.cellResolutionY,
    gl.RG
  );
};
