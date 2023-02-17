#version 300 es

precision highp float;
precision highp int;
precision highp sampler2D;
precision highp isampler2D;

uniform isampler2D keyParticleSampler;
uniform sampler2D neighborsTableSampler;
uniform sampler2D positionSampler;
uniform sampler2D massSampler;
uniform ivec2 keyParticleResolution;
uniform ivec2 neighborsTableResolution;
uniform ivec2 resolution;
uniform vec2 cellSize;
uniform float hSmoothing;
uniform float sigma;

out vec4 densityOut;

float W(vec2 dx) {
  // cubic spline kernel
  float q = sqrt(pow(dx.x, 2.) + pow(dx.y, 2.)) / hSmoothing;
  if (0. <= q && q <= 0.5) {
    return sigma * (6. * (pow(q, 3.) - pow(q, 2.)) + 1.);
  } else if (0.5 < q && q <= 1.) {
    return sigma * (2. * pow(1. - q, 3.));
  } else {
    return 0.;
  }
}

ivec2 posToCell(vec2 pos, vec2 cellSize) {
  return ivec2(floor(pos / cellSize));
}

int cellHash(ivec2 cellPos, int tableSize) {
  int hash = (cellPos.x * 73856093) ^ (cellPos.y * 19349663);
  return hash % tableSize;
}

void main() {
  int particleIndex = int(gl_FragCoord.y) * resolution.x + int(gl_FragCoord.x);
  ivec2 ownTexCoord = ivec2(gl_FragCoord.xy);
  float ownMass = texelFetch(massSampler, ownTexCoord, 0).x;
  vec2 ownPos = texelFetch(positionSampler, ownTexCoord, 0).xy;

  float density = ownMass * W(vec2(0.));

  int tableSize = neighborsTableResolution.x * neighborsTableResolution.y;
  ivec2 c0 = posToCell(ownPos - vec2(hSmoothing), cellSize);
  ivec2 c1 = posToCell(ownPos + vec2(hSmoothing), cellSize);
  for (int cx = c0.x; cx <= c1.x; ++cx) {
    for (int cy = c0.y; cy <= c1.y; ++cy) {
      int hash = cellHash(ivec2(cx, cy), tableSize);
      ivec2 ntTexCoord = ivec2(hash % neighborsTableResolution.x, hash / neighborsTableResolution.x);
      ivec2 startCount = ivec2(texelFetch(neighborsTableSampler, ntTexCoord, 0).xy);
      int start = startCount.x;
      int count = startCount.y;
      for (int j = start; j < start + count; ++j) {
        ivec2 kpTexCoord = ivec2(j % keyParticleResolution.x, j / keyParticleResolution.x);
        int neighborIndex = texelFetch(keyParticleSampler, kpTexCoord, 0).y;

        ivec2 neighborTexCoord = ivec2(neighborIndex % resolution.x, neighborIndex / resolution.x);
        vec2 neighborPos = texelFetch(positionSampler, neighborTexCoord, 0).xy;
        float neighborMass = texelFetch(massSampler, neighborTexCoord, 0).x;
        vec2 dx = neighborPos - ownPos;
        density += neighborMass * W(dx);
      }
    }
  }

  densityOut = vec4(density, 0, 0, 0);
}
