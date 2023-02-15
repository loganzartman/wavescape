import {createBuffer, createProgram, createShader, createVAO} from './gl';
import {GPUState, State} from './state';
import {memoize} from './util';
import copyVertexVert from './copyVertex.vert.glsl';
import advectParticlesFrag from './advectParticles.frag.glsl';
import updateVelocityFrag from './updateVelocity.frag.glsl';
import {Params} from './params';

export const copyToTexture = (
  gl: WebGL2RenderingContext,
  src: Float32Array,
  dst: WebGLTexture,
  length: number,
  format: number
) => {
  gl.bindTexture(gl.TEXTURE_2D, dst);
  gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, length, 1, format, gl.FLOAT, src);
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
    gpuState.position.readTexture,
    state.n,
    gl.RG
  );
  copyToTexture(
    gl,
    state.velocity,
    gpuState.velocity.readTexture,
    state.n,
    gl.RG
  );
  copyToTexture(gl, state.mass, gpuState.mass.readTexture, state.n, gl.RED);
  copyToTexture(
    gl,
    state.density,
    gpuState.density.readTexture,
    state.n,
    gl.RED
  );
  copyToTexture(
    gl,
    state.velocityGuess,
    gpuState.velocityGuess.readTexture,
    state.n,
    gl.RG
  );
  copyToTexture(
    gl,
    state.fPressure,
    gpuState.fPressure.readTexture,
    state.n,
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
    gpuState.position.readFramebuffer,
    state.position,
    state.n,
    gl.RG
  );
  copyFromTexture(
    gl,
    gpuState.velocity.readFramebuffer,
    state.velocity,
    state.n,
    gl.RG
  );
  copyFromTexture(
    gl,
    gpuState.mass.readFramebuffer,
    state.mass,
    state.n,
    gl.RED
  );
  copyFromTexture(
    gl,
    gpuState.density.readFramebuffer,
    state.density,
    state.n,
    gl.RED
  );
  copyFromTexture(
    gl,
    gpuState.velocityGuess.readFramebuffer,
    state.velocityGuess,
    state.n,
    gl.RG
  );
  copyFromTexture(
    gl,
    gpuState.fPressure.readFramebuffer,
    state.fPressure,
    state.n,
    gl.RG
  );
};

const getQuadBuffer = memoize((gl: WebGL2RenderingContext) =>
  createBuffer(gl, {
    data: new Float32Array([-1, -1, 1, -1, 1, 1, -1, 1]),
    usage: gl.STATIC_DRAW,
  })
);
const getQuadVAO = memoize((gl: WebGL2RenderingContext) =>
  createVAO(gl, {attribs: [{buffer: getQuadBuffer(gl), size: 2}]})
);
const getCopyVertexVert = memoize((gl: WebGL2RenderingContext) =>
  createShader(gl, {source: copyVertexVert, type: gl.VERTEX_SHADER})
);

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
  gl.bindTexture(gl.TEXTURE_2D, gpuState.position.readTexture);
  gl.uniform1i(gl.getUniformLocation(program, 'positionSampler'), 0);
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, gpuState.velocity.readTexture);
  gl.uniform1i(gl.getUniformLocation(program, 'velocitySampler'), 1);
  gl.uniform1f(gl.getUniformLocation(program, 'dt'), dt);

  gl.bindFramebuffer(gl.FRAMEBUFFER, gpuState.position.writeFramebuffer);
  gl.viewport(0, 0, gpuState.n, 1);
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
  gl.bindTexture(gl.TEXTURE_2D, gpuState.velocityGuess.readTexture);
  gl.uniform1i(gl.getUniformLocation(program, 'velocityGuessSampler'), 0);
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, gpuState.mass.readTexture);
  gl.uniform1i(gl.getUniformLocation(program, 'massSampler'), 1);
  gl.activeTexture(gl.TEXTURE2);
  gl.bindTexture(gl.TEXTURE_2D, gpuState.fPressure.readTexture);
  gl.uniform1i(gl.getUniformLocation(program, 'fPressureSampler'), 2);
  gl.uniform1f(gl.getUniformLocation(program, 'dt'), dt);

  gl.bindFramebuffer(gl.FRAMEBUFFER, gpuState.velocity.writeFramebuffer);
  gl.viewport(0, 0, gpuState.n, 1);
  gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gpuState.velocity.swap();

  gl.bindVertexArray(null);
  gl.useProgram(null);
};
