import {createProgram, createShader, createVAO} from './gl';
import {getCopyVertexVert, getQuadVAO} from './gpuUtil';
import {sortOddEvenMerge} from './sortGPU';
import {GPUState} from './state';
import {groupNComponents, memoize} from './util';
import {Params} from './params';
import updateKeyIndexPairsFrag from './updateKeyIndexPairs.frag.glsl';
import updateStartIndexVert from './updateStartIndex.vert.glsl';
import updateStartIndexFrag from './updateStartIndex.frag.glsl';

const DEBUG = true;

export const updateNeighborsGPU = (
  gl: WebGL2RenderingContext,
  gpuState: GPUState,
  params: Params
) => {
  updateKeyIndexPairs(gl, gpuState, params);

  if (DEBUG) {
    console.log('updated key/index pairs');
    const tmp = new Int32Array(gpuState.n * 2);
    gl.bindFramebuffer(gl.FRAMEBUFFER, gpuState.keyIndexPairs.read.framebuffer);
    gl.readPixels(0, 0, gpuState.n, 1, gl.RG_INTEGER, gl.INT, tmp);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    console.log(groupNComponents(Array.from(tmp), 2));
  }

  sortOddEvenMerge(gl, gpuState.keyIndexPairs, gpuState.n, 1);

  if (DEBUG) {
    console.log('sorted key/index pairs');
    const tmp = new Int32Array(gpuState.n * 2);
    gl.bindFramebuffer(gl.FRAMEBUFFER, gpuState.keyIndexPairs.read.framebuffer);
    gl.readPixels(0, 0, gpuState.n, 1, gl.RG_INTEGER, gl.INT, tmp);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    console.log(groupNComponents(Array.from(tmp), 2));
  }

  updateStartIndex(gl, gpuState, params);

  if (DEBUG) {
    console.log('updated start indices');
    const tmp = new Float32Array(gpuState.n * 2);
    gl.bindFramebuffer(
      gl.FRAMEBUFFER,
      gpuState.neighborsTable.read.framebuffer
    );
    gl.readPixels(0, 0, gpuState.n, 1, gl.RG, gl.FLOAT, tmp);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    console.log(groupNComponents(Array.from(tmp), 2));
  }

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
  gl.bindTexture(gl.TEXTURE_2D, gpuState.position.read.texture);
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

  gl.bindFramebuffer(gl.FRAMEBUFFER, gpuState.keyIndexPairs.write.framebuffer);
  gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gpuState.keyIndexPairs.swap();

  gl.bindTexture(gl.TEXTURE_2D, null);
  gl.bindVertexArray(null);
  gl.useProgram(null);
};

const getUpdateStartIndexVert = memoize((gl: WebGL2RenderingContext) =>
  createShader(gl, {source: updateStartIndexVert, type: gl.VERTEX_SHADER})
);

const getUpdateStartIndexFrag = memoize((gl: WebGL2RenderingContext) =>
  createShader(gl, {source: updateStartIndexFrag, type: gl.FRAGMENT_SHADER})
);

const getUpdateStartIndexProgram = memoize((gl: WebGL2RenderingContext) =>
  createProgram(gl, {
    shaders: [getUpdateStartIndexVert(gl), getUpdateStartIndexFrag(gl)],
  })
);

const getEmptyVAO = memoize((gl: WebGL2RenderingContext) =>
  createVAO(gl, {attribs: []})
);

const updateStartIndex = (
  gl: WebGL2RenderingContext,
  gpuState: GPUState,
  params: Params
) => {
  const program = getUpdateStartIndexProgram(gl);
  gl.useProgram(program);
  // each particle will be represented as a single point, but their data is backed by textures.
  // so, we don't actually need any vertex attributes.
  gl.bindVertexArray(getEmptyVAO(gl));
  gl.viewport(0, 0, gpuState.n, 1);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, gpuState.position.read.texture);
  gl.uniform1i(gl.getUniformLocation(program, 'positionSampler'), 0);
  gl.uniform2i(
    gl.getUniformLocation(program, 'positionResolution'),
    gpuState.n,
    1
  );
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

  gl.bindFramebuffer(gl.FRAMEBUFFER, gpuState.neighborsTable.write.framebuffer);
  gl.clearColor(gpuState.n, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.enable(gl.BLEND);
  gl.blendEquation(gl.MIN);
  gl.blendFunc(gl.ONE, gl.ONE);
  gl.drawArrays(gl.POINTS, 0, gpuState.n);
  gl.disable(gl.BLEND);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gpuState.neighborsTable.swap();

  gl.useProgram(null);
};

const updateCount = (gl: WebGL2RenderingContext, gpuState: GPUState) => {};