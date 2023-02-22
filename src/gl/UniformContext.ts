import {memoize} from '../util';
import {GLSLDataType, GLSLDataTypeMap, GLSLUniform} from './glsl';
import {GLProgram} from './program';

type SetTexture = {target?: number; texture: WebGLTexture};

type SetUniformTypeMap = Omit<
  GLSLDataTypeMap,
  'sampler2D' | 'isampler2D' | 'usampler2D'
> & {
  sampler2D: SetTexture;
  isampler2D: SetTexture;
  usampler2D: SetTexture;
};

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

const getMaxTextureUnits = memoize((gl: WebGL2RenderingContext) =>
  gl.getParameter(gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS)
);

export class UniformContext {
  values: Map<GLSLUniform<any>, any> = new Map();

  set<T extends GLSLDataType>(
    uniform: GLSLUniform<T>,
    value: SetUniformTypeMap[T]
  ) {
    this.values.set(uniform, value);
  }

  bind(gl: WebGL2RenderingContext, program: GLProgram) {
    const maxTextureUnits = getMaxTextureUnits(gl);
    const setters = getSetters(gl);
    let textureId = 0;

    const setUniform = <T extends GLSLDataType>(uniform: GLSLUniform<T>) => {
      const transpose = false;
      const location = gl.getUniformLocation(program.program, uniform.name);
      if (
        uniform.type === 'sampler2D' ||
        uniform.type === 'isampler2D' ||
        uniform.type === 'usampler2D'
      ) {
        if (textureId > maxTextureUnits) {
          throw new Error(
            `Trying to bind more texture units than available on this device (${maxTextureUnits})`
          );
        }
        const value: SetTexture = this.values.get(uniform);
        gl.activeTexture((gl as any)[`TEXTURE${textureId}`]);
        gl.bindTexture(value.target ?? gl.TEXTURE_2D, value.texture);
        gl.uniform1i(location, textureId);
        ++textureId;
      } else {
        const value = this.values.get(uniform);
        setters[uniform.type](location, value, transpose);
      }
    };

    for (const uniform of program.deps.uniforms) {
      if (this.values.has(uniform)) {
        setUniform(uniform);
      } else {
        throw new Error(
          `UniformContex lacks uniform ${uniform.type} ${uniform.name}, required by this program.`
        );
      }
    }
  }

  copy(): UniformContext {
    const result = new UniformContext();
    result.values = new Map(this.values.entries());
    return result;
  }
}
