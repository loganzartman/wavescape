import {compile, glsl} from '../gl/glslpp';
import {foreachNeighbor} from './foreachNeighbor';
import {dW} from './kernel';
import {
  densitySampler,
  dt,
  eta,
  gravity,
  massSampler,
  particleRadius,
  pointerDown,
  pointerPos,
  pointerVel,
  positionSampler,
  resolution,
  velocitySampler,
  viscosity,
} from './uniforms';

export const updateVelocityGuessFs = compile(glsl`
out vec4 velocityGuessOut;

void main() {
  int particleIndex = int(gl_FragCoord.y) * ${resolution}.x + int(gl_FragCoord.x);
  ivec2 ownTexCoord = ivec2(gl_FragCoord.xy);
  vec2 ownPos = texelFetch(${positionSampler}, ownTexCoord, 0).xy;
  vec2 ownVel = texelFetch(${velocitySampler}, ownTexCoord, 0).xy;
  float ownMass = texelFetch(${massSampler}, ownTexCoord, 0).x;

  vec2 laplacianV = vec2(0.);

  ${foreachNeighbor}(neighborTexCoord, {
    ivec2 neighborTexCoord = ivec2(neighborIndex % ${resolution}.x, neighborIndex / ${resolution}.x);
    vec2 neighborPos = texelFetch(${positionSampler}, neighborTexCoord, 0).xy;
    vec2 neighborVel = texelFetch(${velocitySampler}, neighborTexCoord, 0).xy;
    float neighborMass = texelFetch(${massSampler}, neighborTexCoord, 0).x;
    float neighborDensity = texelFetch(${densitySampler}, neighborTexCoord, 0).x;
    
    vec2 dx = ownPos - neighborPos;
    vec2 dv = ownVel - neighborVel;
    float scale = 2. * (2. + 2.); // 2 * (D + 2)
    float volume = neighborMass / (neighborDensity + ${eta});
    float term = dot(dv, dx) / (pow(length(dx), 2.) + ${eta});

    laplacianV += scale * volume * term * ${dW}(dx);
  })

  vec2 fViscosity = ${viscosity} * laplacianV;

  vec2 fGrav = ${gravity} * ownMass;

  vec2 fPointer = float(${pointerDown}) * 20. * ${pointerVel} * (1. - min(vec2(1), length(ownPos - ${pointerPos}) / 0.1));

  vec2 fExt = fGrav + fPointer;

  vec2 velocityGuess = ownVel + (${dt} / ownMass) * (fViscosity + fExt);

  velocityGuessOut = vec4(velocityGuess, 0, 0);
}
`);
