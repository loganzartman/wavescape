#version 300 es

precision highp float;
precision highp int;
precision highp sampler2D;
precision highp isampler2D;

uniform isampler2D keyParticleSampler;
uniform sampler2D neighborsTableSampler;
uniform sampler2D positionSampler;
uniform sampler2D massSampler;
uniform sampler2D densitySampler;
uniform ivec2 keyParticleResolution;
uniform ivec2 neighborsTableResolution;
uniform ivec2 resolution;
uniform vec2 cellSize;
uniform float hSmoothing;
uniform float sigma;
uniform float eta;
uniform float stiffness;
uniform float restDensity;
uniform float particleRadius;

out vec4 fPressureOut;

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

vec2 dW(vec2 dx) {
  // derivative of cubic spline kernel
  float len = length(dx);
  vec2 dq = dx / (hSmoothing * len + eta);
  float q = len / hSmoothing;

  if (0. <= q && q <= 0.5) {
    return sigma * (18. * pow(q, 2.) - 12. * q) * dq;
  } else if (0.5 < q && q <= 1.) {
    return sigma * (-6. * pow(1. - q, 2.)) * dq;
  } else {
    return vec2(0.);
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
  vec2 ownPos = texelFetch(positionSampler, ownTexCoord, 0).xy;
  float ownDensity = texelFetch(densitySampler, ownTexCoord, 0).x;

  vec2 fPressure = vec2(0.);

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
        float neighborDensity = texelFetch(densitySampler, neighborTexCoord, 0).x;
        
        float ownPressure = stiffness * (ownDensity / restDensity - 1.);
        float neighborPressure = stiffness * (neighborDensity / restDensity - 1.);
        vec2 dx = neighborPos - ownPos;

        float term = 
          ownDensity * 
          neighborMass * 
          (ownPressure / pow(ownDensity, 2.) + neighborPressure / pow(neighborDensity, 2.));
        fPressure += term * dW(dx);
      }
    }
  }

  fPressureOut = vec4(fPressure, 0, 0);
}
