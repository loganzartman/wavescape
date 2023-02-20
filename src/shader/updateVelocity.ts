import {compile, glsl} from '../glslpp';
import {foreachNeighbor} from './foreachNeighbor';
import {
  collisionDistance,
  dt,
  eta,
  fPressureSampler,
  massSampler,
  particleRestitution,
  positionSampler,
  velocityGuessSampler,
  velocitySampler,
} from './uniforms';

export const updateVelocityFs = compile(glsl`
out vec4 outVelocity;

void main() {
  ivec2 texCoord = ivec2(gl_FragCoord.xy);
  vec2 velocityGuess = texelFetch(${velocityGuessSampler}, texCoord, 0).rg;
  vec2 ownPos = texelFetch(${positionSampler}, texCoord, 0).rg;
  vec2 ownVel = texelFetch(${velocitySampler}, texCoord, 0).rg;
  float ownMass = texelFetch(${massSampler}, texCoord, 0).r;
  vec2 fPressure = texelFetch(${fPressureSampler}, texCoord, 0).rg;

  vec2 velocity = velocityGuess + (${dt} / ownMass) * fPressure;

  float collidedMass = 0.;
  vec2 dvCollsion = vec2(0.);

  ${foreachNeighbor}(neighborTexCoord, {
    float neighborMass = texelFetch(${massSampler}, neighborTexCoord, 0).x;
    vec2 neighborPos = texelFetch(${positionSampler}, neighborTexCoord, 0).xy;
    vec2 neighborVel = texelFetch(${velocitySampler}, neighborTexCoord, 0).xy;
    vec2 dx = ownPos - neighborPos;
    vec2 dv = ownVel - neighborVel;
    float d = length(dx) + ${eta};
    float dotDxDv = dot(dx, dv);
    if (d < ${collisionDistance} && dotDxDv < 0.) {
      collidedMass += neighborMass;
      dvCollsion += neighborMass * (1. + ${particleRestitution}) * (dotDxDv / d) * (dx / d);
    }
  })

  float collisionTerm = 1. / (ownMass + collidedMass);
  velocity -= collisionTerm * dvCollsion;

  outVelocity = vec4(velocity, 0.0, 0.0);
}
`);
