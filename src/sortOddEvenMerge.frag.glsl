#version 300 es
precision highp isampler2D;
precision highp float;
precision highp int;

uniform isampler2D inputSampler;
uniform ivec2 resolution;
uniform int stageWidth;
uniform int compareWidth;

out ivec4 outResult;

void main() {
  // self index
  int i = int(gl_FragCoord.y) * resolution.x + int(gl_FragCoord.x);

  // is this the left side of the pair (0) or the right (1)?
  bool isLeft;
  if (compareWidth < stageWidth) {
    // this is a merge pass; add an offset
    isLeft = (i / compareWidth + 1) % 2 == 0;
  } else {
    // first pass
    isLeft = (i / compareWidth) % 2 == 0;
  }
  int direction = isLeft ? 1 : -1;
  
  // pair index
  int j = i + direction * compareWidth;

  // read value of self and pair
  ivec2 texCoordi = ivec2(i % resolution.x, i / resolution.x);
  ivec2 texCoordj = ivec2(j % resolution.x, j / resolution.x);
  // values consist of (key, value)
  ivec2 vi = texelFetch(inputSampler, texCoordi, 0).rg;
  ivec2 vj = texelFetch(inputSampler, texCoordj, 0).rg;

  ivec2 result;
  int sw2 = stageWidth * 2;
  int lower = (i / sw2) * sw2;
  int upper = lower + sw2;
  int n = resolution.x * resolution.y;
  if (j < lower || j >= upper || j >= n) {
    // pair is not in bounds; simply copy own value
    result = vi;
  } else {
    if (isLeft) {
      // self is on the left side of the pair; pick <
      result = vi.x < vj.x ? vi : vj;
    } else {
      // self is on the right side of the pair; pick >=
      result = vi.x >= vj.x ? vi : vj;
    }
  }

  outResult = ivec4(result, 0, 0);
}
