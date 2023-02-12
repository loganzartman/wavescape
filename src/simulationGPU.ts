import {createBuffer, createProgram, createShader, createVAO} from './gl';
import {GPUState, State} from './state';
import {memoize} from './util';
import advectParticlesVert from './advectParticles.vert.glsl';
import advectParticlesFrag from './advectParticles.frag.glsl';
import {Params} from './params';

export const copyStateToGPU = (
  gl: WebGL2RenderingContext,
  state: State,
  gpuState: GPUState
) => {
  gl.bindTexture(gl.TEXTURE_2D, gpuState.position.readTexture);
  gl.texSubImage2D(
    gl.TEXTURE_2D,
    0,
    0,
    0,
    state.n,
    1,
    gl.RG,
    gl.FLOAT,
    state.position
  );
  gl.bindTexture(gl.TEXTURE_2D, null);

  gl.bindTexture(gl.TEXTURE_2D, gpuState.velocity.readTexture);
  gl.texSubImage2D(
    gl.TEXTURE_2D,
    0,
    0,
    0,
    state.n,
    1,
    gl.RG,
    gl.FLOAT,
    state.velocity
  );
  gl.bindTexture(gl.TEXTURE_2D, null);
};

export const copyStateFromGPU = (
  gl: WebGL2RenderingContext,
  state: State,
  gpuState: GPUState
) => {
  gl.bindFramebuffer(gl.FRAMEBUFFER, gpuState.position.readFramebuffer);
  gl.readPixels(0, 0, gpuState.n, 1, gl.RG, gl.FLOAT, state.position);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);

  gl.bindFramebuffer(gl.FRAMEBUFFER, gpuState.velocity.readFramebuffer);
  gl.readPixels(0, 0, gpuState.n, 1, gl.RG, gl.FLOAT, state.velocity);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
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

const getAdvectParticlesVert = memoize((gl: WebGL2RenderingContext) =>
  createShader(gl, {source: advectParticlesVert, type: gl.VERTEX_SHADER})
);
const getAdvectParticlesFrag = memoize((gl: WebGL2RenderingContext) =>
  createShader(gl, {source: advectParticlesFrag, type: gl.FRAGMENT_SHADER})
);
const getAdvectParticlesProgram = memoize((gl: WebGL2RenderingContext) =>
  createProgram(gl, {
    shaders: [getAdvectParticlesVert(gl), getAdvectParticlesFrag(gl)],
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
