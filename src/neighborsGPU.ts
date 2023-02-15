import {createProgram, createShader} from './gl';
import {getCopyVertexVert, getQuadVAO} from './gpuUtil';
import {sortOddEvenMerge} from './sortGPU';
import {GPUState} from './state';
import {memoize} from './util';
import updateKeyIndexPairsFrag from './updateKeyIndexPairs.frag.glsl';
import {Params} from './params';

export const updateNeighborsGPU = (
  gl: WebGL2RenderingContext,
  gpuState: GPUState,
  params: Params
) => {
  updateKeyIndexPairs(gl, gpuState, params);
  sortOddEvenMerge(gl, gpuState.keyIndexPairs, gpuState.n, 1);
  updateStartIndex(gl, gpuState);
  updateCount(gl, gpuState);
};

const getUpdateKeyIndexPairsFrag = memoize((gl: WebGL2RenderingContext) =>
  createShader(gl, {source: updateKeyIndexPairsFrag, type: gl.FRAGMENT_SHADER})
);

const getUpdateKeyIndexPairsProgram = memoize((gl: WebGL2RenderingContext) =>
  createProgram(gl, {
    shaders: [getCopyVertexVert(gl), getUpdateKeyIndexPairsFrag(gl)],
  })
);

const updateKeyIndexPairs = (
  gl: WebGL2RenderingContext,
  gpuState: GPUState,
  params: Params
) => {
  // write a texture where each ivec2 element contains a cell index and a particle in that cell
  const program = getUpdateKeyIndexPairsProgram(gl);
  gl.useProgram(program);
  gl.bindVertexArray(getQuadVAO(gl));
  gl.viewport(0, 0, gpuState.n, 1);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, gpuState.position.readTexture);
  gl.uniform1i(gl.getUniformLocation(program, 'positionSampler'), 0);

  gl.uniform2i(gl.getUniformLocation(program, 'resolution'), gpuState.n, 1);
  gl.uniform2i(
    gl.getUniformLocation(program, 'tableResolution'),
    gpuState.n,
    1
  );
  gl.uniform2f(
    gl.getUniformLocation(program, 'cellSize'),
    params.hSmoothing * 0.5,
    params.hSmoothing * 0.5
  );

  gl.bindFramebuffer(gl.FRAMEBUFFER, gpuState.keyIndexPairs.writeFramebuffer);
  gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gpuState.keyIndexPairs.swap();

  gl.bindTexture(gl.TEXTURE_2D, null);
  gl.bindVertexArray(null);
  gl.useProgram(null);

  const tmp = new Int32Array(gpuState.n * 2);
  gl.bindFramebuffer(gl.FRAMEBUFFER, gpuState.keyIndexPairs.readFramebuffer);
  gl.readPixels(0, 0, gpuState.n, 1, gl.RG_INTEGER, gl.INT, tmp);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  console.log(Array.from(tmp));
};

const updateStartIndex = (gl: WebGL2RenderingContext, gpuState: GPUState) => {};

const updateCount = (gl: WebGL2RenderingContext, gpuState: GPUState) => {};
