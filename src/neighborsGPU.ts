import {createProgram, createShader} from './gl/gl';
import {getCopyVertexVert, getEmptyVAO, getQuadVAO} from './gpuUtil';
import {sortOddEvenMerge} from './sortGPU';
import {GPUState} from './state';
import {groupNComponents, memoize} from './util';
import {Params} from './params';
import {updateKeyIndexPairsFs} from './shader/updateKeyIndexPairs';
import {
  updateStartIndexVs,
  updateStartIndexFs,
} from './shader/updateStartIndex';
import {updateCountVs, updateCountFs} from './shader/updateCount';
import {UniformContext} from './gl/UniformContext';

const DEBUG = false;

export const updateNeighborsGPU = (
  gl: WebGL2RenderingContext,
  gpuState: GPUState,
  params: Params,
  uniforms: UniformContext
) => {
  updateKeyIndexPairs(gl, gpuState, uniforms);

  if (DEBUG) {
    console.log('updated key/index pairs');
    const tmp = new Int32Array(gpuState.dataW * gpuState.dataH * 2);
    gl.bindFramebuffer(
      gl.FRAMEBUFFER,
      gpuState.keyParticlePairs.read.framebuffer
    );
    gl.readPixels(
      0,
      0,
      gpuState.dataW,
      gpuState.dataH,
      gl.RG_INTEGER,
      gl.INT,
      tmp
    );
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    console.log(groupNComponents(Array.from(tmp), 2));
  }

  sortOddEvenMerge(
    gl,
    gpuState.keyParticlePairs,
    gpuState.dataW,
    gpuState.dataH,
    gpuState.n
  );

  if (DEBUG) {
    console.log('sorted key/index pairs');
    const tmp = new Int32Array(gpuState.dataW * gpuState.dataH * 2);
    gl.bindFramebuffer(
      gl.FRAMEBUFFER,
      gpuState.keyParticlePairs.read.framebuffer
    );
    gl.readPixels(
      0,
      0,
      gpuState.dataW,
      gpuState.dataH,
      gl.RG_INTEGER,
      gl.INT,
      tmp
    );
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    console.log(groupNComponents(Array.from(tmp), 2));
  }

  updateStartIndex(gl, gpuState, params, uniforms);

  if (DEBUG) {
    console.log('updated start indices');
    const tmp = new Float32Array(
      params.cellResolutionX * params.cellResolutionY * 2
    );
    gl.bindFramebuffer(gl.FRAMEBUFFER, gpuState.neighborsTable.framebuffer);
    gl.readPixels(
      0,
      0,
      params.cellResolutionX,
      params.cellResolutionY,
      gl.RG,
      gl.FLOAT,
      tmp
    );
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    console.log(groupNComponents(Array.from(tmp), 2));
  }

  updateCount(gl, gpuState, params, uniforms);

  if (DEBUG) {
    console.log('updated counts');
    const tmp = new Float32Array(
      params.cellResolutionX * params.cellResolutionY * 2
    );
    gl.bindFramebuffer(gl.FRAMEBUFFER, gpuState.neighborsTable.framebuffer);
    gl.readPixels(
      0,
      0,
      params.cellResolutionX,
      params.cellResolutionY,
      gl.RG,
      gl.FLOAT,
      tmp
    );
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    console.log(groupNComponents(Array.from(tmp), 2));
  }
};

const getUpdateKeyIndexPairsFrag = memoize((gl: WebGL2RenderingContext) =>
  createShader(gl, {source: updateKeyIndexPairsFs, type: gl.FRAGMENT_SHADER})
);

const getUpdateKeyIndexPairsProgram = memoize((gl: WebGL2RenderingContext) =>
  createProgram(gl, {
    shaders: [getCopyVertexVert(gl), getUpdateKeyIndexPairsFrag(gl)],
  })
);

const updateKeyIndexPairs = (
  gl: WebGL2RenderingContext,
  gpuState: GPUState,
  uniforms: UniformContext
) => {
  // write a texture where each ivec2 element contains a cell index and a particle in that cell
  const program = getUpdateKeyIndexPairsProgram(gl);
  gl.useProgram(program);
  gl.bindVertexArray(getQuadVAO(gl));
  gl.viewport(0, 0, gpuState.dataW, gpuState.dataH);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, gpuState.position.read.texture);
  gl.uniform1i(gl.getUniformLocation(program, 'positionSampler'), 0);

  uniforms.apply(gl, program);

  gl.bindFramebuffer(
    gl.FRAMEBUFFER,
    gpuState.keyParticlePairs.write.framebuffer
  );
  gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gpuState.keyParticlePairs.swap();

  gl.bindTexture(gl.TEXTURE_2D, null);
  gl.bindVertexArray(null);
  gl.useProgram(null);
};

const getUpdateStartIndexVert = memoize((gl: WebGL2RenderingContext) =>
  createShader(gl, {source: updateStartIndexVs, type: gl.VERTEX_SHADER})
);

const getUpdateStartIndexFrag = memoize((gl: WebGL2RenderingContext) =>
  createShader(gl, {source: updateStartIndexFs, type: gl.FRAGMENT_SHADER})
);

const getUpdateStartIndexProgram = memoize((gl: WebGL2RenderingContext) =>
  createProgram(gl, {
    shaders: [getUpdateStartIndexVert(gl), getUpdateStartIndexFrag(gl)],
  })
);

const updateStartIndex = (
  gl: WebGL2RenderingContext,
  gpuState: GPUState,
  params: Params,
  uniforms: UniformContext
) => {
  const program = getUpdateStartIndexProgram(gl);
  gl.useProgram(program);
  // each particle will be represented as a single point, but their data is backed by textures.
  // so, we don't actually need any vertex attributes.
  gl.bindVertexArray(getEmptyVAO(gl));
  gl.viewport(0, 0, params.cellResolutionX, params.cellResolutionY);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, gpuState.keyParticlePairs.read.texture);
  gl.uniform1i(gl.getUniformLocation(program, 'keyParticleSampler'), 0);

  uniforms.apply(gl, program);

  gl.bindFramebuffer(gl.FRAMEBUFFER, gpuState.neighborsTable.framebuffer);
  gl.clearColor(gpuState.n, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.enable(gl.BLEND);
  gl.blendEquation(gl.MIN);
  gl.blendFunc(gl.ONE, gl.ONE);
  gl.drawArrays(gl.POINTS, 0, gpuState.n);
  gl.disable(gl.BLEND);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);

  gl.useProgram(null);
};

const getUpdateCountVert = memoize((gl: WebGL2RenderingContext) =>
  createShader(gl, {source: updateCountVs, type: gl.VERTEX_SHADER})
);

const getUpdateCountFrag = memoize((gl: WebGL2RenderingContext) =>
  createShader(gl, {source: updateCountFs, type: gl.FRAGMENT_SHADER})
);

const getUpdateCountProgram = memoize((gl: WebGL2RenderingContext) =>
  createProgram(gl, {
    shaders: [getUpdateCountVert(gl), getUpdateCountFrag(gl)],
  })
);

const updateCount = (
  gl: WebGL2RenderingContext,
  gpuState: GPUState,
  params: Params,
  uniforms: UniformContext
) => {
  const program = getUpdateCountProgram(gl);
  gl.useProgram(program);
  // each particle will be represented as a single point, but their data is backed by textures.
  // so, we don't actually need any vertex attributes.
  gl.bindVertexArray(getEmptyVAO(gl));
  gl.viewport(0, 0, params.cellResolutionX, params.cellResolutionY);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, gpuState.keyParticlePairs.read.texture);
  gl.uniform1i(gl.getUniformLocation(program, 'keyParticleSampler'), 0);

  uniforms.apply(gl, program);

  gl.bindFramebuffer(gl.FRAMEBUFFER, gpuState.neighborsTable.framebuffer);
  gl.enable(gl.BLEND);
  gl.blendEquation(gl.FUNC_ADD);
  gl.blendFunc(gl.ONE, gl.ONE);
  gl.drawArrays(gl.POINTS, 0, gpuState.n);
  gl.disable(gl.BLEND);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);

  gl.useProgram(null);
};
