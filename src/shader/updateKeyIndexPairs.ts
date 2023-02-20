import {compile, glsl} from '../glslpp';
import {cellKey} from './cellKey';
import {posToCell} from './posToCell';
import {positionSampler, resolution} from './uniforms';

export const updateKeyIndexPairsFs = compile(glsl`
out ivec4 keyIndexPair;

void main() {
  int index = int(gl_FragCoord.y) * ${resolution}.x + int(gl_FragCoord.x);

  ivec2 texCoord = ivec2(gl_FragCoord.xy);
  vec2 particlePos = texelFetch(${positionSampler}, texCoord, 0).rg;

  ivec2 cellPos = ${posToCell}(particlePos);
  keyIndexPair.x = ${cellKey}(cellPos);
  keyIndexPair.y = index;
}
`);
