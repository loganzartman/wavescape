#version 300 es
precision highp float;
precision highp int;

uniform ivec2 resolution;
uniform ivec2 cellResolution;
uniform vec2 cellSize;
uniform sampler2D positionSampler;

out ivec4 keyIndexPair;

int cellKey(ivec2 cellPos) {
  return cellPos.y * cellResolution.x + cellPos.x;
}

ivec2 posToCell(vec2 pos) {
  return max(ivec2(0), min(cellResolution - ivec2(1), ivec2(floor(pos / cellSize))));
}

void main() {
  int index = int(gl_FragCoord.y) * resolution.x + int(gl_FragCoord.x);

  ivec2 texCoord = ivec2(gl_FragCoord.xy);
  vec2 particlePos = texelFetch(positionSampler, texCoord, 0).rg;

  ivec2 cellPos = posToCell(particlePos);
  keyIndexPair.x = cellKey(cellPos);
  keyIndexPair.y = index;
}