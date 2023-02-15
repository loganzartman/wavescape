#version 300 es

precision highp float;
precision highp int;
precision highp isampler2D;

uniform isampler2D keyParticleSampler;
uniform ivec2 keyParticleResolution;
uniform ivec2 tableResolution;

void main() {
  int keyParticleIndex = gl_VertexID;
  ivec2 kpTexCoord = ivec2(
    keyParticleIndex % keyParticleResolution.x, 
    keyParticleIndex / keyParticleResolution.x
  );
  int key = texelFetch(keyParticleSampler, kpTexCoord, 0).r;

  ivec2 outputTexCoord = ivec2(
    key % tableResolution.x + 1, 
    key / tableResolution.x + 1
  );
  vec2 clipCoord = vec2(outputTexCoord) / vec2(tableResolution) * 2. - 1.;

  gl_Position = vec4(clipCoord, 0., 1.);
  gl_PointSize = 1.0;
}