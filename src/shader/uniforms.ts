import {mat4} from 'gl-matrix';
import {DisplayTextures} from '../displayTextures';
import {GLSLUniform} from '../gl/glsl';
import {UniformContext} from '../gl/UniformContext';
import {Params} from '../params';
import {getPointerDown, getPointerPos, getPointerVel} from '../pointer';
import {GPUState} from '../state';

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
export const metaballScale = new GLSLUniform('metaballScale', 'float');
export const metaballThreshold = new GLSLUniform('metaballThreshold', 'float');
export const metaballStretch = new GLSLUniform('metaballStretch', 'float');
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
export const thicknessSampler = new GLSLUniform(
  'thicknessSampler',
  'sampler2D'
);
export const velocitySampler = new GLSLUniform('velocitySampler', 'sampler2D');
export const viscosity = new GLSLUniform('viscosity', 'float');

const computeProjection = (gl: WebGL2RenderingContext) => {
  const dim = Math.min(gl.canvas.width, gl.canvas.height);
  const projection = mat4.create();
  const hOffset = ((gl.canvas.width - dim) / dim) * 0.5;
  const vOffset = ((gl.canvas.height - dim) / dim) * 0.5;
  mat4.ortho(projection, -hOffset, 1 + hOffset, 1 + vOffset, -vOffset, -1, 1);
  return projection;
};

export const resetUniforms = (
  uniforms: UniformContext,
  gl: WebGL2RenderingContext,
  displayTextures: DisplayTextures,
  gpuState: GPUState,
  params: Params,
  _dt: number
) => {
  uniforms.set(cellResolution, [
    params.cellResolutionX,
    params.cellResolutionY,
  ]);
  uniforms.set(cellSize, [params.cellWidth, params.cellHeight]);
  uniforms.set(collisionDistance, params.collisionDistance);
  uniforms.set(dt, _dt);
  uniforms.set(eta, params.eta);
  uniforms.set(hSmoothing, params.hSmoothing);
  uniforms.set(keyParticleResolution, [gpuState.dataW, gpuState.dataH]);
  uniforms.set(metaballScale, params.metaballScale);
  uniforms.set(metaballThreshold, params.metaballThreshold);
  uniforms.set(metaballStretch, params.metaballStretch);
  uniforms.set(n, gpuState.n);
  uniforms.set(particleRadius, params.particleRadius);
  uniforms.set(particleRestitution, params.particleRestitution);
  uniforms.set(pointerDown, Number(getPointerDown()));
  uniforms.set(pointerPos, getPointerPos());
  uniforms.set(pointerVel, getPointerVel());
  uniforms.set(projection, computeProjection(gl));
  uniforms.set(resolution, [gpuState.dataW, gpuState.dataH]);
  uniforms.set(restDensity, params.restDensity);
  uniforms.set(sigma, params.sigma);
  uniforms.set(stiffness, params.stiffness);
  uniforms.set(viscosity, params.viscosity);

  uniforms.set(densitySampler, {texture: gpuState.density.read.texture});
  uniforms.set(fPressureSampler, {texture: gpuState.fPressure.read.texture});
  uniforms.set(keyParticleSampler, {
    texture: gpuState.keyParticlePairs.read.texture,
  });
  uniforms.set(massSampler, {texture: gpuState.mass.read.texture});
  uniforms.set(neighborsTableSampler, {
    texture: gpuState.neighborsTable.texture,
  });
  uniforms.set(positionSampler, {texture: gpuState.position.read.texture});
  uniforms.set(thicknessSampler, {texture: displayTextures.thickness.texture});
  uniforms.set(velocityGuessSampler, {
    texture: gpuState.velocityGuess.read.texture,
  });
  uniforms.set(velocitySampler, {texture: gpuState.velocity.read.texture});
};
