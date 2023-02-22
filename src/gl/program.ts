import {makeShaderDeps, ShaderDeps} from './glsl';
import {GLShader} from './shader';

export type GLProgram = {
  program: WebGLProgram;
  deps: ShaderDeps;
};

export const createProgram = (
  gl: WebGL2RenderingContext,
  {shaders}: {shaders: GLShader[]}
): GLProgram => {
  const program = gl.createProgram();
  if (!program) {
    throw new Error('Failed to create program');
  }

  const deps = makeShaderDeps();
  for (const shader of shaders) {
    gl.attachShader(program, shader.shader);
    shader.deps.uniforms.forEach((u) => deps.uniforms.add(u));
    shader.deps.defs.forEach((v, k) => deps.defs.set(k, v));
  }
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error('Error linking program:' + gl.getProgramInfoLog(program));
  }
  return {program, deps};
};
