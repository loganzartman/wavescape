import {compile, glsl} from '../gl/glslpp';
import {getParticleColor} from './getParticleColor';
import {
  densitySampler,
  metaballScale,
  metaballStretch,
  metaballThreshold,
  particleRadius,
  positionSampler,
  projection,
  resolution,
  restDensity,
  thicknessSampler,
  velocitySampler,
} from './uniforms';

export const drawThicknessVs = compile(glsl`
in vec2 circleOffset;

out vec2 offset;
out vec4 color;

void main() {
  offset = circleOffset;
  int particleIndex = gl_InstanceID;
  ivec2 texCoord = ivec2(particleIndex % ${resolution}.x, particleIndex / ${resolution}.x);
  vec2 pos = texelFetch(${positionSampler}, texCoord, 0).xy;
  vec2 vel = texelFetch(${velocitySampler}, texCoord, 0).xy;

  float speed = length(vel);
  vec2 stretch = speed == 0.0
    ? vec2(0)
    : ${metaballStretch} * vel * dot(normalize(circleOffset), vel / speed);

  vec2 vertexPos = pos + (circleOffset + stretch) * ${particleRadius} * ${metaballScale};
  gl_Position = ${projection} * vec4(vertexPos, 0., 1.);
  color = ${getParticleColor}(particleIndex);  
}
`);

export const drawThicknessFs = compile(glsl`
in vec2 offset;
in vec4 color;

out vec4 outThickness;

void main() {
  float d = 1.0 - min(1.0, length(offset));
  float thickness = 6. * (d * d * d * d * d) - 15. * (d * d * d * d) + 10. * (d * d * d);
  outThickness = vec4(color.rgb * thickness, thickness);
}
`);

export const drawMetaballsFs = compile(glsl`
out vec4 outColor;

const float outlineScale = 0.7;
const float antialiasScale = 0.1;

void main() {
  ivec2 texCoord = ivec2(gl_FragCoord.xy);
  vec4 texel = texelFetch(${thicknessSampler}, texCoord, 0);

  float thickness = texel.a;
  vec3 baseColor = texel.rgb / thickness;
  vec3 outlineColor = baseColor * 1.8;
  vec3 backgroundColor = vec3(0.87);

  float outlineStartThreshold = ${metaballThreshold} * (1. + outlineScale);
  float antialiasEndThreshold = ${metaballThreshold} * (1. - antialiasScale);

  vec3 color = baseColor;
  if (thickness < outlineStartThreshold) 
    color = mix(baseColor, outlineColor, (outlineStartThreshold - thickness) / (outlineStartThreshold - ${metaballThreshold}));
  if (thickness < ${metaballThreshold}) 
    color = mix(outlineColor, backgroundColor, (${metaballThreshold} - thickness) / (${metaballThreshold} - antialiasEndThreshold));
  if (thickness < antialiasEndThreshold) color = backgroundColor;

  outColor = vec4(color, 1);
}
`);
