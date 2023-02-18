#version 300 es

precision highp float;
precision highp int;
precision highp sampler2D;
precision highp isampler2D;

uniform isampler2D keyParticleSampler;
uniform sampler2D neighborsTableSampler;
uniform sampler2D positionSampler;
uniform sampler2D velocitySampler;
uniform sampler2D massSampler;
uniform sampler2D densitySampler;
uniform ivec2 keyParticleResolution;
uniform ivec2 resolution;
uniform ivec2 cellResolution;
uniform vec2 cellSize;
uniform float hSmoothing;
uniform float sigma;
uniform float eta;
uniform float viscosity;
uniform float particleRadius;
uniform float dt;
uniform vec2 pointerPos;
uniform vec2 pointerVel;
uniform int pointerDown;

out vec4 velocityGuessOut;

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

int cellKey(ivec2 cellPos) {
  return cellPos.y * cellResolution.x + cellPos.x;
}

ivec2 posToCell(vec2 pos) {
  return max(ivec2(0), min(cellResolution - ivec2(1), ivec2(floor(pos / cellSize))));
}

void main() {
  int particleIndex = int(gl_FragCoord.y) * resolution.x + int(gl_FragCoord.x);
  ivec2 ownTexCoord = ivec2(gl_FragCoord.xy);
  vec2 ownPos = texelFetch(positionSampler, ownTexCoord, 0).xy;
  vec2 ownVel = texelFetch(velocitySampler, ownTexCoord, 0).xy;
  float ownMass = texelFetch(massSampler, ownTexCoord, 0).x;

  vec2 laplacianV = vec2(0.);

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
        vec2 neighborVel = texelFetch(velocitySampler, neighborTexCoord, 0).xy;
        float neighborMass = texelFetch(massSampler, neighborTexCoord, 0).x;
        float neighborDensity = texelFetch(densitySampler, neighborTexCoord, 0).x;
        
        vec2 dx = ownPos - neighborPos;
        vec2 dv = ownVel - neighborVel;
        float scale = 2. * (2. + 2.); // 2 * (D + 2)
        float volume = neighborMass / (neighborDensity + eta);
        float term = dot(dv, dx) / (pow(length(dx), 2.) + eta);

        laplacianV += scale * volume * term * dW(dx);
      }
    }
  }

  vec2 fViscosity = viscosity * laplacianV;

  vec2 fGrav = vec2(0, 0.5);

  // hacky wall penalty force
  float wallSize = particleRadius;
  float kWall = 2000.;
  vec2 fWall = vec2(0.);
  if (ownPos.x < wallSize) {
    fWall.x += kWall * (wallSize - ownPos.x);
  }
  if (ownPos.y < wallSize) {
    fWall.y += kWall * (wallSize - ownPos.y);
  }
  if (ownPos.x > 1. - wallSize) {
    fWall.x -= kWall * (ownPos.x - (1. - wallSize));
  }
  if (ownPos.y > 1. - wallSize) {
    fWall.y -= kWall * (ownPos.y - (1. - wallSize));
  }

  vec2 fPointer = float(pointerDown) * 20. * pointerVel * (1. - min(vec2(1), length(ownPos - pointerPos) / 0.1));

  vec2 fExt = fGrav + fWall + fPointer;

  vec2 velocityGuess = ownVel + (dt / ownMass) * (fViscosity + fExt);

  velocityGuessOut = vec4(velocityGuess, 0, 0);
}
