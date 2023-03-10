import {compile, glsl} from '../gl/glslpp';
import {getParticleColor} from './getParticleColor';
import {
  particleRadius,
  positionSampler,
  projection,
  resolution,
} from './uniforms';

export const drawParticlesVs = compile(glsl`
in vec2 circleOffset;

out vec4 color;

void main() {
  int particleIndex = gl_InstanceID;
  ivec2 texCoord = ivec2(particleIndex % ${resolution}.x, particleIndex / ${resolution}.x);
  vec2 pos = texelFetch(${positionSampler}, texCoord, 0).xy;
  color = ${getParticleColor}(particleIndex);  

  vec2 vertexPos = pos + circleOffset * ${particleRadius};
  gl_Position = ${projection} * vec4(vertexPos, 0., 1.);
}
`);

export const drawParticlesFs = compile(glsl`
in vec4 color;

out vec4 outColor;

void main() {
  outColor = color;
}
`);
