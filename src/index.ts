import './reset.css';
import './index.css';
import {makeDamBreak} from './scene';
import {State, allocateState} from './state';
import {Params, makeDefaultParams} from './params';

let running = true;
let step = false;

const state: State = allocateState({n: 500});
const params: Params = makeDefaultParams();

const rand = (a = 0.0, b = 1.0) => Math.random() * (b - a) + a;

const length = (x, y): number => Math.sqrt(x * x + y * y);

const dot = (x1, y1, x2, y2): number => x1 * x2 + y1 * y2;

const W = (dx, dy): number => {
  // cubic spline kernel
  const q = length(dx, dy) / params.hSmoothing;
  if (0 <= q && q <= 0.5) {
    return params.sigma * (6 * (q ** 3 - q ** 2) + 1);
  } else if (0.5 < q && q <= 1) {
    return params.sigma * (2 * (1 - q) ** 3);
  } else {
    return 0;
  }
};

const dW = (dx, dy): [number, number] => {
  // derivative of cubic spline kernel
  const len = length(dx, dy);
  const dxq = dx / (params.hSmoothing * len + params.eta);
  const dyq = dy / (params.hSmoothing * len + params.eta);

  const q = len / params.hSmoothing;
  if (0 <= q && q <= 0.5) {
    const term = params.sigma * (18 * q ** 2 - 12 * q);
    return [term * dxq, term * dyq];
  } else if (0.5 < q && q <= 1) {
    const term = params.sigma * (-6 * (1 - q) ** 2);
    return [term * dxq, term * dyq];
  } else {
    return [0, 0];
  }
};

const init = () => {
  makeDamBreak(state, params);
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
let pointerDx = 0;
let pointerDy = 0;

const updatePointer = (realDt: number) => {
  pointerDx = (pointerX - lastPointerX) / realDt;
  pointerDy = (pointerY - lastPointerY) / realDt;
  lastPointerX = pointerX;
  lastPointerY = pointerY;
};

const getMouseForce = (x: number, y: number) => {
  if (!pointerDown) {
    return [0, 0];
  }
  const mag = 20;
  const rad = 0.1;
  const dist = length(x - pointerX, y - pointerY);
  const f = 1 - Math.min(1, dist / rad);
  return [mag * pointerDx * f, mag * pointerDy * f];
};

const screenToWorld = (x: number, y: number) => {
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

const neighborTable = new Map<number, number[]>();
const neighborCellSize = 1.0 * params.hSmoothing;

const cellKey = (i: number, j: number) => (73856093 * i) ^ (19349663 * j);

const posToCell = (x: number, y: number): [number, number] => [
  Math.floor(x / neighborCellSize),
  Math.floor(y / neighborCellSize),
];

const updateNeighbors = () => {
  neighborTable.clear();
  for (let i = 0; i < state.n; ++i) {
    const [cellX, cellY] = posToCell(
      state.position[i][0],
      state.position[i][1]
    );
    const key = cellKey(cellX, cellY);
    if (!neighborTable.has(key)) {
      neighborTable.set(key, []);
    }
    neighborTable.get(key)?.push(i);
  }
};

const getNeighbors = function* (index: number) {
  const [cx0, cy0] = posToCell(
    state.position[index][0] - params.hSmoothing,
    state.position[index][1] - params.hSmoothing
  );
  const [cx1, cy1] = posToCell(
    state.position[index][0] + params.hSmoothing,
    state.position[index][1] + params.hSmoothing
  );
  for (let cx = cx0; cx <= cx1; ++cx) {
    for (let cy = cy0; cy <= cy1; ++cy) {
      const neighbors = neighborTable.get(cellKey(cx, cy));
      if (neighbors) {
        yield* neighbors;
      }
    }
  }
};

const getNeighborsBrute = function* (index: number) {
  for (let j = 0; j < state.n; ++j) {
    if (index === j) continue;
    yield j;
  }
};

const computeDensity = () => {
  for (let i = 0; i < state.n; ++i) {
    state.density[i] = state.mass[i] * W(0, 0);
    for (const j of getNeighbors(i)) {
      const dx = state.position[j][0] - state.position[i][0];
      const dy = state.position[j][1] - state.position[i][1];
      state.density[i] += state.mass[j] * W(dx, dy);
    }
  }
};

const computeVelocityGuess = ({dt}: {dt: number}) => {
  for (let i = 0; i < state.n; ++i) {
    // viscosity
    let laplacianVx = 0;
    let laplacianVy = 0;
    for (const j of getNeighbors(i)) {
      const dx = state.position[i][0] - state.position[j][0];
      const dy = state.position[i][1] - state.position[j][1];
      const dvx = state.velocity[i][0] - state.velocity[j][0];
      const dvy = state.velocity[i][1] - state.velocity[j][1];
      const scale = 2 * (params.dimension + 2);
      const volume = state.mass[j] / (state.density[j] + params.eta);
      const term = dot(dvx, dvy, dx, dy) / (length(dx, dy) ** 2 + params.eta);

      const [dWx, dWy] = dW(dx, dy);
      laplacianVx += scale * volume * term * dWx;
      laplacianVy += scale * volume * term * dWy;
    }
    const fViscosityX = params.viscosity * laplacianVx;
    const fViscosityY = params.viscosity * laplacianVy;

    // external forces
    const [fMouseX, fMouseY] = getMouseForce(
      state.position[i][0],
      state.position[i][1]
    );

    const fGravX = 0;
    const fGravY = 0.5;

    // hacky wall penalty force
    const wallSize = params.particleRadius;
    const kWall = 2000;
    let fWallX = 0;
    let fWallY = 0;
    if (state.position[i][0] < wallSize) {
      fWallX += kWall * (wallSize - state.position[i][0]);
    }
    if (state.position[i][1] < wallSize) {
      fWallY += kWall * (wallSize - state.position[i][1]);
    }
    if (state.position[i][0] > 1 - wallSize) {
      fWallX -= kWall * (state.position[i][0] - (1 - wallSize));
    }
    if (state.position[i][1] > 1 - wallSize) {
      fWallY -= kWall * (state.position[i][1] - (1 - wallSize));
    }

    const fExtX = fMouseX + fGravX + fWallX;
    const fExtY = fMouseY + fGravY + fWallY;

    state.velocityGuess[i][0] =
      state.velocity[i][0] + (dt / state.mass[i]) * (fViscosityX + fExtX);
    state.velocityGuess[i][1] =
      state.velocity[i][1] + (dt / state.mass[i]) * (fViscosityY + fExtY);
  }
};

const computePressure = () => {
  for (let i = 0; i < state.n; ++i) {
    state.fPressure[i][0] = 0;
    state.fPressure[i][1] = 0;
    for (const j of getNeighbors(i)) {
      const pressurei =
        params.stiffness * (state.density[i] / params.restDensity - 1);
      const pressurej =
        params.stiffness * (state.density[j] / params.restDensity - 1);
      const dx = state.position[j][0] - state.position[i][0];
      const dy = state.position[j][1] - state.position[i][1];
      const [dWx, dWy] = dW(dx, dy);

      const term =
        state.density[i] *
        state.mass[j] *
        (pressurei / state.density[i] ** 2 + pressurej / state.density[j] ** 2);
      state.fPressure[i][0] += term * dWx;
      state.fPressure[i][1] += term * dWy;
    }
  }
};

const advectParticles = ({dt}: {dt: number}) => {
  for (let i = 0; i < state.n; ++i) {
    state.velocity[i][0] =
      state.velocityGuess[i][0] + (dt / state.mass[i]) * state.fPressure[i][0];
    state.velocity[i][1] =
      state.velocityGuess[i][1] + (dt / state.mass[i]) * state.fPressure[i][1];

    state.position[i][0] += dt * state.velocity[i][0];
    state.position[i][1] += dt * state.velocity[i][1];
  }
};

let tLast = Date.now();
const simulate = () => {
  const dt = 0.02;
  const realDt = (Date.now() - tLast) / 1000;
  tLast = Date.now();

  updatePointer(realDt);
  updateNeighbors();

  computeDensity();
  computeVelocityGuess({dt});
  computePressure();
  advectParticles({dt});
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
  for (let i = 0; i < state.n; ++i) {
    maxdens = Math.max(maxdens, Math.abs(state.density[i]));
    maxpresx = Math.max(maxpresx, Math.abs(state.fPressure[i][0]));
    maxpresy = Math.max(maxpresy, Math.abs(state.fPressure[i][1]));
  }

  // render
  for (let i = 0; i < state.n; ++i) {
    ctx.beginPath();
    ctx.ellipse(
      state.position[i][0],
      state.position[i][1],
      params.particleRadius,
      params.particleRadius,
      0,
      0,
      Math.PI * 2
    );
    ctx.fillStyle = `rgb(${((state.density[i] / maxdens) * 0.5 + 0.5) * 255}, ${
      ((state.fPressure[i][0] / maxpresx) * 0.5 + 0.5) * 255
    }, ${((state.fPressure[i][1] / maxpresy) * 0.5 + 0.5) * 255})`;
    ctx.fill();
  }

  ctx.restore();

  requestAnimationFrame(frame);
};
requestAnimationFrame(frame);

document.getElementById('container')!.appendChild(canvas);
