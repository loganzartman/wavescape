import {createBuffer, createProgram, createShader, createVAO} from './gl/gl';
import {Params} from './params';
import {GPUState} from './state';
import {memoize} from './util';
import {mat4} from 'gl-matrix';
import {drawParticlesVs, drawParticlesFs} from './shader/drawParticles';

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
  params: Params
) => {
  const circleVertices = 10;
  const program = getDrawParticlesProgram(gl);
  const circleVAO = getCircleVAO(gl, circleVertices);

  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.clearColor(1, 1, 1, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);

  gl.useProgram(program);
  gl.bindVertexArray(circleVAO);

  const dim = Math.min(gl.canvas.width, gl.canvas.height);
  const projection = mat4.create();
  const hOffset = ((gl.canvas.width - dim) / dim) * 0.5;
  const vOffset = ((gl.canvas.height - dim) / dim) * 0.5;
  mat4.ortho(projection, -hOffset, 1 + hOffset, 1 + vOffset, -vOffset, -1, 1);
  gl.uniformMatrix4fv(
    gl.getUniformLocation(program, 'projection'),
    false,
    projection
  );

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, gpuState.position.read.texture);
  gl.uniform1i(gl.getUniformLocation(program, 'positionSampler'), 0);
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, gpuState.velocity.read.texture);
  gl.uniform1i(gl.getUniformLocation(program, 'velocitySampler'), 1);
  gl.activeTexture(gl.TEXTURE2);
  gl.bindTexture(gl.TEXTURE_2D, gpuState.velocity.read.texture);
  gl.uniform1i(gl.getUniformLocation(program, 'densitySampler'), 2);
  gl.uniform1i(gl.getUniformLocation(program, 'n'), gpuState.n);

  gl.uniform2i(
    gl.getUniformLocation(program, 'resolution'),
    gpuState.dataW,
    gpuState.dataH
  );
  gl.uniform1f(
    gl.getUniformLocation(program, 'particleRadius'),
    params.particleRadius
  );

  gl.drawArraysInstanced(gl.TRIANGLE_FAN, 0, circleVertices, gpuState.n);

  gl.bindVertexArray(null);
  gl.useProgram(null);
};
