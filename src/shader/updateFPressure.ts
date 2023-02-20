import {compile, glsl} from '../glslpp';
import {foreachNeighbor} from './foreachNeighbor';
import {dW} from './kernel';
import {
  densitySampler,
  massSampler,
  positionSampler,
  resolution,
  restDensity,
  stiffness,
} from './uniforms';

export const updateFPressureFs = compile(glsl`
out vec4 fPressureOut;

void main() {
  int particleIndex = int(gl_FragCoord.y) * ${resolution}.x + int(gl_FragCoord.x);
  ivec2 ownTexCoord = ivec2(gl_FragCoord.xy);
  vec2 ownPos = texelFetch(${positionSampler}, ownTexCoord, 0).xy;
  float ownDensity = texelFetch(${densitySampler}, ownTexCoord, 0).x;

  vec2 fPressure = vec2(0.);

  ${foreachNeighbor}(neighborTexCoord, {
    vec2 neighborPos = texelFetch(${positionSampler}, neighborTexCoord, 0).xy;
    float neighborMass = texelFetch(${massSampler}, neighborTexCoord, 0).x;
    float neighborDensity = texelFetch(${densitySampler}, neighborTexCoord, 0).x;
    
    float ownPressure = ${stiffness} * (ownDensity / ${restDensity} - 1.);
    float neighborPressure = ${stiffness} * (neighborDensity / ${restDensity} - 1.);
    vec2 dx = neighborPos - ownPos;

    float term = 
      ownDensity * 
      neighborMass * 
      (ownPressure / pow(ownDensity, 2.) + neighborPressure / pow(neighborDensity, 2.));
    fPressure += term * ${dW}(dx);
  })

  fPressureOut = vec4(fPressure, 0, 0);
}
`);
