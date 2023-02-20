import {compile, glsl} from '../glslpp';

export const copyVertexVs = compile(glsl`
in vec2 vertexPos;

void main() {
  gl_Position = vec4(vertexPos, 0, 1);
}
`);
