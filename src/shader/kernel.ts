import {glsl, GLSLDefinition} from '../glslpp';
import {hSmoothing, sigma} from './uniforms';

export const W = new GLSLDefinition(
  'W',
  glsl`
float W(vec2 dx) {
  // cubic spline kernel
  float q = sqrt(pow(dx.x, 2.) + pow(dx.y, 2.)) / ${hSmoothing};
  if (0. <= q && q <= 0.5) {
    return ${sigma} * (6. * (pow(q, 3.) - pow(q, 2.)) + 1.);
  } else if (0.5 < q && q <= 1.) {
    return ${sigma} * (2. * pow(1. - q, 3.));
  } else {
    return 0.;
  }
}
`
);
