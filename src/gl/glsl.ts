type Tuple2<T> = [T, T] | ArrayLike<T>;
type Tuple3<T> = [T, T, T] | ArrayLike<T>;
type Tuple4<T> = [T, T, T, T] | ArrayLike<T>;
type Tuple6<T> = [T, T, T, T, T, T] | ArrayLike<T>;
type Tuple9<T> = [T, T, T, T, T, T, T, T, T] | ArrayLike<T>;
type Tuple12<T> = [T, T, T, T, T, T, T, T, T, T, T, T] | ArrayLike<T>;
type Tuple16<T> =
  | [T, T, T, T, T, T, T, T, T, T, T, T, T, T, T, T]
  | ArrayLike<T>;
export type GLSLDataTypeMap = {
  bool: boolean;
  int: number;
  uint: number;
  float: number;
  bvec2: Tuple2<boolean>;
  ivec2: Tuple2<number>;
  uvec2: Tuple2<number>;
  vec2: Tuple2<number>;
  bvec3: Tuple3<boolean>;
  ivec3: Tuple3<number>;
  uvec3: Tuple3<number>;
  vec3: Tuple3<number>;
  bvec4: Tuple4<boolean>;
  ivec4: Tuple4<number>;
  uvec4: Tuple4<number>;
  vec4: Tuple4<number>;
  mat2: Tuple4<number>;
  mat3: Tuple9<number>;
  mat4: Tuple16<number>;
  mat2x3: Tuple6<number>;
  mat3x2: Tuple6<number>;
  mat3x4: Tuple12<number>;
  mat4x3: Tuple12<number>;
  sampler2D: number;
  isampler2D: number;
  usampler2D: number;
};
export type GLSLDataType = keyof GLSLDataTypeMap;

export class UncompiledGLSL {
  strings: string[];
  values: any[];

  constructor(strings: string[], values: any[]) {
    this.strings = strings;
    this.values = values;
  }
}

export type ShaderDeps = {
  uniforms: Set<GLSLUniform<any>>;
  defs: Map<GLSLDefinition, string>;
};

export const makeShaderDeps = (): ShaderDeps => ({
  uniforms: new Set(),
  defs: new Map(),
});

export class CompiledGLSL {
  source: string;
  deps: ShaderDeps;

  constructor(source: string, deps: ShaderDeps) {
    this.source = source;
    this.deps = deps;
  }
}

export class GLSLFragment {
  glsl: UncompiledGLSL;

  constructor(glsl: UncompiledGLSL) {
    this.glsl = glsl;
  }
}

export class GLSLUniform<T extends GLSLDataType> {
  name: string;
  type: T;
  block?: GLSLUniformBlock;

  constructor(name: string, type: T, block: GLSLUniformBlock = null) {
    this.name = name;
    this.type = type;
    this.block = block;
  }
}

export class GLSLDefinition {
  name: string;
  definition: UncompiledGLSL;

  constructor(name: string, definition: UncompiledGLSL) {
    this.name = name;
    this.definition = definition;
  }
}

export class GLSLUniformBlock {
  name: string;
  uniforms: Set<GLSLUniform<any>> = new Set();

  constructor(name: string) {
    this.name = name;
  }

  _add(uniform: GLSLUniform<any>) {
    if (uniform.block !== this) {
      throw new Error(
        `Use the GLSLUniform constructor to assign the uniform ${uniform.name} to this block (${this.name})`
      );
    }
    this.uniforms.add(uniform);
    uniform.block = this;
  }
}

export type GLSLReference = GLSLUniform<any> | GLSLDefinition | string | number;
