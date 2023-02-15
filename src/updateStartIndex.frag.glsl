#version 300 es
precision highp float;

flat in int keyParticleIndex;

out vec4 result;

void main() {
  result = vec4(keyParticleIndex, 0, 0, 0);
}
