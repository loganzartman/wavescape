import {PHASE_FLUID, PHASE_WALL} from '../constants';
import {compile, glsl} from '../gl/glslpp';
import {dt, phaseSampler, positionSampler, velocitySampler} from '../uniforms';

export const updatePositionFs = compile(glsl`
out vec4 outPosition;

void main() {
  ivec2 texCoord = ivec2(gl_FragCoord.xy);
  int phase = texelFetch(${phaseSampler}, texCoord, 0).r;
  vec2 position = texelFetch(${positionSampler}, texCoord, 0).rg;

  if (phase == ${PHASE_FLUID}) {
    vec2 velocity = texelFetch(${velocitySampler}, texCoord, 0).rg;
    position += velocity * ${dt};
  }

  outPosition = vec4(position, 0.0, 0.0);
}
`);
