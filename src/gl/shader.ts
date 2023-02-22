import {CompiledGLSL, ShaderDeps, UncompiledGLSL} from './glsl';
import {compile} from './glslpp';

export type GLShader = {
  shader: WebGLShader;
  deps: ShaderDeps;
};

const ensureCompiled = (glsl: UncompiledGLSL | CompiledGLSL): CompiledGLSL =>
  glsl instanceof UncompiledGLSL ? compile(glsl) : glsl;

export const createShader = (
  gl: WebGL2RenderingContext,
  {source, type}: {source: UncompiledGLSL | CompiledGLSL; type: number}
): GLShader => {
  const shader = gl.createShader(type);
  if (!shader) {
    throw new Error('Failed to create shader');
  }

  const compiled = ensureCompiled(source);
  gl.shaderSource(shader, compiled.source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error('Error compiling shader:' + gl.getShaderInfoLog(shader));
  }

  return {shader, deps: compiled.deps};
};
