#version 300 es
precision highp float;
precision highp int;

uniform ivec2 resolution;
uniform ivec2 tableResolution;
uniform vec2 cellSize;
uniform sampler2D positionSampler;

out ivec4 keyIndexPair;

int cellKey(vec2 particlePos, int tableSize) {
  ivec2 cellPos = ivec2(floor(particlePos / cellSize));
  int hash = (cellPos.x * 73856093) ^ (cellPos.y * 19349663);
  return hash % tableSize;
}

void main() {
  int index = int(gl_FragCoord.y) * resolution.x + int(gl_FragCoord.x);

  ivec2 texCoord = ivec2(gl_FragCoord.xy);
  vec2 particlePos = texelFetch(positionSampler, texCoord, 0).rg;

  keyIndexPair.x = cellKey(particlePos, tableResolution.x * tableResolution.y);
  keyIndexPair.y = index;
}