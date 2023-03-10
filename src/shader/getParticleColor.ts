import {
  COLOR_PRESSURE,
  COLOR_VELOCITY,
  PHASE_FLUID,
  PHASE_WALL,
} from '../constants';
import {GLSLDefinition} from '../gl/glsl';
import {glsl} from '../gl/glslpp';
import {COLOR_PRETTY, COLOR_VELOCITY_PRESSURE} from '../constants';
import {
  colorMode,
  phaseSampler,
  positionSampler,
  pressureSampler,
  resolution,
  restPressure,
  velocitySampler,
} from './uniforms';

export const getParticleColor = new GLSLDefinition(
  'getParticleColor',
  glsl`
vec4 getParticleColor(int particleIndex) {
  ivec2 texCoord = ivec2(particleIndex % ${resolution}.x, particleIndex / ${resolution}.x);
  int phase = texelFetch(${phaseSampler}, texCoord, 0).x;
  vec2 pos = texelFetch(${positionSampler}, texCoord, 0).xy;
  vec2 vel = texelFetch(${velocitySampler}, texCoord, 0).xy;
  float pressure = texelFetch(${pressureSampler}, texCoord, 0).x;

  if (${colorMode} == ${COLOR_PRETTY}) {
    if (phase == ${PHASE_FLUID}) {
      return vec4(0.1, 0.4, 0.6, 1.0);
    } 
    if (phase == ${PHASE_WALL}) {
      return vec4(0.6, 0.4, 0.45, 1.0);
    }
    return vec4(1, 0, 1, 1);
  }
  if (${colorMode} == ${COLOR_VELOCITY}) {
    return vec4(vel * 2. + 0.5, 0., 1.);
  }
  if (${colorMode} == ${COLOR_PRESSURE}) {
    return vec4(pressure / ${restPressure}, 0., -pressure / ${restPressure}, 1.);
  }
  return vec4(0, 0, 0, 1);
}
`
);
