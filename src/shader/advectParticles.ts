import {compile, glsl} from '../gl/glslpp';
import {dt, positionSampler, velocitySampler} from './uniforms';

export const advectParticlesFs = compile(glsl`
out vec4 outPosition;

void main() {
  ivec2 texCoord = ivec2(gl_FragCoord.xy);
  vec2 position = texelFetch(${positionSampler}, texCoord, 0).rg;
  vec2 velocity = texelFetch(${velocitySampler}, texCoord, 0).rg;

  position += velocity * ${dt};

  outPosition = vec4(position, 0.0, 0.0);
}
`);
