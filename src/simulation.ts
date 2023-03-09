import {State} from './state';
import {Params} from './params';
import {W, dW} from './kernel';
import {updateNeighbors, forEachNeighbor} from './neighbors';
import {dot, length} from './util';
import {getPointerForce} from './pointer';
import {PHASE_FLUID, PHASE_WALL} from './constants';

const gamma = 7;

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
    const phase = state.cpu.phase[i];
    if (phase === PHASE_FLUID) {
      // viscosity
      let laplacianVx = 0;
      let laplacianVy = 0;
      forEachNeighbor(state, params, i, (j) => {
        const dx =
          state.cpu.position[i * 2 + 0] - state.cpu.position[j * 2 + 0];
        const dy =
          state.cpu.position[i * 2 + 1] - state.cpu.position[j * 2 + 1];
        const dvx =
          state.cpu.velocity[i * 2 + 0] - state.cpu.velocity[j * 2 + 0];
        const dvy =
          state.cpu.velocity[i * 2 + 1] - state.cpu.velocity[j * 2 + 1];
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
    } else {
      state.cpu.velocityGuess[i * 2 + 0] = 0;
      state.cpu.velocityGuess[i * 2 + 1] = 0;
    }
  }
};

const updatePressure = (state: State, params: Params) => {
  const restPressure = (params.restDensity * params.stiffness ** 2) / gamma;
  const fluidPressure = (i: number) =>
    restPressure * ((state.cpu.density[i] / params.restDensity) ** gamma - 1);

  for (let i = 0; i < state.capacity; ++i) {
    const phase = state.cpu.phase[i];
    if (phase === PHASE_FLUID) {
      state.cpu.pressure[i] = fluidPressure(i);
    } else if (phase === PHASE_WALL) {
      state.cpu.pressure[i] = 0;
      let totalKernelValue = 0;
      forEachNeighbor(state, params, i, (j) => {
        const dx =
          state.cpu.position[j * 2 + 0] - state.cpu.position[i * 2 + 0];
        const dy =
          state.cpu.position[j * 2 + 1] - state.cpu.position[i * 2 + 1];
        const kernelValue = W(params, dx, dy);
        totalKernelValue += kernelValue;
        // TODO: incorporate body force term
        state.cpu.pressure[i] += fluidPressure(j) * kernelValue;
      });
      state.cpu.pressure[i] /= totalKernelValue;
    } else {
      state.cpu.pressure[i] = 0;
    }
  }
};

const updateFPressure = (state: State, params: Params) => {
  const restPressure = (params.restDensity * params.stiffness ** 2) / gamma;
  for (let i = 0; i < state.capacity; ++i) {
    const phase = state.cpu.phase[i];
    state.cpu.fPressure[i * 2 + 0] = 0;
    state.cpu.fPressure[i * 2 + 1] = 0;
    if (phase === PHASE_FLUID) {
      forEachNeighbor(state, params, i, (j) => {
        const dx =
          state.cpu.position[j * 2 + 0] - state.cpu.position[i * 2 + 0];
        const dy =
          state.cpu.position[j * 2 + 1] - state.cpu.position[i * 2 + 1];
        const [dWx, dWy] = dW(params, dx, dy);

        const pressureI = state.cpu.pressure[i];
        const pressureJ = state.cpu.pressure[j];
        const densityI = state.cpu.density[i];
        let densityJ = state.cpu.density[j];
        if (state.cpu.phase[j] === PHASE_WALL) {
          densityJ =
            params.restDensity * (pressureJ / restPressure + 1) ** (1 / gamma);
        }

        const avgPressure =
          (densityJ * pressureI + densityI * pressureJ) / (densityI + densityJ);
        const volumeI = state.cpu.mass[i] / densityI;
        const volumeJ = state.cpu.mass[j] / densityJ;
        const term = (volumeI ** 2 + volumeJ ** 2) * avgPressure;

        state.cpu.fPressure[i * 2 + 0] += term * dWx;
        state.cpu.fPressure[i * 2 + 1] += term * dWy;
      });
      state.cpu.fPressure[i * 2 + 0] *= 1 / state.cpu.mass[i];
      state.cpu.fPressure[i * 2 + 1] *= 1 / state.cpu.mass[i];
    }
  }
};

const updateVelocity = (state: State, params: Params, dt: number) => {
  for (let i = 0; i < state.capacity; ++i) {
    const phase = state.cpu.phase[i];
    if (phase === PHASE_FLUID) {
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
        const neighborPhase = state.cpu.phase[j];
        const dx =
          state.cpu.position[i * 2 + 0] - state.cpu.position[j * 2 + 0];
        const dy =
          state.cpu.position[i * 2 + 1] - state.cpu.position[j * 2 + 1];
        const dvx =
          state.cpu.velocityGuess[i * 2 + 0] -
          state.cpu.velocityGuess[j * 2 + 0];
        const dvy =
          state.cpu.velocityGuess[i * 2 + 1] -
          state.cpu.velocityGuess[j * 2 + 1];
        const d = length(dx, dy) + params.eta;
        const dotDxDv = dot(dx, dy, dvx, dvy);
        if (d < dCol && dotDxDv < 0) {
          if (neighborPhase === PHASE_FLUID) {
            collidedMass += state.cpu.mass[j];
            dvxCollision +=
              state.cpu.mass[j] * (1 + restitution) * (dotDxDv / d) * (dx / d);
            dvyCollision +=
              state.cpu.mass[j] * (1 + restitution) * (dotDxDv / d) * (dy / d);
          }
          if (neighborPhase === PHASE_WALL) {
            dvxCollision +=
              (1 + params.wallRestitution) * (dotDxDv / d) * (dx / d);
            dvxCollision +=
              (1 + params.wallRestitution) * (dotDxDv / d) * (dy / d);
          }
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
    } else {
      state.cpu.velocity[i * 2 + 0] = 0;
      state.cpu.velocity[i * 2 + 1] = 0;
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
    updateFPressure(state, params);
    updateVelocity(state, params, dt);
    advectParticles(state, params, dt);
  }
};
