import {
  GLSLDefinition,
  GLSLReference,
  GLSLUniform,
  UncompiledGLSL,
  ShaderDeps,
  CompiledGLSL,
  makeShaderDeps,
} from './glsl';

export const glsl = (
  strings: TemplateStringsArray,
  ...values: GLSLReference[]
) => new UncompiledGLSL(Array.from(strings), values);

const generateReference = (value: any, deps: ShaderDeps) => {
  if (value instanceof GLSLUniform) {
    deps.uniforms.add(value);
    return value.name;
  }
  if (value instanceof GLSLDefinition) {
    if (!deps.defs.has(value))
      deps.defs.set(value, compileBody(value.definition, deps));
    return value.name;
  }
  throw new Error('Unsupported reference: ' + value);
};

const generateUniforms = (deps: ShaderDeps) =>
  Array.from(deps.uniforms)
    .filter((u) => !u.block)
    .map((u) => `uniform ${u.type} ${u.name};`)
    .join('\n');

const generateUniformBlocks = (deps: ShaderDeps) => {
  const uniforms = Array.from(deps.uniforms);
  const blocks = Array.from(
    new Set(uniforms.filter((u) => u.block).map((u) => u.block))
  );
  return blocks.map((block) =>
    [
      `uniform ${block.name} {`,
      ...uniforms.map((u) => `  ${u.type} ${u.name};`),
      `};`,
    ].join('\n')
  );
};

const generateDefs = (deps: ShaderDeps) =>
  Array.from(deps.defs)
    .map(([_, compiled]) => compiled)
    .join('\n');

const compileBody = (uncompiled: UncompiledGLSL, deps: ShaderDeps) => {
  const body = [];

  for (let i = 0; i < uncompiled.strings.length; ++i) {
    body.push(uncompiled.strings[i]);
    if (i < uncompiled.values.length) {
      const value = uncompiled.values[i];
      if (typeof value === 'string') {
        body.push(value);
      }
      body.push(generateReference(value, deps));
    }
  }

  return body.join('');
};

export const compile = (
  uncompiled: UncompiledGLSL,
  deps: ShaderDeps = makeShaderDeps()
): CompiledGLSL => {
  const body = compileBody(uncompiled, deps);

  const generatedDefs = generateDefs(deps);
  const generatedUniformBlocks = generateUniformBlocks(deps);
  const generatedUniforms = generateUniforms(deps);

  const source = [
    '#version 300 es',
    'precision highp sampler2D;',
    'precision highp isampler2D;',
    'precision highp float;',
    'precision highp int;',
    generatedUniformBlocks,
    generatedUniforms,
    generatedDefs,
    body,
  ].join('\n');

  return new CompiledGLSL(source, deps);
};
