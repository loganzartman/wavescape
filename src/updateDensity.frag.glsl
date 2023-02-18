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
uniform ivec2 resolution;
uniform ivec2 cellResolution;
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

int cellKey(ivec2 cellPos) {
  return cellPos.y * cellResolution.x + cellPos.x;
}

ivec2 posToCell(vec2 pos) {
  return max(ivec2(0), min(cellResolution - ivec2(1), ivec2(floor(pos / cellSize))));
}

void main() {
  int particleIndex = int(gl_FragCoord.y) * resolution.x + int(gl_FragCoord.x);
  ivec2 ownTexCoord = ivec2(gl_FragCoord.xy);
  float ownMass = texelFetch(massSampler, ownTexCoord, 0).x;
  vec2 ownPos = texelFetch(positionSampler, ownTexCoord, 0).xy;

  float density = ownMass * W(vec2(0.));

  int tableSize = cellResolution.x * cellResolution.y;
  ivec2 c0 = posToCell(ownPos - vec2(hSmoothing));
  ivec2 c1 = posToCell(ownPos + vec2(hSmoothing));
  for (int cx = c0.x; cx <= c1.x; ++cx) {
    for (int cy = c0.y; cy <= c1.y; ++cy) {
      int hash = cellKey(ivec2(cx, cy));
      ivec2 ntTexCoord = ivec2(hash % cellResolution.x, hash / cellResolution.x);
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
