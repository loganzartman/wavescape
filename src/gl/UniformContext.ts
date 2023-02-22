import {memoize} from '../util';
import {GLSLDataType, GLSLDataTypeMap, GLSLUniform} from './types';

const getSetters = memoize(
  (
    gl: WebGL2RenderingContext
  ): {
    [key in GLSLDataType]: (
      location: WebGLUniformLocation,
      data: any,
      transpose: boolean
    ) => void;
  } => ({
    bool: (l, d, t) => gl.uniform1i(l, d),
    int: (l, d, t) => gl.uniform1i(l, d),
    uint: (l, d, t) => gl.uniform1ui(l, d),
    float: (l, d, t) => gl.uniform1f(l, d),
    bvec2: (l, d, t) => gl.uniform2iv(l, d),
    ivec2: (l, d, t) => gl.uniform2iv(l, d),
    uvec2: (l, d, t) => gl.uniform2uiv(l, d),
    vec2: (l, d, t) => gl.uniform2fv(l, d),
    bvec3: (l, d, t) => gl.uniform3iv(l, d),
    ivec3: (l, d, t) => gl.uniform3iv(l, d),
    uvec3: (l, d, t) => gl.uniform3uiv(l, d),
    vec3: (l, d, t) => gl.uniform3fv(l, d),
    bvec4: (l, d, t) => gl.uniform4iv(l, d),
    ivec4: (l, d, t) => gl.uniform4iv(l, d),
    uvec4: (l, d, t) => gl.uniform4uiv(l, d),
    vec4: (l, d, t) => gl.uniform4fv(l, d),
    mat2: (l, d, t) => gl.uniformMatrix2fv(l, t, d),
    mat3: (l, d, t) => gl.uniformMatrix3fv(l, t, d),
    mat4: (l, d, t) => gl.uniformMatrix4fv(l, t, d),
    mat2x3: (l, d, t) => gl.uniformMatrix2x3fv(l, t, d),
    mat3x2: (l, d, t) => gl.uniformMatrix3x2fv(l, t, d),
    mat3x4: (l, d, t) => gl.uniformMatrix3x4fv(l, t, d),
    mat4x3: (l, d, t) => gl.uniformMatrix4x3fv(l, t, d),
    sampler2D: (l, d, t) => gl.uniform1i(l, d),
    isampler2D: (l, d, t) => gl.uniform1i(l, d),
    usampler2D: (l, d, t) => gl.uniform1i(l, d),
  })
);

const setUniform = <T extends GLSLDataType>(
  gl: WebGL2RenderingContext,
  program: WebGLProgram,
  uniform: GLSLUniform<T>,
  value: GLSLDataTypeMap[T],
  tranpose: boolean = false
) => {
  const transpose = false;
  const location = gl.getUniformLocation(program, uniform.name);
  getSetters(gl)[uniform.type](location, value, transpose);
};

export class UniformContext {
  values: Map<GLSLUniform<any>, any> = new Map();

  set<T extends GLSLDataType>(
    uniform: GLSLUniform<T>,
    value: GLSLDataTypeMap[T]
  ) {
    this.values.set(uniform, value);
  }

  apply(gl: WebGL2RenderingContext, program: WebGLProgram) {
    for (const [uniform, value] of this.values) {
      setUniform(gl, program, uniform, value);
    }
  }

  copy(): UniformContext {
    const result = new UniformContext();
    result.values = new Map(this.values.entries());
    return result;
  }
}
