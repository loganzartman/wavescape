import {createTexture2D, PingPongTexture} from './gl/gl';
import {createProgram} from './gl/program';
import {createShader} from './gl/shader';
import {memoize, nextPowerOf2, shuffle, time} from './util';
import {sortOddEvenMergeFs} from './shader/sortOddEvenMerge';
import {getCopyVertexVert, getQuadVAO} from './gpuUtil';

const copyToTextureInt = (
  gl: WebGL2RenderingContext,
  src: Int32Array,
  dst: WebGLTexture,
  width: number,
  height: number,
  format: number
) => {
  gl.bindTexture(gl.TEXTURE_2D, dst);
  gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, width, height, format, gl.INT, src);
  gl.bindTexture(gl.TEXTURE_2D, null);
};

const copyFromTextureInt = (
  gl: WebGL2RenderingContext,
  src: WebGLTexture,
  dst: Int32Array,
  width: number,
  height: number,
  format: number
) => {
  gl.bindFramebuffer(gl.FRAMEBUFFER, src);
  gl.readPixels(0, 0, width, height, format, gl.INT, dst);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
};

const getSortOddEvenMergeFrag = memoize((gl: WebGL2RenderingContext) =>
  createShader(gl, {source: sortOddEvenMergeFs, type: gl.FRAGMENT_SHADER})
);
const getSortOddEvenMergeProgram = memoize((gl: WebGL2RenderingContext) =>
  createProgram(gl, {
    shaders: [getCopyVertexVert(gl), getSortOddEvenMergeFrag(gl)],
  })
);

/** batcher's odd-even merge sort
 * some references:
 * https://developer.nvidia.com/gpugems/gpugems2/part-vi-simulation-and-numerical-algorithms/chapter-46-improved-gpu-sorting
 * https://en.wikipedia.org/wiki/Batcher_odd%E2%80%93even_mergesort
 * https://bekbolatov.github.io/sorting/
 * the last is helpful for visualizing the pattern of comparison pairs
 */
export const sortOddEvenMerge = (
  gl: WebGL2RenderingContext,
  texture: PingPongTexture,
  textureW: number,
  textureH: number,
  n: number
) => {
  const program = getSortOddEvenMergeProgram(gl);

  gl.useProgram(program.program);
  gl.bindVertexArray(getQuadVAO(gl));

  gl.viewport(0, 0, textureW, textureH);
  gl.uniform2i(
    gl.getUniformLocation(program.program, 'resolution'),
    textureW,
    textureH
  );
  gl.uniform1i(gl.getUniformLocation(program.program, 'n'), n);
  const inputSamplerLoc = gl.getUniformLocation(
    program.program,
    'inputSampler'
  );
  const stageWidthLoc = gl.getUniformLocation(program.program, 'stageWidth');
  const compareWidthLoc = gl.getUniformLocation(
    program.program,
    'compareWidth'
  );
  gl.activeTexture(gl.TEXTURE0);

  // "width" of a pair (distance between compared elements) increases as powers of 2
  for (let stageWidth = 1; stageWidth <= nextPowerOf2(n); stageWidth *= 2) {
    // for each pass in a stage, width is halved (merge steps)
    for (let compareWidth = stageWidth; compareWidth >= 1; compareWidth /= 2) {
      gl.bindTexture(gl.TEXTURE_2D, texture.read.texture);
      gl.uniform1i(inputSamplerLoc, 0);
      gl.uniform1i(stageWidthLoc, stageWidth);
      gl.uniform1i(compareWidthLoc, compareWidth);

      gl.bindFramebuffer(gl.FRAMEBUFFER, texture.write.framebuffer);
      gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
      texture.swap();
    }
  }

  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.bindTexture(gl.TEXTURE_2D, null);
  gl.bindVertexArray(null);
  gl.useProgram(null);
};

export const testSort = (gl: WebGL2RenderingContext) => {
  const N = 2000;
  const tex = new PingPongTexture(gl, () =>
    createTexture2D(gl, {
      internalFormat: gl.RG32I,
      width: N,
      height: 1,
    })
  );

  const makeData = () =>
    new Int32Array(
      shuffle(Array.from({length: N}).map((_, i) => i)).flatMap((i) => [
        Math.floor(i / 2),
        i,
      ])
    );
  let data = makeData();
  console.log('before', data);

  const iters = 20;
  const warmup = 10;
  let totalCPU = 0;
  let totalGPU = 0;

  for (let i = 0; i < iters + warmup; ++i) {
    data = makeData();
    copyToTextureInt(gl, data, tex.read.texture, N, 1, gl.RG_INTEGER);
    if (i >= warmup) {
      totalCPU += time(() => data.sort());
      totalGPU += time(() => sortOddEvenMerge(gl, tex, N, 1, N));
    }
    copyFromTextureInt(gl, tex.read.framebuffer, data, N, 1, gl.RG_INTEGER);
  }

  console.log('after', data);

  console.log('average millisec to sort: ', totalCPU / iters);
  console.log('average millisec to sort GPU: ', totalGPU / iters);
};
