const scale = 4.0;
const intensity = 0.1;

export const plot2d = (
  f,
  x0 = -0.1,
  x1 = 0.1,
  y0 = -0.1,
  y1 = 0.1,
  step = 0.005
) => {
  const stepsX = Math.ceil((x1 - x0) / step);
  const stepsY = Math.ceil((y1 - y0) / step);

  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(stepsX * scale);
  canvas.height = Math.ceil(stepsY * scale);

  const ctx = canvas.getContext('2d')!;

  for (let sx = 0; sx <= stepsX; ++sx) {
    for (let sy = 0; sy <= stepsY; ++sy) {
      const x = x0 + step * sx;
      const y = y0 + step * sy;
      const result = f(x, y);
      const channels = [0, 0, 0];
      if (Array.isArray(result)) {
        for (let i = 0; i < result.length && i < 3; ++i) {
          channels[i] = result[i];
        }
      } else {
        for (let i = 0; i < 3; ++i) {
          channels[i] = result;
        }
      }
      ctx.fillStyle = `rgb(${127 + channels[0] * intensity}, ${
        127 + channels[1] * intensity
      }, ${127 + channels[2] * intensity})`;
      ctx.fillRect(sx * scale, sy * scale, scale, scale);
    }
  }

  return canvas;
};
