import {
  GLSLDefinition,
  GLSLReference,
  GLSLUniform,
  UncompiledGLSL,
} from './types';

export const glsl = (
  strings: TemplateStringsArray,
  ...values: GLSLReference[]
) => new UncompiledGLSL(Array.from(strings), values);

type Context = {
  uniforms: Set<GLSLUniform<any>>;
  defs: Map<GLSLDefinition, string>;
};

const makeContext = (): Context => ({uniforms: new Set(), defs: new Map()});

const generateReference = (value: any, context: Context) => {
  if (value instanceof GLSLUniform) {
    context.uniforms.add(value);
    return value.name;
  }
  if (value instanceof GLSLDefinition) {
    if (!context.defs.has(value))
      context.defs.set(value, compileBody(value.definition, context));
    return value.name;
  }
  throw new Error('Unsupported reference: ' + value);
};

const generateUniforms = (context: Context) =>
  Array.from(context.uniforms)
    .map((u) => `uniform ${u.type} ${u.name};`)
    .join('\n');

const generateDefs = (context: Context) =>
  Array.from(context.defs)
    .map(([_, compiled]) => compiled)
    .join('\n');

const compileBody = (uncompiled: UncompiledGLSL, context: Context) => {
  const body = [];

  for (let i = 0; i < uncompiled.strings.length; ++i) {
    body.push(uncompiled.strings[i]);
    if (i < uncompiled.values.length) {
      const value = uncompiled.values[i];
      if (typeof value === 'string') {
        body.push(value);
      }
      body.push(generateReference(value, context));
    }
  }

  return body.join('');
};

export const compile = (
  uncompiled: UncompiledGLSL,
  context: Context = makeContext()
) => {
  const body = compileBody(uncompiled, context);

  const generatedDefs = generateDefs(context);
  const generatedUniforms = generateUniforms(context);
  const precisions = [
    'precision highp sampler2D;',
    'precision highp isampler2D;',
    'precision highp float;',
    'precision highp int;',
  ].join('\n');

  return [
    '#version 300 es',
    precisions,
    generatedUniforms,
    generatedDefs,
    body,
  ].join('\n');
};
