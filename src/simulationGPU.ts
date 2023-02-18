import {createProgram, createShader} from './gl';
import {GPUState, State} from './state';
import {memoize} from './util';
import advectParticlesFrag from './advectParticles.frag.glsl';
import updateVelocityFrag from './updateVelocity.frag.glsl';
import {Params} from './params';
import {getCopyVertexVert, getQuadVAO} from './gpuUtil';
import updateDensityFrag from './updateDensity.frag.glsl';
import updateVelocityGuessFrag from './updateVelocityGuess.frag.glsl';
import updateFPressureFrag from './updateFPressure.frag.glsl';
import {updateNeighborsGPU} from './neighborsGPU';

const DEBUG = false;

export const copyToTexture = (
  gl: WebGL2RenderingContext,
  src: Float32Array,
  dst: WebGLTexture,
  width: number,
  height: number,
  format: number
) => {
  gl.bindTexture(gl.TEXTURE_2D, dst);
  gl.texSubImage2D(
    gl.TEXTURE_2D,
    0,
    0,
    0,
    width,
    height,
    format,
    gl.FLOAT,
    src
  );
  gl.bindTexture(gl.TEXTURE_2D, null);
};

export const copyStateToGPU = (
  gl: WebGL2RenderingContext,
  state: State,
  gpuState: GPUState
) => {
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
  dst: Float32Array,
  length: number,
  format: number
) => {
  gl.bindFramebuffer(gl.FRAMEBUFFER, src);
  gl.readPixels(0, 0, length, 1, format, gl.FLOAT, dst);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
};

export const copyStateFromGPU = (
  gl: WebGL2RenderingContext,
  state: State,
  gpuState: GPUState
) => {
  copyFromTexture(
    gl,
    gpuState.position.read.framebuffer,
    state.position,
    state.n,
    gl.RG
  );
  copyFromTexture(
    gl,
    gpuState.velocity.read.framebuffer,
    state.velocity,
    state.n,
    gl.RG
  );
  copyFromTexture(
    gl,
    gpuState.mass.read.framebuffer,
    state.mass,
    state.n,
    gl.RED
  );
  copyFromTexture(
    gl,
    gpuState.density.read.framebuffer,
    state.density,
    state.n,
    gl.RED
  );
  copyFromTexture(
    gl,
    gpuState.velocityGuess.read.framebuffer,
    state.velocityGuess,
    state.n,
    gl.RG
  );
  copyFromTexture(
    gl,
    gpuState.fPressure.read.framebuffer,
    state.fPressure,
    state.n,
    gl.RG
  );
};

const getUpdateDensityFrag = memoize((gl: WebGL2RenderingContext) =>
  createShader(gl, {source: updateDensityFrag, type: gl.FRAGMENT_SHADER})
);

const getUpdateDensityProgram = memoize((gl: WebGL2RenderingContext) =>
  createProgram(gl, {
    shaders: [getCopyVertexVert(gl), getUpdateDensityFrag(gl)],
  })
);

export const updateDensityGPU = (
  gl: WebGL2RenderingContext,
  gpuState: GPUState,
  params: Params
) => {
  const program = getUpdateDensityProgram(gl);
  const quadVAO = getQuadVAO(gl);

  gl.useProgram(program);
  gl.bindVertexArray(quadVAO);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, gpuState.keyParticlePairs.read.texture);
  gl.uniform1i(gl.getUniformLocation(program, 'keyParticleSampler'), 0);
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, gpuState.neighborsTable.texture);
  gl.uniform1i(gl.getUniformLocation(program, 'neighborsTableSampler'), 1);
  gl.activeTexture(gl.TEXTURE2);
  gl.bindTexture(gl.TEXTURE_2D, gpuState.position.read.texture);
  gl.uniform1i(gl.getUniformLocation(program, 'positionSampler'), 2);
  gl.activeTexture(gl.TEXTURE3);
  gl.bindTexture(gl.TEXTURE_2D, gpuState.mass.read.texture);
  gl.uniform1i(gl.getUniformLocation(program, 'massSampler'), 3);

  gl.uniform2i(
    gl.getUniformLocation(program, 'keyParticleResolution'),
    gpuState.dataW,
    gpuState.dataH
  );
  gl.uniform2i(
    gl.getUniformLocation(program, 'neighborsTableResolution'),
    gpuState.dataW,
    gpuState.dataH
  );
  gl.uniform2i(
    gl.getUniformLocation(program, 'resolution'),
    gpuState.dataW,
    gpuState.dataH
  );
  gl.uniform2f(
    gl.getUniformLocation(program, 'cellSize'),
    params.cellWidth,
    params.cellHeight
  );
  gl.uniform1f(gl.getUniformLocation(program, 'hSmoothing'), params.hSmoothing);
  gl.uniform1f(gl.getUniformLocation(program, 'sigma'), params.sigma);

  gl.bindFramebuffer(gl.FRAMEBUFFER, gpuState.density.write.framebuffer);
  gl.disable(gl.BLEND);
  gl.viewport(0, 0, gpuState.dataW, gpuState.dataH);
  gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gpuState.density.swap();

  gl.bindVertexArray(null);
  gl.useProgram(null);

  if (DEBUG) {
    console.log('updated density');
    const tmp = new Float32Array(gpuState.dataW * gpuState.dataH);
    gl.bindFramebuffer(gl.FRAMEBUFFER, gpuState.density.read.framebuffer);
    gl.readPixels(0, 0, gpuState.dataW, gpuState.dataH, gl.RED, gl.FLOAT, tmp);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    console.log(Array.from(tmp));
  }
};

const getUpdateVelocityGuessFrag = memoize((gl: WebGL2RenderingContext) =>
  createShader(gl, {source: updateVelocityGuessFrag, type: gl.FRAGMENT_SHADER})
);

const getUpdateVelocityGuessProgram = memoize((gl: WebGL2RenderingContext) =>
  createProgram(gl, {
    shaders: [getCopyVertexVert(gl), getUpdateVelocityGuessFrag(gl)],
  })
);

export const updateFPressureGPU = (
  gl: WebGL2RenderingContext,
  gpuState: GPUState,
  params: Params
) => {
  const program = getUpdateFPressureProgram(gl);
  const quadVAO = getQuadVAO(gl);

  gl.useProgram(program);
  gl.bindVertexArray(quadVAO);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, gpuState.keyParticlePairs.read.texture);
  gl.uniform1i(gl.getUniformLocation(program, 'keyParticleSampler'), 0);
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, gpuState.neighborsTable.texture);
  gl.uniform1i(gl.getUniformLocation(program, 'neighborsTableSampler'), 1);
  gl.activeTexture(gl.TEXTURE2);
  gl.bindTexture(gl.TEXTURE_2D, gpuState.position.read.texture);
  gl.uniform1i(gl.getUniformLocation(program, 'positionSampler'), 2);
  gl.activeTexture(gl.TEXTURE3);
  gl.bindTexture(gl.TEXTURE_2D, gpuState.mass.read.texture);
  gl.uniform1i(gl.getUniformLocation(program, 'massSampler'), 3);
  gl.activeTexture(gl.TEXTURE4);
  gl.bindTexture(gl.TEXTURE_2D, gpuState.density.read.texture);
  gl.uniform1i(gl.getUniformLocation(program, 'densitySampler'), 4);

  gl.uniform2i(
    gl.getUniformLocation(program, 'keyParticleResolution'),
    gpuState.dataW,
    gpuState.dataH
  );
  gl.uniform2i(
    gl.getUniformLocation(program, 'neighborsTableResolution'),
    gpuState.dataW,
    gpuState.dataH
  );
  gl.uniform2i(
    gl.getUniformLocation(program, 'resolution'),
    gpuState.dataW,
    gpuState.dataH
  );
  gl.uniform2f(
    gl.getUniformLocation(program, 'cellSize'),
    params.cellWidth,
    params.cellHeight
  );
  gl.uniform1f(gl.getUniformLocation(program, 'hSmoothing'), params.hSmoothing);
  gl.uniform1f(gl.getUniformLocation(program, 'sigma'), params.sigma);
  gl.uniform1f(gl.getUniformLocation(program, 'eta'), params.eta);
  gl.uniform1f(gl.getUniformLocation(program, 'stiffness'), params.stiffness);
  gl.uniform1f(
    gl.getUniformLocation(program, 'restDensity'),
    params.restDensity
  );
  gl.uniform1f(
    gl.getUniformLocation(program, 'particleRadius'),
    params.particleRadius
  );

  gl.bindFramebuffer(gl.FRAMEBUFFER, gpuState.fPressure.write.framebuffer);
  gl.disable(gl.BLEND);
  gl.viewport(0, 0, gpuState.dataW, gpuState.dataH);
  gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gpuState.fPressure.swap();

  gl.bindVertexArray(null);
  gl.useProgram(null);

  if (DEBUG) {
    console.log('updated fpressure');
    const tmp = new Float32Array(gpuState.dataW * gpuState.dataH * 2);
    gl.bindFramebuffer(gl.FRAMEBUFFER, gpuState.fPressure.read.framebuffer);
    gl.readPixels(0, 0, gpuState.dataW, gpuState.dataH, gl.RG, gl.FLOAT, tmp);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    console.log(Array.from(tmp));
  }
};

const getUpdateFPressureFrag = memoize((gl: WebGL2RenderingContext) =>
  createShader(gl, {source: updateFPressureFrag, type: gl.FRAGMENT_SHADER})
);

const getUpdateFPressureProgram = memoize((gl: WebGL2RenderingContext) =>
  createProgram(gl, {
    shaders: [getCopyVertexVert(gl), getUpdateFPressureFrag(gl)],
  })
);

export const updateVelocityGuessGPU = (
  gl: WebGL2RenderingContext,
  gpuState: GPUState,
  params: Params,
  dt: number
) => {
  const program = getUpdateVelocityGuessProgram(gl);
  const quadVAO = getQuadVAO(gl);

  gl.useProgram(program);
  gl.bindVertexArray(quadVAO);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, gpuState.keyParticlePairs.read.texture);
  gl.uniform1i(gl.getUniformLocation(program, 'keyParticleSampler'), 0);
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, gpuState.neighborsTable.texture);
  gl.uniform1i(gl.getUniformLocation(program, 'neighborsTableSampler'), 1);
  gl.activeTexture(gl.TEXTURE2);
  gl.bindTexture(gl.TEXTURE_2D, gpuState.position.read.texture);
  gl.uniform1i(gl.getUniformLocation(program, 'positionSampler'), 2);
  gl.activeTexture(gl.TEXTURE3);
  gl.bindTexture(gl.TEXTURE_2D, gpuState.velocity.read.texture);
  gl.uniform1i(gl.getUniformLocation(program, 'velocitySampler'), 3);
  gl.activeTexture(gl.TEXTURE4);
  gl.bindTexture(gl.TEXTURE_2D, gpuState.mass.read.texture);
  gl.uniform1i(gl.getUniformLocation(program, 'massSampler'), 4);
  gl.activeTexture(gl.TEXTURE5);
  gl.bindTexture(gl.TEXTURE_2D, gpuState.density.read.texture);
  gl.uniform1i(gl.getUniformLocation(program, 'densitySampler'), 5);

  gl.uniform2i(
    gl.getUniformLocation(program, 'keyParticleResolution'),
    gpuState.dataW,
    gpuState.dataH
  );
  gl.uniform2i(
    gl.getUniformLocation(program, 'neighborsTableResolution'),
    gpuState.dataW,
    gpuState.dataH
  );
  gl.uniform2i(
    gl.getUniformLocation(program, 'resolution'),
    gpuState.dataW,
    gpuState.dataH
  );
  gl.uniform2f(
    gl.getUniformLocation(program, 'cellSize'),
    params.cellWidth,
    params.cellHeight
  );
  gl.uniform1f(gl.getUniformLocation(program, 'hSmoothing'), params.hSmoothing);
  gl.uniform1f(gl.getUniformLocation(program, 'sigma'), params.sigma);
  gl.uniform1f(gl.getUniformLocation(program, 'eta'), params.eta);
  gl.uniform1f(gl.getUniformLocation(program, 'viscosity'), params.viscosity);
  gl.uniform1f(
    gl.getUniformLocation(program, 'particleRadius'),
    params.particleRadius
  );
  gl.uniform1f(gl.getUniformLocation(program, 'dt'), dt);

  gl.bindFramebuffer(gl.FRAMEBUFFER, gpuState.velocityGuess.write.framebuffer);
  gl.disable(gl.BLEND);
  gl.viewport(0, 0, gpuState.dataW, gpuState.dataH);
  gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gpuState.velocityGuess.swap();

  gl.bindVertexArray(null);
  gl.useProgram(null);

  if (DEBUG) {
    console.log('updated velocity guess');
    const tmp = new Float32Array(gpuState.dataW * gpuState.dataH * 2);
    gl.bindFramebuffer(gl.FRAMEBUFFER, gpuState.velocityGuess.read.framebuffer);
    gl.readPixels(0, 0, gpuState.dataW, gpuState.dataH, gl.RG, gl.FLOAT, tmp);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    console.log(Array.from(tmp));
  }
};

const getAdvectParticlesFrag = memoize((gl: WebGL2RenderingContext) =>
  createShader(gl, {source: advectParticlesFrag, type: gl.FRAGMENT_SHADER})
);

const getAdvectParticlesProgram = memoize((gl: WebGL2RenderingContext) =>
  createProgram(gl, {
    shaders: [getCopyVertexVert(gl), getAdvectParticlesFrag(gl)],
  })
);

export const advectParticlesGPU = (
  gl: WebGL2RenderingContext,
  gpuState: GPUState,
  params: Params,
  dt: number
) => {
  const program = getAdvectParticlesProgram(gl);
  const quadVAO = getQuadVAO(gl);

  gl.useProgram(program);
  gl.bindVertexArray(quadVAO);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, gpuState.position.read.texture);
  gl.uniform1i(gl.getUniformLocation(program, 'positionSampler'), 0);
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, gpuState.velocity.read.texture);
  gl.uniform1i(gl.getUniformLocation(program, 'velocitySampler'), 1);
  gl.uniform1f(gl.getUniformLocation(program, 'dt'), dt);

  gl.bindFramebuffer(gl.FRAMEBUFFER, gpuState.position.write.framebuffer);
  gl.viewport(0, 0, gpuState.dataW, gpuState.dataH);
  gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gpuState.position.swap();

  gl.bindVertexArray(null);
  gl.useProgram(null);
};

const getUpdateVelocityFrag = memoize((gl: WebGL2RenderingContext) =>
  createShader(gl, {source: updateVelocityFrag, type: gl.FRAGMENT_SHADER})
);
const getUpdateVelocityProgram = memoize((gl: WebGL2RenderingContext) =>
  createProgram(gl, {
    shaders: [getCopyVertexVert(gl), getUpdateVelocityFrag(gl)],
  })
);

export const updateVelocityGPU = (
  gl: WebGL2RenderingContext,
  gpuState: GPUState,
  params: Params,
  dt: number
) => {
  const program = getUpdateVelocityProgram(gl);
  const quadVAO = getQuadVAO(gl);

  gl.useProgram(program);
  gl.bindVertexArray(quadVAO);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, gpuState.velocityGuess.read.texture);
  gl.uniform1i(gl.getUniformLocation(program, 'velocityGuessSampler'), 0);
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, gpuState.mass.read.texture);
  gl.uniform1i(gl.getUniformLocation(program, 'massSampler'), 1);
  gl.activeTexture(gl.TEXTURE2);
  gl.bindTexture(gl.TEXTURE_2D, gpuState.fPressure.read.texture);
  gl.uniform1i(gl.getUniformLocation(program, 'fPressureSampler'), 2);
  gl.uniform1f(gl.getUniformLocation(program, 'dt'), dt);

  gl.bindFramebuffer(gl.FRAMEBUFFER, gpuState.velocity.write.framebuffer);
  gl.viewport(0, 0, gpuState.dataW, gpuState.dataH);
  gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gpuState.velocity.swap();

  gl.bindVertexArray(null);
  gl.useProgram(null);
};

export const updateSimulationGPU = (
  gl: WebGL2RenderingContext,
  gpuState: GPUState,
  params: Params,
  dt: number
) => {
  updateNeighborsGPU(gl, gpuState, params);
  updateDensityGPU(gl, gpuState, params);
  updateVelocityGuessGPU(gl, gpuState, params, dt);
  updateFPressureGPU(gl, gpuState, params);
  updateVelocityGPU(gl, gpuState, params, dt);
  advectParticlesGPU(gl, gpuState, params, dt);
};
