import {GLSLDefinition} from '../gl/types';
import {glsl} from '../gl/glslpp';
import {cellResolution, cellSize} from './uniforms';

export const posToCell = new GLSLDefinition(
  'posToCell',
  glsl`
ivec2 posToCell(vec2 pos) {
  return max(ivec2(0), min(${cellResolution} - ivec2(1), ivec2(floor(pos / ${cellSize}))));
}
`
);
