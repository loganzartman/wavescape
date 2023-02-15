import {createBuffer, createShader, createVAO} from './gl';
import {memoize} from './util';
import copyVertexVert from './copyVertex.vert.glsl';

export const getQuadBuffer = memoize((gl: WebGL2RenderingContext) =>
  createBuffer(gl, {
    data: new Float32Array([-1, -1, 1, -1, 1, 1, -1, 1]),
    usage: gl.STATIC_DRAW,
  })
);

export const getQuadVAO = memoize((gl: WebGL2RenderingContext) =>
  createVAO(gl, {attribs: [{buffer: getQuadBuffer(gl), size: 2}]})
);

export const getCopyVertexVert = memoize((gl: WebGL2RenderingContext) =>
  createShader(gl, {source: copyVertexVert, type: gl.VERTEX_SHADER})
);