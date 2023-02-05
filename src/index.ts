import './reset.css';
import './index.css';

const N = 100; // particle count
const R = 0.01; // particle radius
const position: number[][] = Array.from({length: N});
const velocity: number[][] = Array.from({length: N});
const mass: number[] = Array.from({length: N});

const rand = (a = 0.0, b = 1.0) => Math.random() * (b - a) + a;

const init = () => {
  for (let i = 0; i < N; ++i) {
    position[i] = [rand(), rand()];
    velocity[i] = [rand(-R, R), rand(-R, R)];
    mass[i] = 1.0;
  }
};
init();
addEventListener(
  'keydown',
  (event) => {
    if (event.code == 'Space') {
      init();
    }
  },
  false
);

const canvas = document.createElement('canvas');
const resize = () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
};
resize();
addEventListener('resize', resize, false);

let tLast = Date.now();
const frame = () => {
  const dt = Date.now() - tLast;
  tLast = Date.now();
  const ctx = canvas.getContext('2d')!;

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

  for (let i = 0; i < N; ++i) {
    // update
    position[i][0] += velocity[i][0] * dt;
    position[i][1] += velocity[i][1] * dt;

    // render
    ctx.beginPath();
    ctx.ellipse(position[i][0], position[i][1], R, R, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();

  requestAnimationFrame(frame);
};
requestAnimationFrame(frame);

document.getElementById('container')!.appendChild(canvas);
