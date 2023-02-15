#version 300 es

precision highp float;
precision highp int;

uniform sampler2D positionSampler;
uniform ivec2 positionResolution;
uniform ivec2 tableResolution;
uniform vec2 cellSize;

flat out int particleIndex;

int cellKey(vec2 particlePos, int tableSize) {
  ivec2 cellPos = ivec2(floor(particlePos / cellSize));
  int hash = (cellPos.x * 73856093) ^ (cellPos.y * 19349663);
  return hash % tableSize;
}

void main() {
  particleIndex = gl_VertexID;

  ivec2 texCoord = ivec2(particleIndex % positionResolution.x, particleIndex / positionResolution.x);
  vec2 particlePos = texelFetch(positionSampler, texCoord, 0).rg;

  int key = cellKey(particlePos, tableResolution.x * tableResolution.y);
  ivec2 pixelCoord = ivec2(key % positionResolution.x + 1, key / positionResolution.x + 1);
  vec2 texxCoord = vec2(float(pixelCoord.x) / float(tableResolution.x), float(pixelCoord.y) / float(tableResolution.y));
  vec2 clipCoord = texxCoord * 2. - 1.;

  gl_Position = vec4(clipCoord, 0., 1.);
  gl_PointSize = 1.0;
}