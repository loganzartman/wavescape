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

    const fExtX = fMouseX + params.gravity[0] * state.mass[i];
    const fExtY = fMouseY + params.gravity[1] * state.mass[i];

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

const updateVelocity = (state: State, params: Params, dt: number) => {
  for (let i = 0; i < state.n; ++i) {
    state.velocity[i * 2 + 0] =
      state.velocityGuess[i * 2 + 0] +
      (dt / state.mass[i]) * state.fPressure[i * 2 + 0];
    state.velocity[i * 2 + 1] =
      state.velocityGuess[i * 2 + 1] +
      (dt / state.mass[i]) * state.fPressure[i * 2 + 1];

    // kinematic particle-particle collisions
    let dvxCollision = 0;
    let dvyCollision = 0;
    let collidedMass = 0;
    const dCol = params.collisionDistance;
    const restitution = params.particleRestitution;
    forEachNeighbor(state, params, i, (j) => {
      const dx = state.position[i * 2 + 0] - state.position[j * 2 + 0];
      const dy = state.position[i * 2 + 1] - state.position[j * 2 + 1];
      const dvx = state.velocity[i * 2 + 0] - state.velocity[j * 2 + 0];
      const dvy = state.velocity[i * 2 + 1] - state.velocity[j * 2 + 1];
      const d = length(dx, dy);
      const dotDxDv = dot(dx, dy, dvx, dvy);
      if (d < dCol && dotDxDv < 0) {
        collidedMass += state.mass[j];
        dvxCollision +=
          state.mass[j] * (1 + restitution) * (dotDxDv / d) * (dx / d);
        dvyCollision +=
          state.mass[j] * (1 + restitution) * (dotDxDv / d) * (dy / d);
      }
    });
    const collisionTerm = 1 / (state.mass[i] + collidedMass);
    state.velocity[i * 2 + 0] -= collisionTerm * dvxCollision;
    state.velocity[i * 2 + 1] -= collisionTerm * dvyCollision;

    // kinematic particle-wall collisions
    const wallSize = params.particleRadius;
    const wallRestitution = 0.5;
    if (state.position[i * 2 + 0] < wallSize && state.velocity[i * 2 + 0] < 0) {
      state.velocity[i * 2 + 0] *= -wallRestitution;
    }
    if (state.position[i * 2 + 1] < wallSize && state.velocity[i * 2 + 1] < 0) {
      state.velocity[i * 2 + 1] *= -wallRestitution;
    }
    if (
      state.position[i * 2 + 0] > 1 - wallSize &&
      state.velocity[i * 2 + 0] > 0
    ) {
      state.velocity[i * 2 + 0] *= -wallRestitution;
    }
    if (
      state.position[i * 2 + 1] > 1 - wallSize &&
      state.velocity[i * 2 + 1] > 0
    ) {
      state.velocity[i * 2 + 1] *= -wallRestitution;
    }
  }
};

const advectParticles = (state: State, params: Params, dt: number) => {
  for (let i = 0; i < state.n; ++i) {
    state.position[i * 2 + 0] += dt * state.velocity[i * 2 + 0];
    state.position[i * 2 + 1] += dt * state.velocity[i * 2 + 1];
  }
};

export const updateSimulation = (state: State, params: Params, dt: number) => {
  updateNeighbors(state, params);
  updateDensity(state, params);
  updateVelocityGuess(state, params, dt);
  updatePressure(state, params);
  updateVelocity(state, params, dt);
  advectParticles(state, params, dt);
};
