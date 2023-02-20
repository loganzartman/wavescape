import {compile, glsl} from '../glslpp';
import {
  cellResolution,
  keyParticleResolution,
  keyParticleSampler,
} from './uniforms';

export const updateCountVs = compile(glsl`
void main() {
  int keyParticleIndex = gl_VertexID;
  ivec2 kpTexCoord = ivec2(
    keyParticleIndex % ${keyParticleResolution}.x, 
    keyParticleIndex / ${keyParticleResolution}.x
  );
  int key = texelFetch(${keyParticleSampler}, kpTexCoord, 0).r;

  ivec2 outputTexCoord = ivec2(
    key % ${cellResolution}.x + 1, 
    key / ${cellResolution}.x + 1
  );
  vec2 clipCoord = vec2(outputTexCoord) / vec2(${cellResolution}) * 2. - 1.;

  gl_Position = vec4(clipCoord, 0., 1.);
  gl_PointSize = 1.0;
}
`);

export const updateCountFs = compile(glsl`
out vec4 result;

void main() {
  result = vec4(0, 1, 0, 0);
}
`);
