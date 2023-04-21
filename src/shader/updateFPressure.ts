import {PHASE_FLUID, PHASE_WALL} from '../constants';
import {compile, glsl} from '../gl/glslpp';
import {foreachNeighbor} from './foreachNeighbor';
import {dW} from './kernel';
import {
  densitySampler,
  eta,
  gamma,
  massSampler,
  phaseSampler,
  positionSampler,
  pressureSampler,
  restDensity,
  restPressure,
} from '../uniforms';

export const updateFPressureFs = compile(glsl`
out vec4 fPressureOut;

void main() {
  ivec2 ownTexCoord = ivec2(gl_FragCoord.xy);
  int ownPhase = texelFetch(${phaseSampler}, ownTexCoord, 0).x;

  vec2 fPressure = vec2(0.);

  if (ownPhase == ${PHASE_FLUID}) {
    vec2 ownPos = texelFetch(${positionSampler}, ownTexCoord, 0).xy;
    float ownMass = texelFetch(${massSampler}, ownTexCoord, 0).x;
    float ownDensity = texelFetch(${densitySampler}, ownTexCoord, 0).x;
    float ownPressure = texelFetch(${pressureSampler}, ownTexCoord, 0).x;
    float ownVolume = ownDensity > 0.0 ? ownMass / ownDensity : 0.0;

    ${foreachNeighbor}(ownPos, neighborTexCoord, {
      int neighborPhase = texelFetch(${phaseSampler}, neighborTexCoord, 0).x;
      vec2 neighborPos = texelFetch(${positionSampler}, neighborTexCoord, 0).xy;
      float neighborMass = texelFetch(${massSampler}, neighborTexCoord, 0).x;
      float neighborDensity = texelFetch(${densitySampler}, neighborTexCoord, 0).x;
      float neighborPressure = texelFetch(${pressureSampler}, neighborTexCoord, 0).x;
      
      if (neighborPhase == ${PHASE_WALL}) {
        neighborDensity = ${restDensity} * pow(neighborPressure / ${restPressure} + 1., 1. / ${gamma});
      }
      
      vec2 dx = neighborPos - ownPos;
      vec2 dWx = ${dW}(dx);
      
      float avgPressure = 
        (neighborDensity * ownPressure + ownDensity * neighborPressure) 
        / (ownDensity + neighborDensity + ${eta});
      float neighborVolume = neighborDensity > 0.0 ? neighborMass / neighborDensity : 0.0;
      fPressure += (ownVolume * ownVolume + neighborVolume * neighborVolume) * avgPressure * dWx;
    })
    fPressure *= ownMass > 0.0 ? 1. / ownMass : 1.0;
  }

  fPressureOut = vec4(fPressure, 0, 0);
}
`);
