import {GLSLUniform} from '../glslpp';

export const fPressureSampler = new GLSLUniform(
  'fPressureSampler',
  'sampler2D'
);
export const neighborsTableSampler = new GLSLUniform(
  'neighborsTableSampler',
  'sampler2D'
);
export const massSampler = new GLSLUniform('massSampler', 'sampler2D');
export const positionSampler = new GLSLUniform('positionSampler', 'sampler2D');
export const velocitySampler = new GLSLUniform('velocitySampler', 'sampler2D');
export const velocityGuessSampler = new GLSLUniform(
  'velocityGuessSampler',
  'sampler2D'
);

export const keyParticleSampler = new GLSLUniform(
  'keyParticleSampler',
  'isampler2D'
);

export const cellSize = new GLSLUniform('cellSize', 'vec2');

export const cellResolution = new GLSLUniform('cellResolution', 'ivec2');
export const keyParticleResolution = new GLSLUniform(
  'keyParticleResolution',
  'ivec2'
);
export const resolution = new GLSLUniform('resolution', 'ivec2');

export const collisionDistance = new GLSLUniform('collisionDistance', 'float');
export const dt = new GLSLUniform('dt', 'float');
export const eta = new GLSLUniform('eta', 'float');
export const hSmoothing = new GLSLUniform('hSmoothing', 'float');
export const particleRestitution = new GLSLUniform(
  'particleRestitution',
  'float'
);
export const sigma = new GLSLUniform('sigma', 'float');
