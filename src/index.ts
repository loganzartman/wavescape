import './reset.css';
import './index.css';

let running = true;
let step = false;

const D = 2; // dimension
const N = 200; // particle count
const R = 0.02; // particle radius
const position: number[][] = Array.from({length: N});
const velocity: number[][] = Array.from({length: N});
const mass: number[] = Array.from({length: N});

const density: number[] = Array.from({length: N});
const velocity_guess: number[][] = Array.from({length: N});
const f_pressure: number[][] = Array.from({length: N});

const viscosity = 0.002;
const stiffness = 1.0;
const rest_density = 600;
const smoothing_h = 0.1;
const eta = 0.01 * smoothing_h ** 2;

const smoothing_h_inv = 1.0 / smoothing_h;
const sigma2 = 40 / (7 * Math.PI * smoothing_h ** 2);

const rand = (a = 0.0, b = 1.0) => Math.random() * (b - a) + a;

const length = (x, y): number => Math.sqrt(x * x + y * y);

const dot = (x1, y1, x2, y2): number => x1 * x2 + y1 * y2;

const W = (dx, dy): number => {
  // cubic spline kernel
  const q = smoothing_h_inv * length(dx, dy);
  if (0 <= q && q <= 0.5) {
    return sigma2 * (6 * (q ** 3 - q ** 2) + 1);
  } else if (0.5 < q && q <= 1) {
    return sigma2 * (2 * (1 - q) ** 3);
  } else {
    return 0;
  }
};

const dW = (dx, dy): [number, number] => {
  // derivative of cubic spline kernel
  const len = length(dx, dy);
  const dxq = dx / (smoothing_h * len + eta);
  const dyq = dy / (smoothing_h * len + eta);

  const q = smoothing_h_inv * len;
  if (0 <= q && q <= 0.5) {
    const term = sigma2 * (18 * q ** 2 - 12 * q);
    return [term * dxq, term * dyq];
  } else if (0.5 < q && q <= 1) {
    const term = sigma2 * (-6 * (1 - q) ** 2);
    return [term * dxq, term * dyq];
  } else {
    return [0, 0];
  }
};

const init = () => {
  for (let i = 0; i < N; ++i) {
    position[i] = [rand(), rand()];
    velocity[i] = [0, 0];
    mass[i] = 1.0;

    density[i] = 0;
    velocity_guess[i] = [0, 0];
    f_pressure[i] = [0, 0];
  }

  const size = R * 2;
  const border = 0.1;
  let i = 0;
  let x = 0;
  let y = 0;
  let h = Math.floor((1 - border * 2) / size);
  while (i < N) {
    position[i][0] = border + x * size;
    position[i][1] = border + y * size;
    ++i;
    ++y;
    if (y > h) {
      ++x;
      y = 0;
    }
  }
};
init();

const canvas = document.createElement('canvas');
const resize = () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
};
resize();
addEventListener('resize', resize, false);

addEventListener(
  'keydown',
  (event) => {
    if (event.code == 'Space') {
      running = !running;
    }
    if (event.code == 'KeyR') {
      init();
    }
    if (event.code == 'KeyS') {
      step = true;
    }
  },
  false
);

let pointerDown = false;
let pointerX = 0;
let pointerY = 0;
let lastPointerX = 0;
let lastPointerY = 0;
const screenToWorld = (x, y) => {
  const dim = Math.min(window.innerWidth, window.innerHeight);
  const worldX = (x - (window.innerWidth - dim) * 0.5) / dim;
  const worldY = (y - (window.innerHeight - dim) * 0.5) / dim;
  return [worldX, worldY];
};
addEventListener(
  'pointerdown',
  (event) => {
    pointerDown = true;
    const [worldX, worldY] = screenToWorld(event.pageX, event.pageY);
    lastPointerX = worldX;
    lastPointerY = worldY;
  },
  false
);
addEventListener(
  'pointerup',
  () => {
    pointerDown = false;
  },
  false
);
addEventListener(
  'pointermove',
  (event) => {
    const [worldX, worldY] = screenToWorld(event.pageX, event.pageY);
    pointerX = worldX;
    pointerY = worldY;
  },
  false
);

let tLast = Date.now();
const simulate = () => {
  const dt = 0.01;
  const realDt = (Date.now() - tLast) / 1000;
  tLast = Date.now();

  const pointerDx = (pointerX - lastPointerX) / realDt;
  const pointerDy = (pointerY - lastPointerY) / realDt;
  lastPointerX = pointerX;
  lastPointerY = pointerY;

  const getMouseForce = (x, y) => {
    if (!pointerDown) {
      return [0, 0];
    }
    const mag = 20;
    const rad = 0.1;
    const dist = length(x - pointerX, y - pointerY);
    const f = 1 - Math.min(1, dist / rad);
    return [mag * pointerDx * f, mag * pointerDy * f];
  };

  // reconstruct particle density
  for (let i = 0; i < N; ++i) {
    density[i] = 0;
    for (let j = 0; j < N; ++j) {
      const dx = position[j][0] - position[i][0];
      const dy = position[j][1] - position[i][1];
      density[i] += mass[j] * W(dx, dy);
    }
  }

  // compute velocity guess
  for (let i = 0; i < N; ++i) {
    // viscosity
    let laplacianVx = 0;
    let laplacianVy = 0;
    for (let j = 0; j < N; ++j) {
      if (i === j) continue;
      const dx = position[i][0] - position[j][0];
      const dy = position[i][1] - position[j][1];
      const dvx = velocity[i][0] - velocity[j][0];
      const dvy = velocity[i][1] - velocity[j][1];
      const scale = 2 * (D + 2);
      const volume = mass[j] / (density[j] + eta);
      const term = dot(dvx, dvy, dx, dy) / (length(dx, dy) ** 2 + eta);

      const [dWx, dWy] = dW(dx, dy);
      laplacianVx += scale * volume * term * dWx;
      laplacianVy += scale * volume * term * dWy;
    }
    const fViscosityX = viscosity * laplacianVx;
    const fViscosityY = viscosity * laplacianVy;

    // external forces
    const [fMouseX, fMouseY] = getMouseForce(position[i][0], position[i][1]);

    const fGravX = 0;
    const fGravY = 0.5;

    // hacky wall penalty force
    const wallSize = R;
    const kWall = 1000;
    let fWallX = 0;
    let fWallY = 0;
    if (position[i][0] < wallSize) {
      fWallX += kWall * (wallSize - position[i][0]);
    }
    if (position[i][1] < wallSize) {
      fWallY += kWall * (wallSize - position[i][1]);
    }
    if (position[i][0] > 1 - wallSize) {
      fWallX -= kWall * (position[i][0] - (1 - wallSize));
    }
    if (position[i][1] > 1 - wallSize) {
      fWallY -= kWall * (position[i][1] - (1 - wallSize));
    }

    const fExtX = fMouseX + fGravX + fWallX;
    const fExtY = fMouseY + fGravY + fWallY;

    velocity_guess[i][0] =
      velocity[i][0] + (dt / mass[i]) * (fViscosityX + fExtX);
    velocity_guess[i][1] =
      velocity[i][1] + (dt / mass[i]) * (fViscosityY + fExtY);
  }

  // compute pressure
  for (let i = 0; i < N; ++i) {
    f_pressure[i][0] = 0;
    f_pressure[i][1] = 0;
    for (let j = 0; j < N; ++j) {
      if (i === j) continue;
      const pressurei = stiffness * (density[i] / rest_density - 1);
      const pressurej = stiffness * (density[j] / rest_density - 1);
      const dx = position[j][0] - position[i][0];
      const dy = position[j][1] - position[i][1];
      const [dWx, dWy] = dW(dx, dy);

      const term =
        density[i] *
        mass[j] *
        (pressurei / density[i] ** 2 + pressurej / density[j] ** 2);
      f_pressure[i][0] += term * dWx;
      f_pressure[i][1] += term * dWy;
    }
  }

  // update particles
  for (let i = 0; i < N; ++i) {
    velocity[i][0] = velocity_guess[i][0] + (dt / mass[i]) * f_pressure[i][0];
    velocity[i][1] = velocity_guess[i][1] + (dt / mass[i]) * f_pressure[i][1];

    position[i][0] += dt * velocity[i][0];
    position[i][1] += dt * velocity[i][1];
  }
};

const frame = () => {
  if (running || step) {
    simulate();
    step = false;
  }

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

  let maxdens = 0,
    maxpresx = 0,
    maxpresy = 0;
  for (let i = 0; i < N; ++i) {
    maxdens = Math.max(maxdens, Math.abs(density[i]));
    maxpresx = Math.max(maxpresx, Math.abs(f_pressure[i][0]));
    maxpresy = Math.max(maxpresy, Math.abs(f_pressure[i][1]));
  }

  // render
  for (let i = 0; i < N; ++i) {
    ctx.beginPath();
    ctx.ellipse(position[i][0], position[i][1], R, R, 0, 0, Math.PI * 2);
    ctx.fillStyle = `rgb(${((density[i] / maxdens) * 0.5 + 0.5) * 255}, ${
      ((f_pressure[i][0] / maxpresx) * 0.5 + 0.5) * 255
    }, ${((f_pressure[i][1] / maxpresy) * 0.5 + 0.5) * 255})`;
    ctx.fill();
  }

  ctx.restore();

  requestAnimationFrame(frame);
};
requestAnimationFrame(frame);

document.getElementById('container')!.appendChild(canvas);
