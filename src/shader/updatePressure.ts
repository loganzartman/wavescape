import {PHASE_FLUID, PHASE_WALL} from '../constants';
import {compile, glsl} from '../gl/glslpp';
import {foreachNeighbor} from './foreachNeighbor';
import {W} from './kernel';
import {
  densitySampler,
  phaseSampler,
  positionSampler,
  restDensity,
  stiffness,
} from './uniforms';

export const updatePressureFs = compile(glsl`
out vec4 pressureOut;

const float gamma = 7.;

float fluidPressure(float density) {
  float restPressure = ${restDensity} * ${stiffness} * ${stiffness} / gamma;
  return restPressure * (pow(density / ${restDensity}, gamma) - 1.);
}

void main() {
  ivec2 ownTexCoord = ivec2(gl_FragCoord.xy);
  int ownPhase = texelFetch(${phaseSampler}, ownTexCoord, 0).x;
  vec2 ownPos = texelFetch(${positionSampler}, ownTexCoord, 0).xy;
  float ownDensity = texelFetch(${densitySampler}, ownTexCoord, 0).x;

  float pressure = fluidPressure(ownDensity);
  if (ownPhase == ${PHASE_FLUID}) {
    pressure = fluidPressure(ownDensity);
  } else if (ownPhase == ${PHASE_WALL}) {
    float totalKernelValue = 0.;
    ${foreachNeighbor}(neighborTexCoord, {
      vec2 neighborPos = texelFetch(${positionSampler}, neighborTexCoord, 0).xy;
      float neighborDensity = texelFetch(${densitySampler}, neighborTexCoord, 0).x;

      vec2 dx = neighborPos - ownPos;
      float kernelValue = ${W}(dx);
      totalKernelValue += kernelValue;
      pressure += fluidPressure(neighborDensity) * kernelValue;
    })
    pressure /= totalKernelValue;
  }

  pressureOut = vec4(pressure, 0, 0, 0);
}
`);
