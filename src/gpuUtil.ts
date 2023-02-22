import {createBuffer, createShader, createVAO} from './gl/gl';
import {memoize} from './util';
import {copyVertexVs} from './shader/copyVertex';

export const getQuadBuffer = memoize((gl: WebGL2RenderingContext) =>
  createBuffer(gl, {
    data: new Float32Array([-1, -1, 1, -1, 1, 1, -1, 1]),
    usage: gl.STATIC_DRAW,
  })
);

export const getQuadVAO = memoize((gl: WebGL2RenderingContext) =>
  createVAO(gl, {attribs: [{buffer: getQuadBuffer(gl), size: 2}]})
);

export const getEmptyVAO = memoize((gl: WebGL2RenderingContext) =>
  createVAO(gl, {attribs: []})
);

export const getCopyVertexVert = memoize((gl: WebGL2RenderingContext) =>
  createShader(gl, {source: copyVertexVs, type: gl.VERTEX_SHADER})
);
