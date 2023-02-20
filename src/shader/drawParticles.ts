import {compile, glsl} from '../glslpp';
import {
  densitySampler,
  particleRadius,
  positionSampler,
  projection,
  resolution,
  velocitySampler,
} from './uniforms';

export const drawParticlesVs = compile(glsl`
in vec2 circleOffset;

out vec4 color;

void main() {
  int particleIndex = gl_InstanceID;
  ivec2 texCoord = ivec2(particleIndex % ${resolution}.x, particleIndex / ${resolution}.x);
  vec2 pos = texelFetch(${positionSampler}, texCoord, 0).xy;
  vec2 vel = texelFetch(${velocitySampler}, texCoord, 0).xy;
  float density = texelFetch(${densitySampler}, texCoord, 0).x;

  vec2 vertexPos = pos + circleOffset * ${particleRadius};
  gl_Position = ${projection} * vec4(vertexPos, 0., 1.);
  color = vec4(vel * 2. + 0.5, density, 1.);  
}
`);

export const drawParticlesFs = compile(glsl`
in vec4 color;

out vec4 outColor;

void main() {
  outColor = color;
}
`);
