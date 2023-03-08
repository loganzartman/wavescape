import {createProgram} from './gl/program';
import {createShader} from './gl/shader';
import {GPUState, State} from './state';
import {memoize} from './util';
import {advectParticlesFs} from './shader/advectParticles';
import {updateVelocityFs} from './shader/updateVelocity';
import {Params} from './params';
import {getCopyVertexVert, getQuadVAO} from './gpuUtil';
import {updateDensityFs} from './shader/updateDensity';
import {updateVelocityGuessFs} from './shader/updateVelocityGuess';
import {updateFPressureFs} from './shader/updateFPressure';
import {updateNeighborsGPU} from './neighborsGPU';
import {UniformContext} from './gl/UniformContext';
import {
  densitySampler,
  fPressureSampler,
  positionSampler,
  velocityGuessSampler,
  velocitySampler,
} from './shader/uniforms';

const DEBUG = false;

const getUpdateDensityFrag = memoize((gl: WebGL2RenderingContext) =>
  createShader(gl, {source: updateDensityFs, type: gl.FRAGMENT_SHADER})
);

const getUpdateDensityProgram = memoize((gl: WebGL2RenderingContext) =>
  createProgram(gl, {
    shaders: [getCopyVertexVert(gl), getUpdateDensityFrag(gl)],
  })
);

export const updateDensityGPU = (
  gl: WebGL2RenderingContext,
  gpuState: GPUState,
  uniforms: UniformContext
) => {
  const program = getUpdateDensityProgram(gl);
  const quadVAO = getQuadVAO(gl);

  gl.useProgram(program.program);
  gl.bindVertexArray(quadVAO);

  uniforms.bind(gl, program);

  gl.bindFramebuffer(gl.FRAMEBUFFER, gpuState.density.write.framebuffer);
  gl.disable(gl.BLEND);
  gl.viewport(0, 0, gpuState.dataW, gpuState.dataH);
  gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gpuState.density.swap();
  uniforms.set(densitySampler, {texture: gpuState.density.read.texture});

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
  createShader(gl, {source: updateVelocityGuessFs, type: gl.FRAGMENT_SHADER})
);

const getUpdateVelocityGuessProgram = memoize((gl: WebGL2RenderingContext) =>
  createProgram(gl, {
    shaders: [getCopyVertexVert(gl), getUpdateVelocityGuessFrag(gl)],
  })
);

export const updateFPressureGPU = (
  gl: WebGL2RenderingContext,
  gpuState: GPUState,
  uniforms: UniformContext
) => {
  const program = getUpdateFPressureProgram(gl);
  const quadVAO = getQuadVAO(gl);

  gl.useProgram(program.program);
  gl.bindVertexArray(quadVAO);

  uniforms.bind(gl, program);

  gl.bindFramebuffer(gl.FRAMEBUFFER, gpuState.fPressure.write.framebuffer);
  gl.disable(gl.BLEND);
  gl.viewport(0, 0, gpuState.dataW, gpuState.dataH);
  gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gpuState.fPressure.swap();
  uniforms.set(fPressureSampler, {
    texture: gpuState.fPressure.read.texture,
  });

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
  createShader(gl, {source: updateFPressureFs, type: gl.FRAGMENT_SHADER})
);

const getUpdateFPressureProgram = memoize((gl: WebGL2RenderingContext) =>
  createProgram(gl, {
    shaders: [getCopyVertexVert(gl), getUpdateFPressureFrag(gl)],
  })
);

export const updateVelocityGuessGPU = (
  gl: WebGL2RenderingContext,
  gpuState: GPUState,
  uniforms: UniformContext
) => {
  const program = getUpdateVelocityGuessProgram(gl);
  const quadVAO = getQuadVAO(gl);

  gl.useProgram(program.program);
  gl.bindVertexArray(quadVAO);

  uniforms.bind(gl, program);

  gl.bindFramebuffer(gl.FRAMEBUFFER, gpuState.velocityGuess.write.framebuffer);
  gl.disable(gl.BLEND);
  gl.viewport(0, 0, gpuState.dataW, gpuState.dataH);
  gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gpuState.velocityGuess.swap();
  uniforms.set(velocityGuessSampler, {
    texture: gpuState.velocityGuess.read.texture,
  });

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
  createShader(gl, {source: advectParticlesFs, type: gl.FRAGMENT_SHADER})
);

const getAdvectParticlesProgram = memoize((gl: WebGL2RenderingContext) =>
  createProgram(gl, {
    shaders: [getCopyVertexVert(gl), getAdvectParticlesFrag(gl)],
  })
);

export const advectParticlesGPU = (
  gl: WebGL2RenderingContext,
  gpuState: GPUState,
  uniforms: UniformContext
) => {
  const program = getAdvectParticlesProgram(gl);
  const quadVAO = getQuadVAO(gl);

  gl.useProgram(program.program);
  gl.bindVertexArray(quadVAO);

  uniforms.bind(gl, program);

  gl.bindFramebuffer(gl.FRAMEBUFFER, gpuState.position.write.framebuffer);
  gl.viewport(0, 0, gpuState.dataW, gpuState.dataH);
  gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gpuState.position.swap();
  uniforms.set(positionSampler, {texture: gpuState.position.read.texture});

  gl.bindVertexArray(null);
  gl.useProgram(null);
};

const getUpdateVelocityFrag = memoize((gl: WebGL2RenderingContext) =>
  createShader(gl, {source: updateVelocityFs, type: gl.FRAGMENT_SHADER})
);
const getUpdateVelocityProgram = memoize((gl: WebGL2RenderingContext) =>
  createProgram(gl, {
    shaders: [getCopyVertexVert(gl), getUpdateVelocityFrag(gl)],
  })
);

export const updateVelocityGPU = (
  gl: WebGL2RenderingContext,
  gpuState: GPUState,
  uniforms: UniformContext
) => {
  const program = getUpdateVelocityProgram(gl);
  const quadVAO = getQuadVAO(gl);

  gl.useProgram(program.program);
  gl.bindVertexArray(quadVAO);

  uniforms.bind(gl, program);

  gl.bindFramebuffer(gl.FRAMEBUFFER, gpuState.velocity.write.framebuffer);
  gl.viewport(0, 0, gpuState.dataW, gpuState.dataH);
  gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gpuState.velocity.swap();
  uniforms.set(velocitySampler, {texture: gpuState.velocity.read.texture});

  gl.bindVertexArray(null);
  gl.useProgram(null);
};

export const updateSimulationGPU = (
  gl: WebGL2RenderingContext,
  gpuState: GPUState,
  params: Params,
  dt: number,
  uniforms: UniformContext
) => {
  updateNeighborsGPU(gl, gpuState, params, uniforms);

  for (let i = 0; i < params.substeps; ++i) {
    updateDensityGPU(gl, gpuState, uniforms);
    updateVelocityGuessGPU(gl, gpuState, uniforms);
    updateFPressureGPU(gl, gpuState, uniforms);
    updateVelocityGPU(gl, gpuState, uniforms);
    advectParticlesGPU(gl, gpuState, uniforms);
  }
};
