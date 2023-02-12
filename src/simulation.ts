import {State} from './state';
import {Params} from './params';
import {W, dW} from './kernel';
import {updateNeighbors, forEachNeighbor} from './neighbors';
import {dot, length} from './util';
import {getPointerForce} from './pointer';

export const updateDensity = (state: State, params: Params) => {
  for (let i = 0; i < state.n; ++i) {
    state.density[i] = state.mass[i] * W(params, 0, 0);
    forEachNeighbor(state, params, i, (j) => {
      const dx = state.position[j * 2 + 0] - state.position[i * 2 + 0];
      const dy = state.position[j * 2 + 1] - state.position[i * 2 + 1];
      state.density[i] += state.mass[j] * W(params, dx, dy);
    });
  }
};

export const updateVelocityGuess = (
  state: State,
  params: Params,
  dt: number
) => {
  for (let i = 0; i < state.n; ++i) {
    // viscosity
    let laplacianVx = 0;
    let laplacianVy = 0;
    forEachNeighbor(state, params, i, (j) => {
      const dx = state.position[i * 2 + 0] - state.position[j * 2 + 0];
      const dy = state.position[i * 2 + 1] - state.position[j * 2 + 1];
      const dvx = state.velocity[i * 2 + 0] - state.velocity[j * 2 + 0];
      const dvy = state.velocity[i * 2 + 1] - state.velocity[j * 2 + 1];
      const scale = 2 * (params.dimension + 2);
      const volume = state.mass[j] / (state.density[j] + params.eta);
      const term = dot(dvx, dvy, dx, dy) / (length(dx, dy) ** 2 + params.eta);

      const [dWx, dWy] = dW(params, dx, dy);
      laplacianVx += scale * volume * term * dWx;
      laplacianVy += scale * volume * term * dWy;
    });
    const fViscosityX = params.viscosity * laplacianVx;
    const fViscosityY = params.viscosity * laplacianVy;

    // external forces
    const [fMouseX, fMouseY] = getPointerForce(
      state.position[i * 2 + 0],
      state.position[i * 2 + 1]
    );

    const fGravX = 0;
    const fGravY = 0.5;

    // hacky wall penalty force
    const wallSize = params.particleRadius;
    const kWall = 2000;
    let fWallX = 0;
    let fWallY = 0;
    if (state.position[i * 2 + 0] < wallSize) {
      fWallX += kWall * (wallSize - state.position[i * 2 + 0]);
    }
    if (state.position[i * 2 + 1] < wallSize) {
      fWallY += kWall * (wallSize - state.position[i * 2 + 1]);
    }
    if (state.position[i * 2 + 0] > 1 - wallSize) {
      fWallX -= kWall * (state.position[i * 2 + 0] - (1 - wallSize));
    }
    if (state.position[i * 2 + 1] > 1 - wallSize) {
      fWallY -= kWall * (state.position[i * 2 + 1] - (1 - wallSize));
    }

    const fExtX = fMouseX + fGravX + fWallX;
    const fExtY = fMouseY + fGravY + fWallY;

    state.velocityGuess[i * 2 + 0] =
      state.velocity[i * 2 + 0] + (dt / state.mass[i]) * (fViscosityX + fExtX);
    state.velocityGuess[i * 2 + 1] =
      state.velocity[i * 2 + 1] + (dt / state.mass[i]) * (fViscosityY + fExtY);
  }
};

const updatePressure = (state: State, params: Params) => {
  for (let i = 0; i < state.n; ++i) {
    state.fPressure[i * 2 + 0] = 0;
    state.fPressure[i * 2 + 1] = 0;
    forEachNeighbor(state, params, i, (j) => {
      const pressurei =
        params.stiffness * (state.density[i] / params.restDensity - 1);
      const pressurej =
        params.stiffness * (state.density[j] / params.restDensity - 1);
      const dx = state.position[j * 2 + 0] - state.position[i * 2 + 0];
      const dy = state.position[j * 2 + 1] - state.position[i * 2 + 1];
      const [dWx, dWy] = dW(params, dx, dy);

      const term =
        state.density[i] *
        state.mass[j] *
        (pressurei / state.density[i] ** 2 + pressurej / state.density[j] ** 2);
      state.fPressure[i * 2 + 0] += term * dWx;
      state.fPressure[i * 2 + 1] += term * dWy;
    });
  }
};

const advectParticles = (state: State, params: Params, dt: number) => {
  for (let i = 0; i < state.n; ++i) {
    state.velocity[i * 2 + 0] =
      state.velocityGuess[i * 2 + 0] +
      (dt / state.mass[i]) * state.fPressure[i * 2 + 0];
    state.velocity[i * 2 + 1] =
      state.velocityGuess[i * 2 + 1] +
      (dt / state.mass[i]) * state.fPressure[i * 2 + 1];

    state.position[i * 2 + 0] += dt * state.velocity[i * 2 + 0];
    state.position[i * 2 + 1] += dt * state.velocity[i * 2 + 1];
  }
};

export const updateSimulation = (state: State, params: Params, dt: number) => {
  updateNeighbors(state, params);

  updateDensity(state, params);
  updateVelocityGuess(state, params, dt);
  updatePressure(state, params);
  advectParticles(state, params, dt);
};
