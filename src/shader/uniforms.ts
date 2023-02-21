import {GLSLUniform} from '../glslpp';

export const cellResolution = new GLSLUniform('cellResolution', 'ivec2');
export const cellSize = new GLSLUniform('cellSize', 'vec2');
export const collisionDistance = new GLSLUniform('collisionDistance', 'float');
export const compareWidth = new GLSLUniform('compareWidth', 'int');
export const densitySampler = new GLSLUniform('densitySampler', 'sampler2D');
export const dt = new GLSLUniform('dt', 'float');
export const eta = new GLSLUniform('eta', 'float');
export const fPressureSampler = new GLSLUniform(
  'fPressureSampler',
  'sampler2D'
);
export const hSmoothing = new GLSLUniform('hSmoothing', 'float');
export const inputSampler = new GLSLUniform('inputSampler', 'isampler2D');
export const keyParticleResolution = new GLSLUniform(
  'keyParticleResolution',
  'ivec2'
);
export const keyParticleSampler = new GLSLUniform(
  'keyParticleSampler',
  'isampler2D'
);
export const massSampler = new GLSLUniform('massSampler', 'sampler2D');
export const n = new GLSLUniform('n', 'int');
export const neighborsTableSampler = new GLSLUniform(
  'neighborsTableSampler',
  'sampler2D'
);
export const particleRadius = new GLSLUniform('particleRadius', 'float');
export const particleRestitution = new GLSLUniform(
  'particleRestitution',
  'float'
);
export const pointerDown = new GLSLUniform('pointerDown', 'int');
export const pointerPos = new GLSLUniform('pointerPos', 'vec2');
export const pointerVel = new GLSLUniform('pointerVel', 'vec2');
export const positionSampler = new GLSLUniform('positionSampler', 'sampler2D');
export const projection = new GLSLUniform('projection', 'mat4');
export const resolution = new GLSLUniform('resolution', 'ivec2');
export const restDensity = new GLSLUniform('restDensity', 'float');
export const sigma = new GLSLUniform('sigma', 'float');
export const stageWidth = new GLSLUniform('stageWidth', 'int');
export const stiffness = new GLSLUniform('stiffness', 'float');
export const velocityGuessSampler = new GLSLUniform(
  'velocityGuessSampler',
  'sampler2D'
);
export const velocitySampler = new GLSLUniform('velocitySampler', 'sampler2D');
export const viscosity = new GLSLUniform('viscosity', 'float');
