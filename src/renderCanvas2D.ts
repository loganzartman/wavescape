import {Params} from './params';
import {State} from './state';

export const renderCanvas2D = (
  ctx: CanvasRenderingContext2D,
  state: State,
  params: Params
) => {
  const canvas = ctx.canvas;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  const dim = Math.min(window.innerWidth, window.innerHeight);
  ctx.scale(dim, dim);
  ctx.translate(
    ((window.innerWidth - dim) / dim) * 0.5,
    ((window.innerHeight - dim) / dim) * 0.5
  );

  ctx.beginPath();
  ctx.rect(0, 0, 1, 1);
  ctx.strokeStyle = 'red';
  ctx.lineWidth = 0.01;
  ctx.stroke();

  let maxdens = 0,
    maxpresx = 0,
    maxpresy = 0;
  for (let i = 0; i < state.n; ++i) {
    maxdens = Math.max(maxdens, Math.abs(state.density[i]));
    maxpresx = Math.max(maxpresx, Math.abs(state.fPressure[i * 2 + 0]));
    maxpresy = Math.max(maxpresy, Math.abs(state.fPressure[i * 2 + 1]));
  }

  // render
  for (let i = 0; i < state.n; ++i) {
    ctx.beginPath();
    ctx.ellipse(
      state.position[i * 2 + 0],
      state.position[i * 2 + 1],
      params.particleRadius,
      params.particleRadius,
      0,
      0,
      Math.PI * 2
    );
    ctx.fillStyle = `rgb(${((state.density[i] / maxdens) * 0.5 + 0.5) * 255}, ${
      ((state.fPressure[i * 2 + 0] / maxpresx) * 0.5 + 0.5) * 255
    }, ${((state.fPressure[i * 2 + 1] / maxpresy) * 0.5 + 0.5) * 255})`;
    ctx.fill();
  }

  ctx.restore();
};
