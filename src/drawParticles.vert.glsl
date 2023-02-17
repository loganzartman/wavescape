#version 300 es

uniform sampler2D positionSampler;
uniform ivec2 resolution;
uniform float particleRadius;

in vec2 circleOffset;

void main() {
  int particleIndex = gl_InstanceID;
  ivec2 texCoord = ivec2(particleIndex % resolution.x, particleIndex / resolution.x);
  vec2 pos = texelFetch(positionSampler, texCoord, 0).xy;

  vec2 vertexPos = pos + circleOffset * particleRadius;
  vec2 clipPos = vertexPos * 2. - 1.;
  clipPos.y = -clipPos.y;
  gl_Position = vec4(clipPos, 0., 1.);
}
