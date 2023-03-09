import {State, setCapacity} from './state';
import {Params} from './params';
import {PHASE_FLUID, PHASE_WALL} from './constants';
import {copyStateToGPU} from './copyState';

export const makeDamBreak = ({
  params,
  scene,
}: {
  params: Params;
  scene: Scene;
}) => {
  // temporary: calculate volume such that the 1x1 simulation area
  // is filled with 100x100 particles. We'll fill less so there will
  // be less than 10k particles.
  const particleVolume = (1 / 100) ** 2;

  fillRect({
    scene,
    params,
    phase: PHASE_FLUID,
    particleVolume,
    x0: 0,
    y0: 0.4,
    x1: 0.4,
    y1: 1,
  });

  // TODO: walls
  // fillRect({
  //   scene,
  //   params,
  //   phase: PHASE_WALL,
  //   particleVolume,
  //   x0: 0.48,
  //   x1: 0.52,
  //   y0: 0.7,
  //   y1: 1,
  // });
};

type Particle = {
  phase: number;
  mass: number;
  x: number;
  y: number;
  vx?: number;
  vy?: number;
};
type Scene = {particles: Particle[]};

export const createScene = (): Scene => ({particles: []});

export const setStateFromScene = ({
  scene,
  state,
  params,
  gl,
}: {
  scene: Scene;
  state: State;
  params: Params;
  gl: WebGL2RenderingContext | null;
}) => {
  const capacity = scene.particles.length;
  setCapacity({state, capacity, params, gl});

  // sort particles by phase for improved GPU thread coherence
  const particles = Array.from(scene.particles).sort(
    (a, b) => a.phase - b.phase
  );

  // initialize CPU state from particles in scene
  for (let i = 0; i < capacity; ++i) {
    const p = particles[i];
    state.cpu.mass[i] = p.mass;
    state.cpu.phase[i] = p.phase;
    state.cpu.position[i * 2 + 0] = p.x;
    state.cpu.position[i * 2 + 1] = p.y;
    state.cpu.velocity[i * 2 + 0] = p.vx ?? 0;
    state.cpu.velocity[i * 2 + 1] = p.vy ?? 0;
  }

  // initialize GPU state from CPU state
  if (gl) copyStateToGPU(gl, state, params);
};

export const fillRect = ({
  scene,
  params,
  phase,
  x0,
  y0,
  x1,
  y1,
  particleVolume,
}: {
  scene: Scene;
  params: Params;
  phase: number;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  particleVolume: number;
}) => {
  const particleSpacing = Math.sqrt(particleVolume);

  const countX = (x1 - x0) / particleSpacing;
  const countY = (y1 - y0) / particleSpacing;

  for (let ix = 0; ix < countX; ++ix) {
    for (let iy = 0; iy < countY; ++iy) {
      const x = x0 + ix * particleSpacing;
      const y = y0 + iy * particleSpacing;

      // place the particle
      scene.particles.push({
        x,
        y,
        mass: params.restDensity * particleVolume,
        phase,
      });
    }
  }
};
