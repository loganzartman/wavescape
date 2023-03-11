import {compile, glsl} from '../gl/glslpp';
import {foreachNeighbor} from './foreachNeighbor';
import {W} from './kernel';
import {massSampler, positionSampler, resolution} from '../uniforms';

export const updateDensityFs = compile(glsl`
out vec4 densityOut;

void main() {
  int particleIndex = int(gl_FragCoord.y) * ${resolution}.x + int(gl_FragCoord.x);
  ivec2 ownTexCoord = ivec2(gl_FragCoord.xy);
  float ownMass = texelFetch(${massSampler}, ownTexCoord, 0).x;
  vec2 ownPos = texelFetch(${positionSampler}, ownTexCoord, 0).xy;

  float density = ownMass * ${W}(vec2(0.));

  ${foreachNeighbor}(neighborTexCoord, {
    vec2 neighborPos = texelFetch(${positionSampler}, neighborTexCoord, 0).xy;
    float neighborMass = texelFetch(${massSampler}, neighborTexCoord, 0).x;
    vec2 dx = neighborPos - ownPos;
    density += neighborMass * ${W}(dx);
  });

  densityOut = vec4(density, 0, 0, 0);
}
`);
