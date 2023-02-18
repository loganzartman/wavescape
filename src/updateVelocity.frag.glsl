#version 300 es
precision highp sampler2D;
precision highp isampler2D;
precision highp float;

uniform sampler2D positionSampler;
uniform sampler2D velocitySampler;
uniform sampler2D velocityGuessSampler;
uniform sampler2D massSampler;
uniform sampler2D fPressureSampler;
uniform isampler2D keyParticleSampler;
uniform sampler2D neighborsTableSampler;
uniform ivec2 keyParticleResolution;
uniform ivec2 resolution;
uniform ivec2 cellResolution;
uniform vec2 cellSize;
uniform float hSmoothing;
uniform float particleRadius;
uniform float collisionDistance;
uniform float particleRestitution;
uniform float wallRestitution;
uniform float eta;
uniform float dt;

out vec4 outVelocity;

int cellKey(ivec2 cellPos) {
  return cellPos.y * cellResolution.x + cellPos.x;
}

ivec2 posToCell(vec2 pos) {
  return max(ivec2(0), min(cellResolution - ivec2(1), ivec2(floor(pos / cellSize))));
}
 
void main() {
  ivec2 texCoord = ivec2(gl_FragCoord.xy);
  vec2 velocityGuess = texelFetch(velocityGuessSampler, texCoord, 0).rg;
  vec2 ownPos = texelFetch(positionSampler, texCoord, 0).rg;
  vec2 ownVel = texelFetch(velocitySampler, texCoord, 0).rg;
  float ownMass = texelFetch(massSampler, texCoord, 0).r;
  vec2 fPressure = texelFetch(fPressureSampler, texCoord, 0).rg;

  vec2 velocity = velocityGuess + (dt / ownMass) * fPressure;

  float collidedMass = 0.;
  vec2 dvCollsion = vec2(0.);

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

        float neighborMass = texelFetch(massSampler, neighborTexCoord, 0).x;
        vec2 neighborPos = texelFetch(positionSampler, neighborTexCoord, 0).xy;
        vec2 neighborVel = texelFetch(velocitySampler, neighborTexCoord, 0).xy;
        vec2 dx = ownPos - neighborPos;
        vec2 dv = ownVel - neighborVel;
        float d = length(dx) + eta;
        float dotDxDv = dot(dx, dv);
        if (d < collisionDistance && dotDxDv < 0.) {
          collidedMass += neighborMass;
          dvCollsion += neighborMass * (1. + particleRestitution) * (dotDxDv / d) * (dx / d);
        }
      }
    }
  }

  float collisionTerm = 1. / (ownMass + collidedMass);
  velocity -= collisionTerm * dvCollsion;

  outVelocity = vec4(velocity, 0.0, 0.0);
}
