import {compile, glsl} from '../gl/glslpp';
import {resolution, velocitySampler} from '../uniforms';

export const updateMaxSpeedVs = compile(glsl`
out float speed;

void main() {
  int particleIndex = gl_VertexID;
  ivec2 texCoord = ivec2(particleIndex % ${resolution}.x, particleIndex / ${resolution}.x);
  vec2 velocity = texelFetch(${velocitySampler}, texCoord, 0).xy;
  speed = length(velocity) + 0.000001;

  gl_Position = vec4(0. ,0., 0., 1.);
  gl_PointSize = 3.0;
}
`);

export const updateMaxSpeedFs = compile(glsl`
in float speed;
out vec4 result;

void main() {
  result = vec4(speed, 0, 0, 0);
}
`);
