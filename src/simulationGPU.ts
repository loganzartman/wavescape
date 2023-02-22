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
import {getPointerDown, getPointerPos, getPointerVel} from './pointer';
import {UniformContext} from './gl/UniformContext';
import {
  cellResolution,
  cellSize,
  collisionDistance,
  densitySampler,
  dt,
  eta,
  fPressureSampler,
  hSmoothing,
  keyParticleResolution,
  keyParticleSampler,
  massSampler,
  n,
  neighborsTableSampler,
  particleRadius,
  particleRestitution,
  pointerDown,
  pointerPos,
  pointerVel,
  positionSampler,
  resolution,
  restDensity,
  sigma,
  stiffness,
  velocityGuessSampler,
  velocitySampler,
  viscosity,
} from './shader/uniforms';

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

const resetUniforms = (
  gpuState: GPUState,
  params: Params,
  _dt: number,
  uniforms: UniformContext
) => {
  uniforms.set(cellResolution, [
    params.cellResolutionX,
    params.cellResolutionY,
  ]);
  uniforms.set(cellSize, [params.cellWidth, params.cellHeight]);
  uniforms.set(collisionDistance, params.collisionDistance);
  uniforms.set(dt, _dt);
  uniforms.set(eta, params.eta);
  uniforms.set(hSmoothing, params.hSmoothing);
  uniforms.set(keyParticleResolution, [gpuState.dataW, gpuState.dataH]);
  uniforms.set(n, gpuState.n);
  uniforms.set(particleRadius, params.particleRadius);
  uniforms.set(particleRestitution, params.particleRestitution);
  uniforms.set(pointerDown, Number(getPointerDown()));
  uniforms.set(pointerPos, getPointerPos());
  uniforms.set(pointerVel, getPointerVel());
  uniforms.set(resolution, [gpuState.dataW, gpuState.dataH]);
  uniforms.set(restDensity, params.restDensity);
  uniforms.set(sigma, params.sigma);
  uniforms.set(stiffness, params.stiffness);
  uniforms.set(viscosity, params.viscosity);

  uniforms.set(densitySampler, {texture: gpuState.density.read.texture});
  uniforms.set(fPressureSampler, {texture: gpuState.fPressure.read.texture});
  uniforms.set(keyParticleSampler, {
    texture: gpuState.keyParticlePairs.read.texture,
  });
  uniforms.set(massSampler, {texture: gpuState.mass.read.texture});
  uniforms.set(neighborsTableSampler, {
    texture: gpuState.neighborsTable.texture,
  });
  uniforms.set(positionSampler, {texture: gpuState.position.read.texture});
  uniforms.set(velocityGuessSampler, {
    texture: gpuState.velocityGuess.read.texture,
  });
  uniforms.set(velocitySampler, {texture: gpuState.velocity.read.texture});
};

export const updateSimulationGPU = (
  gl: WebGL2RenderingContext,
  gpuState: GPUState,
  params: Params,
  dt: number
) => {
  const uniforms = new UniformContext();
  resetUniforms(gpuState, params, dt, uniforms);

  updateNeighborsGPU(gl, gpuState, params, uniforms);
  updateDensityGPU(gl, gpuState, uniforms);
  updateVelocityGuessGPU(gl, gpuState, uniforms);
  updateFPressureGPU(gl, gpuState, uniforms);
  updateVelocityGPU(gl, gpuState, uniforms);
  advectParticlesGPU(gl, gpuState, uniforms);
};
