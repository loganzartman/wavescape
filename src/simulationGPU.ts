import {createProgram} from './gl/program';
import {createShader} from './gl/shader';
import {State} from './state';
import {memoize} from './util';
import {updatePositionFs} from './shader/updatePosition';
import {updateVelocityFs} from './shader/updateVelocity';
import {Params} from './params';
import {getCopyVertexVert, getEmptyVAO, getQuadVAO} from './gpuUtil';
import {updateDensityFs} from './shader/updateDensity';
import {updateVelocityGuessFs} from './shader/updateVelocityGuess';
import {updatePressureFs} from './shader/updatePressure';
import {updateFPressureFs} from './shader/updateFPressure';
import {updateNeighborsGPU} from './neighborsGPU';
import {UniformContext} from './gl/UniformContext';
import {
  densitySampler,
  fPressureSampler,
  positionSampler,
  pressureSampler,
  velocityGuessSampler,
  velocitySampler,
  dt as dtUniform,
} from './uniforms';
import {updateMaxSpeedFs, updateMaxSpeedVs} from './shader/updateMaxSpeed';

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
  state: State,
  uniforms: UniformContext
) => {
  const program = getUpdateDensityProgram(gl);
  const quadVAO = getQuadVAO(gl);

  gl.useProgram(program.program);
  gl.bindVertexArray(quadVAO);

  uniforms.bind(gl, program);

  gl.bindFramebuffer(gl.FRAMEBUFFER, state.gpu.density.write.framebuffer);
  gl.disable(gl.BLEND);
  gl.viewport(0, 0, state.gpu.dataW, state.gpu.dataH);
  gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  state.gpu.density.swap();
  uniforms.set(densitySampler, {texture: state.gpu.density.read.texture});

  gl.bindVertexArray(null);
  gl.useProgram(null);

  if (DEBUG) {
    console.log('updated density');
    const tmp = new Float32Array(state.gpu.dataW * state.gpu.dataH);
    gl.bindFramebuffer(gl.FRAMEBUFFER, state.gpu.density.read.framebuffer);
    gl.readPixels(
      0,
      0,
      state.gpu.dataW,
      state.gpu.dataH,
      gl.RED,
      gl.FLOAT,
      tmp
    );
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    console.log(Array.from(tmp));
  }
};

const getUpdatePressureFrag = memoize((gl: WebGL2RenderingContext) =>
  createShader(gl, {source: updatePressureFs, type: gl.FRAGMENT_SHADER})
);

const getUpdatePressureProgram = memoize((gl: WebGL2RenderingContext) =>
  createProgram(gl, {
    shaders: [getCopyVertexVert(gl), getUpdatePressureFrag(gl)],
  })
);

export const updatePressureGPU = (
  gl: WebGL2RenderingContext,
  state: State,
  uniforms: UniformContext
) => {
  const program = getUpdatePressureProgram(gl);
  const quadVAO = getQuadVAO(gl);

  gl.useProgram(program.program);
  gl.bindVertexArray(quadVAO);

  uniforms.bind(gl, program);

  gl.bindFramebuffer(gl.FRAMEBUFFER, state.gpu.pressure.write.framebuffer);
  gl.disable(gl.BLEND);
  gl.viewport(0, 0, state.gpu.dataW, state.gpu.dataH);
  gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  state.gpu.pressure.swap();
  uniforms.set(pressureSampler, {
    texture: state.gpu.pressure.read.texture,
  });

  gl.bindVertexArray(null);
  gl.useProgram(null);

  if (DEBUG) {
    console.log('updated pressure');
    const tmp = new Float32Array(state.gpu.dataW * state.gpu.dataH * 2);
    gl.bindFramebuffer(gl.FRAMEBUFFER, state.gpu.fPressure.read.framebuffer);
    gl.readPixels(0, 0, state.gpu.dataW, state.gpu.dataH, gl.RG, gl.FLOAT, tmp);
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

export const updateFPressureGPU = (
  gl: WebGL2RenderingContext,
  state: State,
  uniforms: UniformContext
) => {
  const program = getUpdateFPressureProgram(gl);
  const quadVAO = getQuadVAO(gl);

  gl.useProgram(program.program);
  gl.bindVertexArray(quadVAO);

  uniforms.bind(gl, program);

  gl.bindFramebuffer(gl.FRAMEBUFFER, state.gpu.fPressure.write.framebuffer);
  gl.disable(gl.BLEND);
  gl.viewport(0, 0, state.gpu.dataW, state.gpu.dataH);
  gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  state.gpu.fPressure.swap();
  uniforms.set(fPressureSampler, {
    texture: state.gpu.fPressure.read.texture,
  });

  gl.bindVertexArray(null);
  gl.useProgram(null);

  if (DEBUG) {
    console.log('updated fpressure');
    const tmp = new Float32Array(state.gpu.dataW * state.gpu.dataH * 2);
    gl.bindFramebuffer(gl.FRAMEBUFFER, state.gpu.fPressure.read.framebuffer);
    gl.readPixels(0, 0, state.gpu.dataW, state.gpu.dataH, gl.RG, gl.FLOAT, tmp);
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

export const updateVelocityGuessGPU = (
  gl: WebGL2RenderingContext,
  state: State,
  uniforms: UniformContext
) => {
  const program = getUpdateVelocityGuessProgram(gl);
  const quadVAO = getQuadVAO(gl);

  gl.useProgram(program.program);
  gl.bindVertexArray(quadVAO);

  uniforms.bind(gl, program);

  gl.bindFramebuffer(gl.FRAMEBUFFER, state.gpu.velocityGuess.write.framebuffer);
  gl.disable(gl.BLEND);
  gl.viewport(0, 0, state.gpu.dataW, state.gpu.dataH);
  gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  state.gpu.velocityGuess.swap();
  uniforms.set(velocityGuessSampler, {
    texture: state.gpu.velocityGuess.read.texture,
  });

  gl.bindVertexArray(null);
  gl.useProgram(null);

  if (DEBUG) {
    console.log('updated velocity guess');
    const tmp = new Float32Array(state.gpu.dataW * state.gpu.dataH * 2);
    gl.bindFramebuffer(
      gl.FRAMEBUFFER,
      state.gpu.velocityGuess.read.framebuffer
    );
    gl.readPixels(0, 0, state.gpu.dataW, state.gpu.dataH, gl.RG, gl.FLOAT, tmp);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    console.log(Array.from(tmp));
  }
};

const getupdatePositionFrag = memoize((gl: WebGL2RenderingContext) =>
  createShader(gl, {source: updatePositionFs, type: gl.FRAGMENT_SHADER})
);

const getupdatePositionProgram = memoize((gl: WebGL2RenderingContext) =>
  createProgram(gl, {
    shaders: [getCopyVertexVert(gl), getupdatePositionFrag(gl)],
  })
);

export const updatePositionGPU = (
  gl: WebGL2RenderingContext,
  state: State,
  uniforms: UniformContext
) => {
  const program = getupdatePositionProgram(gl);
  const quadVAO = getQuadVAO(gl);

  gl.useProgram(program.program);
  gl.bindVertexArray(quadVAO);

  uniforms.bind(gl, program);

  gl.bindFramebuffer(gl.FRAMEBUFFER, state.gpu.position.write.framebuffer);
  gl.viewport(0, 0, state.gpu.dataW, state.gpu.dataH);
  gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  state.gpu.position.swap();
  uniforms.set(positionSampler, {texture: state.gpu.position.read.texture});

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
  state: State,
  uniforms: UniformContext
) => {
  const program = getUpdateVelocityProgram(gl);
  const quadVAO = getQuadVAO(gl);

  gl.useProgram(program.program);
  gl.bindVertexArray(quadVAO);

  uniforms.bind(gl, program);

  gl.bindFramebuffer(gl.FRAMEBUFFER, state.gpu.velocity.write.framebuffer);
  gl.viewport(0, 0, state.gpu.dataW, state.gpu.dataH);
  gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  state.gpu.velocity.swap();
  uniforms.set(velocitySampler, {texture: state.gpu.velocity.read.texture});

  gl.bindVertexArray(null);
  gl.useProgram(null);
};

const getUpdateMaxSpeedVert = memoize((gl: WebGL2RenderingContext) =>
  createShader(gl, {source: updateMaxSpeedVs, type: gl.VERTEX_SHADER})
);

const getUpdateMaxSpeedFrag = memoize((gl: WebGL2RenderingContext) =>
  createShader(gl, {source: updateMaxSpeedFs, type: gl.FRAGMENT_SHADER})
);

const getUpdateMaxSpeedProgram = memoize((gl: WebGL2RenderingContext) =>
  createProgram(gl, {
    shaders: [getUpdateMaxSpeedVert(gl), getUpdateMaxSpeedFrag(gl)],
  })
);

const computeMaxSpeedGPU = (
  gl: WebGL2RenderingContext,
  state: State,
  uniforms: UniformContext
): number => {
  const program = getUpdateMaxSpeedProgram(gl);
  gl.useProgram(program.program);
  uniforms.bind(gl, program);

  // each particle will be represented as a single point, but their data is backed by textures.
  // so, we don't actually need any vertex attributes.
  gl.bindVertexArray(getEmptyVAO(gl));

  gl.bindFramebuffer(gl.FRAMEBUFFER, state.gpu.maxSpeed.framebuffer);
  gl.viewport(0, 0, 1, 1);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);

  gl.enable(gl.BLEND);
  gl.blendEquation(gl.MAX);
  gl.blendFunc(gl.ONE, gl.ONE);
  gl.drawArrays(gl.POINTS, 0, state.capacity);
  gl.disable(gl.BLEND);

  const result = new Float32Array(1);
  gl.readPixels(0, 0, 1, 1, gl.RED, gl.FLOAT, result);

  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.useProgram(null);

  return result[0];
};

const computeMaxTimestep = (
  gl: WebGL2RenderingContext,
  state: State,
  params: Params,
  uniforms: UniformContext
) => {
  const maxSpeed = computeMaxSpeedGPU(gl, state, uniforms);
  return (params.timestepLambda * params.particleRadius * 2) / maxSpeed;
};

export const updateSimulationGPU = ({
  gl,
  state,
  params,
  dt,
  uniforms,
}: {
  gl: WebGL2RenderingContext;
  state: State;
  params: Params;
  dt: number;
  uniforms: UniformContext;
}) => {
  updateNeighborsGPU(gl, state, params, uniforms);

  let maxDt = dt;
  if (params.autoSubstep) {
    maxDt = computeMaxTimestep(gl, state, params, uniforms);
  }

  let remainingDt = dt;
  let substep = 0;
  while (remainingDt > 0 && substep < params.maxSubsteps) {
    const stepDt = Math.min(maxDt, remainingDt);
    remainingDt -= stepDt;
    ++substep;
    uniforms.set(dtUniform, stepDt);

    updateDensityGPU(gl, state, uniforms);
    updateVelocityGuessGPU(gl, state, uniforms);
    updatePressureGPU(gl, state, uniforms);
    updateFPressureGPU(gl, state, uniforms);
    updateVelocityGPU(gl, state, uniforms);
    updatePositionGPU(gl, state, uniforms);
  }
};
