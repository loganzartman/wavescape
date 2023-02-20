import {glsl, GLSLDefinition} from '../glslpp';
import {cellResolution} from './uniforms';

export const cellKey = new GLSLDefinition(
  'cellKey',
  glsl`
int cellKey(ivec2 cellPos) {
  return cellPos.y * ${cellResolution}.x + cellPos.x;
}
`
);
