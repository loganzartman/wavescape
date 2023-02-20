import {glsl, GLSLDefinition} from '../glslpp';
import {cellKey} from './cellKey';
import {posToCell} from './posToCell';
import {
  cellResolution,
  hSmoothing,
  keyParticleResolution,
  keyParticleSampler,
  neighborsTableSampler,
  resolution,
} from './uniforms';

export const foreachNeighbor = new GLSLDefinition(
  'FOREACH_NEIGHBOR',
  glsl`
#define FOREACH_NEIGHBOR(TEXCOORD_NAME, BLOCK) \
  { \
    int tableSize = ${cellResolution}.x * ${cellResolution}.y; \
    ivec2 c0 = ${posToCell}(ownPos - vec2(${hSmoothing})); \
    ivec2 c1 = ${posToCell}(ownPos + vec2(${hSmoothing})); \
    for (int cx = c0.x; cx <= c1.x; ++cx) { \
      for (int cy = c0.y; cy <= c1.y; ++cy) { \
        int hash = ${cellKey}(ivec2(cx, cy)); \
        ivec2 ntTexCoord = ivec2(hash % ${cellResolution}.x, hash / ${cellResolution}.x); \
        ivec2 startCount = ivec2(texelFetch(${neighborsTableSampler}, ntTexCoord, 0).xy); \
        int start = startCount.x; \
        int count = startCount.y; \
        for (int j = start; j < start + count; ++j) { \
          ivec2 kpTexCoord = ivec2(j % ${keyParticleResolution}.x, j / ${keyParticleResolution}.x); \
          int neighborIndex = texelFetch(${keyParticleSampler}, kpTexCoord, 0).y; \
          ivec2 TEXCOORD_NAME = ivec2(neighborIndex % ${resolution}.x, neighborIndex / ${resolution}.x); \
          { \
            BLOCK \
          } \
        } \
      } \
    } \
  }
`
);
