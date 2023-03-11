import {
  COLOR_PRESSURE,
  COLOR_VELOCITY,
  PHASE_FLUID,
  PHASE_WALL,
} from '../constants';
import {GLSLDefinition} from '../gl/glsl';
import {glsl} from '../gl/glslpp';
import {COLOR_PRETTY} from '../constants';
import {
  colorMode,
  phaseSampler,
  positionSampler,
  pressureSampler,
  resolution,
  restPressure,
  time,
  velocitySampler,
} from '../uniforms';

export const getParticleColor = new GLSLDefinition(
  'getParticleColor',
  glsl`
float hash1(uint n) {
  // integer hash copied from Hugo Elias
	n = (n << 13U) ^ n;
  n = n * (n * n * 15731U + 789221U) + 1376312589U;
  return float( n & uint(0x7fffffffU))/float(0x7fffffff);
}

const vec3 colorWaterDark = vec3(0.008,0.518,0.659);
const vec3 colorWaterLight = vec3(0.663,0.91,0.863);

vec4 getParticleColor(int particleIndex) {
  ivec2 texCoord = ivec2(particleIndex % ${resolution}.x, particleIndex / ${resolution}.x);
  int phase = texelFetch(${phaseSampler}, texCoord, 0).x;
  vec2 pos = texelFetch(${positionSampler}, texCoord, 0).xy;
  vec2 vel = texelFetch(${velocitySampler}, texCoord, 0).xy;
  float pressure = texelFetch(${pressureSampler}, texCoord, 0).x;

  if (${colorMode} == ${COLOR_PRETTY}) {
    if (phase == ${PHASE_FLUID}) {
      float speed = length(vel);
      float fSpeed = clamp(speed * 2., 0., 1.); 
      float fTime = sin(${time} * 4. + hash1(uint(particleIndex)) * 6.28) * 0.5 + 0.5;
      vec3 color = mix(colorWaterDark, colorWaterLight, fTime * 0.15 + fSpeed * 0.85);
      return vec4(color, 1.0);
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
