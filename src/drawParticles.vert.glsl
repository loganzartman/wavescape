#version 300 es

uniform mat4 projection;
uniform sampler2D positionSampler;
uniform sampler2D velocitySampler;
uniform sampler2D densitySampler;
uniform ivec2 resolution;
uniform float particleRadius;
uniform int n;

in vec2 circleOffset;

out vec4 color;

void main() {
  int particleIndex = gl_InstanceID;
  ivec2 texCoord = ivec2(particleIndex % resolution.x, particleIndex / resolution.x);
  vec2 pos = texelFetch(positionSampler, texCoord, 0).xy;
  vec2 vel = texelFetch(velocitySampler, texCoord, 0).xy;
  float density = texelFetch(densitySampler, texCoord, 0).x;

  vec2 vertexPos = pos + circleOffset * particleRadius;
  gl_Position = vec4(projection * vec4(vertexPos, 0., 1.));
  color = vec4(vel * 2. + 0.5, density, 1.);  
}
