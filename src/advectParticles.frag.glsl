#version 300 es
precision highp float;

uniform sampler2D positionSampler;
uniform sampler2D velocitySampler;
uniform float dt;

out vec4 outPosition;
 
void main() {
  ivec2 texCoord = ivec2(gl_FragCoord.xy);
  vec2 position = texelFetch(positionSampler, texCoord, 0).rg;
  vec2 velocity = texelFetch(velocitySampler, texCoord, 0).rg;

  position += velocity * dt;

  outPosition = vec4(position, 0.0, 0.0);
}
