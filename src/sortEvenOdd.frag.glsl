#version 300 es
precision highp isampler2D;
precision highp float;
precision highp int;

uniform isampler2D inputSampler;
uniform ivec2 resolution;
uniform int oddStep;

out ivec4 outResult;

void main() {
  int len = resolution.x * resolution.y;
  int selfIndex = int(gl_FragCoord.y) * resolution.x + int(gl_FragCoord.x);
  int compIndex = ((selfIndex + oddStep) % 2 == 0) ? selfIndex + 1 : selfIndex - 1;

  ivec2 texCoordSelf = ivec2(selfIndex % resolution.x, selfIndex / resolution.x);
  ivec2 texCoordComp = ivec2(compIndex % resolution.x, compIndex / resolution.x);
  // (key, value) pairs
  ivec2 self = texelFetch(inputSampler, texCoordSelf, 0).rg;
  ivec2 comp = texelFetch(inputSampler, texCoordComp, 0).rg;

  ivec2 result;
  if (compIndex < 0 || compIndex > len - 1) {
    result = self;
  } else if ((selfIndex + oddStep) % 2 == 0) {
    result = self.x < comp.x ? self : comp;
  } else {
    result = self.x >= comp.x ? self : comp;
  }

  outResult = ivec4(result, 0, 0);
}
