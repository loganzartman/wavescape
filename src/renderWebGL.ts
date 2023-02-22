import {createBuffer, createVAO} from './gl/gl';
import {createProgram} from './gl/program';
import {createShader} from './gl/shader';
import {GPUState} from './state';
import {memoize} from './util';
import {drawParticlesVs, drawParticlesFs} from './shader/drawParticles';
import {UniformContext} from './gl/UniformContext';

const getCircleVertexBuffer = memoize(
  (gl: WebGL2RenderingContext, vertexCount: number) =>
    createBuffer(gl, {
      data: new Float32Array(
        Array.from({length: vertexCount}).flatMap((_, i) => [
          Math.cos((i / vertexCount) * 2 * Math.PI),
          Math.sin((i / vertexCount) * 2 * Math.PI),
        ])
      ),
      usage: gl.STATIC_DRAW,
    })
);

const getCircleVAO = memoize(
  (gl: WebGL2RenderingContext, vertexCount: number) =>
    createVAO(gl, {
      attribs: [{buffer: getCircleVertexBuffer(gl, vertexCount), size: 2}],
    })
);

const getDrawParticlesVert = memoize((gl: WebGL2RenderingContext) =>
  createShader(gl, {source: drawParticlesVs, type: gl.VERTEX_SHADER})
);

const getDrawParticlesFrag = memoize((gl: WebGL2RenderingContext) =>
  createShader(gl, {source: drawParticlesFs, type: gl.FRAGMENT_SHADER})
);

const getDrawParticlesProgram = memoize((gl: WebGL2RenderingContext) =>
  createProgram(gl, {
    shaders: [getDrawParticlesVert(gl), getDrawParticlesFrag(gl)],
  })
);

export const renderWebGL = (
  gl: WebGL2RenderingContext,
  gpuState: GPUState,
  uniforms: UniformContext
) => {
  const circleVertices = 10;
  const program = getDrawParticlesProgram(gl);
  const circleVAO = getCircleVAO(gl, circleVertices);

  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.clearColor(1, 1, 1, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);

  gl.useProgram(program.program);
  gl.bindVertexArray(circleVAO);

  uniforms.bind(gl, program);

  gl.drawArraysInstanced(gl.TRIANGLE_FAN, 0, circleVertices, gpuState.n);

  gl.bindVertexArray(null);
  gl.useProgram(null);
};
