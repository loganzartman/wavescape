#version 300 es
precision highp sampler2D;
precision highp float;

uniform sampler2D velocityGuessSampler;
uniform sampler2D massSampler;
uniform sampler2D fPressureSampler;
uniform float dt;

out vec4 outVelocity;
 
void main() {
  ivec2 texCoord = ivec2(gl_FragCoord.xy);
  vec2 velocityGuess = texelFetch(velocityGuessSampler, texCoord, 0).rg;
  float mass = texelFetch(massSampler, texCoord, 0).r;
  vec2 fPressure = texelFetch(fPressureSampler, texCoord, 0).rg;

  vec2 velocity = velocityGuess + (dt / mass) * fPressure;

  outVelocity = vec4(velocity, 0.0, 0.0);
}
