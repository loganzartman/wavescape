import {State} from './state';
import {Params} from './params';
import {W, dW} from './kernel';
import {updateNeighbors, forEachNeighbor} from './neighbors';
import {dot, length} from './util';
import {getPointerForce} from './pointer';
import {PHASE_FLUID} from './constants';

export const updateDensity = (state: State, params: Params) => {
  for (let i = 0; i < state.capacity; ++i) {
    state.cpu.density[i] = state.cpu.mass[i] * W(params, 0, 0);
    forEachNeighbor(state, params, i, (j) => {
      const dx = state.cpu.position[j * 2 + 0] - state.cpu.position[i * 2 + 0];
      const dy = state.cpu.position[j * 2 + 1] - state.cpu.position[i * 2 + 1];
      state.cpu.density[i] += state.cpu.mass[j] * W(params, dx, dy);
    });
  }
};

export const updateVelocityGuess = (
  state: State,
  params: Params,
  dt: number
) => {
  for (let i = 0; i < state.capacity; ++i) {
    // viscosity
    let laplacianVx = 0;
    let laplacianVy = 0;
    forEachNeighbor(state, params, i, (j) => {
      const dx = state.cpu.position[i * 2 + 0] - state.cpu.position[j * 2 + 0];
      const dy = state.cpu.position[i * 2 + 1] - state.cpu.position[j * 2 + 1];
      const dvx = state.cpu.velocity[i * 2 + 0] - state.cpu.velocity[j * 2 + 0];
      const dvy = state.cpu.velocity[i * 2 + 1] - state.cpu.velocity[j * 2 + 1];
      const scale = 2 * (params.dimension + 2);
      const volume = state.cpu.mass[j] / (state.cpu.density[j] + params.eta);
      const term = dot(dvx, dvy, dx, dy) / (length(dx, dy) ** 2 + params.eta);

      const [dWx, dWy] = dW(params, dx, dy);
      laplacianVx += scale * volume * term * dWx;
      laplacianVy += scale * volume * term * dWy;
    });
    const fViscosityX = params.viscosity * laplacianVx;
    const fViscosityY = params.viscosity * laplacianVy;

    // external forces
    const [fMouseX, fMouseY] = getPointerForce(
      state.cpu.position[i * 2 + 0],
      state.cpu.position[i * 2 + 1]
    );

    const fExtX = fMouseX + params.gravity[0] * state.cpu.mass[i];
    const fExtY = fMouseY + params.gravity[1] * state.cpu.mass[i];

    state.cpu.velocityGuess[i * 2 + 0] =
      state.cpu.velocity[i * 2 + 0] +
      (dt / state.cpu.mass[i]) * (fViscosityX + fExtX);
    state.cpu.velocityGuess[i * 2 + 1] =
      state.cpu.velocity[i * 2 + 1] +
      (dt / state.cpu.mass[i]) * (fViscosityY + fExtY);
  }
};

const updatePressure = (state: State, params: Params) => {
  for (let i = 0; i < state.capacity; ++i) {
    state.cpu.fPressure[i * 2 + 0] = 0;
    state.cpu.fPressure[i * 2 + 1] = 0;
    forEachNeighbor(state, params, i, (j) => {
      const pressurei =
        params.stiffness * (state.cpu.density[i] / params.restDensity - 1);
      const pressurej =
        params.stiffness * (state.cpu.density[j] / params.restDensity - 1);
      const dx = state.cpu.position[j * 2 + 0] - state.cpu.position[i * 2 + 0];
      const dy = state.cpu.position[j * 2 + 1] - state.cpu.position[i * 2 + 1];
      const [dWx, dWy] = dW(params, dx, dy);

      const term =
        state.cpu.density[i] *
        state.cpu.mass[j] *
        (pressurei / state.cpu.density[i] ** 2 +
          pressurej / state.cpu.density[j] ** 2);
      state.cpu.fPressure[i * 2 + 0] += term * dWx;
      state.cpu.fPressure[i * 2 + 1] += term * dWy;
    });
  }
};

const updateVelocity = (state: State, params: Params, dt: number) => {
  for (let i = 0; i < state.capacity; ++i) {
    state.cpu.velocity[i * 2 + 0] =
      state.cpu.velocityGuess[i * 2 + 0] +
      (dt / state.cpu.mass[i]) * state.cpu.fPressure[i * 2 + 0];
    state.cpu.velocity[i * 2 + 1] =
      state.cpu.velocityGuess[i * 2 + 1] +
      (dt / state.cpu.mass[i]) * state.cpu.fPressure[i * 2 + 1];

    // kinematic particle-particle collisions
    let dvxCollision = 0;
    let dvyCollision = 0;
    let collidedMass = 0;
    const dCol = params.collisionDistance;
    const restitution = params.particleRestitution;
    forEachNeighbor(state, params, i, (j) => {
      const dx = state.cpu.position[i * 2 + 0] - state.cpu.position[j * 2 + 0];
      const dy = state.cpu.position[i * 2 + 1] - state.cpu.position[j * 2 + 1];
      const dvx =
        state.cpu.velocityGuess[i * 2 + 0] - state.cpu.velocityGuess[j * 2 + 0];
      const dvy =
        state.cpu.velocityGuess[i * 2 + 1] - state.cpu.velocityGuess[j * 2 + 1];
      const d = length(dx, dy) + params.eta;
      const dotDxDv = dot(dx, dy, dvx, dvy);
      if (d < dCol && dotDxDv < 0) {
        collidedMass += state.cpu.mass[j];
        dvxCollision +=
          state.cpu.mass[j] * (1 + restitution) * (dotDxDv / d) * (dx / d);
        dvyCollision +=
          state.cpu.mass[j] * (1 + restitution) * (dotDxDv / d) * (dy / d);
      }
    });
    const collisionTerm = 1 / (state.cpu.mass[i] + collidedMass);
    state.cpu.velocity[i * 2 + 0] -= collisionTerm * dvxCollision;
    state.cpu.velocity[i * 2 + 1] -= collisionTerm * dvyCollision;

    // kinematic particle-wall collisions
    if (
      state.cpu.position[i * 2 + 0] < 0 &&
      state.cpu.velocity[i * 2 + 0] < 0
    ) {
      state.cpu.velocity[i * 2 + 0] *= -params.wallRestitution;
    }
    if (
      state.cpu.position[i * 2 + 1] < 0 &&
      state.cpu.velocity[i * 2 + 1] < 0
    ) {
      state.cpu.velocity[i * 2 + 1] *= -params.wallRestitution;
    }
    if (
      state.cpu.position[i * 2 + 0] > 1 &&
      state.cpu.velocity[i * 2 + 0] > 0
    ) {
      state.cpu.velocity[i * 2 + 0] *= -params.wallRestitution;
    }
    if (
      state.cpu.position[i * 2 + 1] > 1 &&
      state.cpu.velocity[i * 2 + 1] > 0
    ) {
      state.cpu.velocity[i * 2 + 1] *= -params.wallRestitution;
    }
  }
};

const advectParticles = (state: State, params: Params, dt: number) => {
  for (let i = 0; i < state.capacity; ++i) {
    if (state.cpu.phase[i] === PHASE_FLUID) {
      state.cpu.position[i * 2 + 0] += dt * state.cpu.velocity[i * 2 + 0];
      state.cpu.position[i * 2 + 1] += dt * state.cpu.velocity[i * 2 + 1];
    }
  }
};

export const updateSimulation = (state: State, params: Params, dt: number) => {
  updateNeighbors(state, params);

  for (let i = 0; i < params.substeps; ++i) {
    updateDensity(state, params);
    updateVelocityGuess(state, params, dt);
    updatePressure(state, params);
    updateVelocity(state, params, dt);
    advectParticles(state, params, dt);
  }
};
