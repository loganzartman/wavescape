import {GLSLUniform} from '../glslpp';

export const positionSampler = new GLSLUniform('positionSampler', 'sampler2D');
export const velocitySampler = new GLSLUniform('velocitySampler', 'sampler2D');

export const dt = new GLSLUniform('dt', 'float');
