#version 300 es
precision highp float;

flat in int particleIndex;

out vec4 result;

void main() {
  result = vec4(particleIndex, 0, 0, 0);
}
