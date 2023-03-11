import {createBuffer, createVAO} from './gl/gl';
import {createProgram} from './gl/program';
import {createShader} from './gl/shader';
import {State} from './state';
import {memoize} from './util';
import {
  drawThicknessFs,
  drawThicknessVs,
  drawMetaballsFs,
} from './shader/drawMetaballs';
import {drawParticlesVs, drawParticlesFs} from './shader/drawParticles';
import {UniformContext} from './gl/UniformContext';
import {DisplayTextures} from './displayTextures';
import {getCopyVertexVert, getQuadVAO} from './gpuUtil';
import {Params} from './params';

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

export const renderParticles = (
  gl: WebGL2RenderingContext,
  state: State,
  uniforms: UniformContext
) => {
  const circleVertices = 10;
  const program = getDrawParticlesProgram(gl);
  const circleVAO = getCircleVAO(gl, circleVertices);

  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);

  gl.useProgram(program.program);
  gl.bindVertexArray(circleVAO);

  uniforms.bind(gl, program);

  gl.drawArraysInstanced(gl.TRIANGLE_FAN, 0, circleVertices, state.capacity);

  gl.bindVertexArray(null);
  gl.useProgram(null);
};

const getDrawThicknessVert = memoize((gl: WebGL2RenderingContext) =>
  createShader(gl, {source: drawThicknessVs, type: gl.VERTEX_SHADER})
);

const getDrawThicknessFrag = memoize((gl: WebGL2RenderingContext) =>
  createShader(gl, {source: drawThicknessFs, type: gl.FRAGMENT_SHADER})
);

const getDrawThicknessProgram = memoize((gl: WebGL2RenderingContext) =>
  createProgram(gl, {
    shaders: [getDrawThicknessVert(gl), getDrawThicknessFrag(gl)],
  })
);

const renderThickness = (
  gl: WebGL2RenderingContext,
  displayTextures: DisplayTextures,
  state: State,
  uniforms: UniformContext
) => {
  const program = getDrawThicknessProgram(gl);

  gl.bindFramebuffer(gl.FRAMEBUFFER, displayTextures.thickness.framebuffer);

  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);

  gl.useProgram(program.program);
  gl.bindVertexArray(getQuadVAO(gl));

  uniforms.bind(gl, program);

  gl.enable(gl.BLEND);
  gl.blendEquation(gl.FUNC_ADD);
  gl.blendFunc(gl.ONE, gl.ONE);
  gl.drawArraysInstanced(gl.TRIANGLE_FAN, 0, 4, state.capacity);
  gl.disable(gl.BLEND);

  gl.bindVertexArray(null);
  gl.useProgram(null);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
};

const getDrawMetaballsFrag = memoize((gl: WebGL2RenderingContext) =>
  createShader(gl, {source: drawMetaballsFs, type: gl.FRAGMENT_SHADER})
);

const getDrawMetaballsProgram = memoize((gl: WebGL2RenderingContext) =>
  createProgram(gl, {
    shaders: [getCopyVertexVert(gl), getDrawMetaballsFrag(gl)],
  })
);

const renderMetaballs = (
  gl: WebGL2RenderingContext,
  displayTextures: DisplayTextures,
  state: State,
  uniforms: UniformContext
) => {
  const program = getDrawMetaballsProgram(gl);

  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);

  gl.useProgram(program.program);
  gl.bindVertexArray(getQuadVAO(gl));

  uniforms.bind(gl, program);

  // alpha blending
  gl.enable(gl.BLEND);
  gl.blendEquation(gl.FUNC_ADD);
  gl.blendFuncSeparate(
    gl.SRC_ALPHA,
    gl.ONE_MINUS_SRC_ALPHA,
    gl.ONE,
    gl.ONE_MINUS_SRC_ALPHA
  );
  gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
  gl.disable(gl.BLEND);

  gl.bindVertexArray(null);
  gl.useProgram(null);
};

export const renderWebGL = ({
  gl,
  displayTextures,
  state,
  uniforms,
  params,
}: {
  gl: WebGL2RenderingContext;
  displayTextures: DisplayTextures;
  state: State;
  uniforms: UniformContext;
  params: Params;
}) => {
  if (params.renderMode === 'metaballs') {
    renderThickness(gl, displayTextures, state, uniforms);
    renderMetaballs(gl, displayTextures, state, uniforms);
  } else {
    renderParticles(gl, state, uniforms);
  }
};
