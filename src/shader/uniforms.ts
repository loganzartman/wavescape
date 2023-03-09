import {mat4} from 'gl-matrix';
import {DisplayTextures} from '../displayTextures';
import {GLSLUniform} from '../gl/glsl';
import {UniformContext} from '../gl/UniformContext';
import {Params} from '../params';
import {getPointerDown, getPointerPos, getPointerVel} from '../pointer';
import {State} from '../state';

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
export const gravity = new GLSLUniform('gravity', 'vec2');
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
export const phaseSampler = new GLSLUniform('phaseSampler', 'isampler2D');
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
export const wallRestitution = new GLSLUniform('wallRestitution', 'float');

const computeProjection = (gl: WebGL2RenderingContext) => {
  const dim = Math.min(gl.canvas.width, gl.canvas.height);
  const projection = mat4.create();
  const hOffset = ((gl.canvas.width - dim) / dim) * 0.5;
  const vOffset = ((gl.canvas.height - dim) / dim) * 0.5;
  mat4.ortho(projection, -hOffset, 1 + hOffset, 1 + vOffset, -vOffset, -1, 1);
  return projection;
};

export const resetUniforms = ({
  uniforms,
  gl,
  state,
  displayTextures,
  params,
  dt: _dt,
}: {
  uniforms: UniformContext;
  gl: WebGL2RenderingContext;
  state: State;
  displayTextures: DisplayTextures;
  params: Params;
  dt: number;
}) => {
  uniforms.set(cellResolution, [
    params.cellResolutionX,
    params.cellResolutionY,
  ]);
  uniforms.set(cellSize, [params.cellWidth, params.cellHeight]);
  uniforms.set(collisionDistance, params.collisionDistance);
  uniforms.set(densitySampler, {texture: state.gpu.density.read.texture});
  uniforms.set(dt, _dt);
  uniforms.set(eta, params.eta);
  uniforms.set(fPressureSampler, {texture: state.gpu.fPressure.read.texture});
  uniforms.set(gravity, params.gravity);
  uniforms.set(hSmoothing, params.hSmoothing);
  uniforms.set(keyParticleResolution, [state.gpu.dataW, state.gpu.dataH]);
  uniforms.set(keyParticleSampler, {
    texture: state.gpu.keyParticlePairs.read.texture,
  });
  uniforms.set(massSampler, {texture: state.gpu.mass.read.texture});
  uniforms.set(metaballScale, params.metaballScale);
  uniforms.set(metaballThreshold, params.metaballThreshold);
  uniforms.set(metaballStretch, params.metaballStretch);
  uniforms.set(n, state.capacity);
  uniforms.set(neighborsTableSampler, {
    texture: state.gpu.neighborsTable.texture,
  });
  uniforms.set(particleRadius, params.particleRadius);
  uniforms.set(particleRestitution, params.particleRestitution);
  uniforms.set(phaseSampler, {texture: state.gpu.phase.texture});
  uniforms.set(pointerDown, Number(getPointerDown()));
  uniforms.set(pointerPos, getPointerPos());
  uniforms.set(pointerVel, getPointerVel());
  uniforms.set(positionSampler, {texture: state.gpu.position.read.texture});
  uniforms.set(projection, computeProjection(gl));
  uniforms.set(resolution, [state.gpu.dataW, state.gpu.dataH]);
  uniforms.set(restDensity, params.restDensity);
  uniforms.set(sigma, params.sigma);
  uniforms.set(stiffness, params.stiffness);
  uniforms.set(thicknessSampler, {texture: displayTextures.thickness.texture});
  uniforms.set(velocityGuessSampler, {
    texture: state.gpu.velocityGuess.read.texture,
  });
  uniforms.set(velocitySampler, {texture: state.gpu.velocity.read.texture});
  uniforms.set(viscosity, params.viscosity);
  uniforms.set(wallRestitution, params.wallRestitution);
};
