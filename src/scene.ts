import {State, setCapacity} from './state';
import {Params} from './params';
import {PHASE_WALL} from './constants';
import {copyStateToGPU} from './copyState';
import {clamp, dot, length} from './util';

export const makeWalls = ({params, scene}: {params: Params; scene: Scene}) => {
  const h = params.hSmoothing;
  drawPolyline({
    scene,
    params,
    phase: PHASE_WALL,
    thickness: h,
    vertices: [
      [-h, -h],
      [1 + h, -h],
      [1 + h, 1 + h],
      [-h, 1 + h],
      [-h, -h],
    ],
  });
};

export type Particle = {
  phase: number;
  mass: number;
  x: number;
  y: number;
  vx?: number;
  vy?: number;
};
export type Scene = {particles: Particle[]};

export const createScene = (): Scene => ({particles: []});

export const createSceneFromJSON = ({
  params,
  json,
}: {
  params: Params;
  json: object;
}): Scene => {
  const scene = createScene();
  if ('objects' in json) {
    if (!Array.isArray(json.objects)) throw new Error('objects must be a list');
    for (const {type, ...args} of json.objects) {
      if (type === 'fill') {
        fillRect({scene, params, ...args});
      } else if (type === 'polyline') {
        drawPolyline({scene, params, ...args});
      } else {
        throw new Error(`unsupported object type: '${type}'`);
      }
    }
  }
  return scene;
};

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

const boundingBox = (
  vertices: Array<[number, number]>
): {x0: number; y0: number; x1: number; y1: number} => {
  if (vertices.length < 1) throw new Error('no vertices present');
  let x0 = vertices[0][0];
  let y0 = vertices[0][1];
  let x1 = vertices[0][0];
  let y1 = vertices[0][1];
  for (const [x, y] of vertices) {
    if (x < x0) x0 = x;
    if (y < y0) y0 = y;
    if (x > x1) x1 = x;
    if (y > y1) y1 = y;
  }
  return {x0, y0, x1, y1};
};

const forPosInRect = (
  {
    params,
    x0,
    y0,
    x1,
    y1,
  }: {
    params: Params;
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  },
  callback: (x: number, y: number) => void
) => {
  const particleSpacing = params.particleRadius * 2.2;
  const countX = (x1 - x0) / particleSpacing;
  const countY = (y1 - y0) / particleSpacing;

  for (let ix = 0; ix < countX; ++ix) {
    for (let iy = 0; iy < countY; ++iy) {
      const x = x0 + ix * particleSpacing;
      const y = y0 + iy * particleSpacing;
      callback(x, y);
    }
  }
};

export const drawPolyline = ({
  scene,
  params,
  phase,
  thickness,
  vertices,
  vx = 0,
  vy = 0,
}: {
  scene: Scene;
  params: Params;
  phase: number;
  thickness: number;
  vertices: Array<[number, number]>;
  vx?: number;
  vy?: number;
}) => {
  if (vertices.length < 2) throw new Error('must have at least 3 vertices');

  const bbox = boundingBox(vertices);
  bbox.x0 -= thickness;
  bbox.y0 -= thickness;
  bbox.x1 += thickness;
  bbox.y1 += thickness;

  forPosInRect({params, ...bbox}, (x, y) => {
    for (let v0 = 0; v0 < vertices.length - 1; ++v0) {
      const v1 = v0 + 1;

      const x0 = vertices[v0][0];
      const y0 = vertices[v0][1];
      const x1 = vertices[v1][0];
      const y1 = vertices[v1][1];

      const segmentDx = x1 - x0;
      const segmentDy = y1 - y0;
      const segmentLen = length(segmentDx, segmentDy);
      const segmentDxHat = segmentDx / segmentLen;
      const segmentDyHat = segmentDy / segmentLen;
      const pointDx = x - x0;
      const pointDy = y - y0;

      const t = clamp(
        dot(pointDx, pointDy, segmentDxHat, segmentDyHat) / segmentLen,
        0,
        1
      );
      const nearestX = x0 + segmentDx * t;
      const nearestY = y0 + segmentDy * t;

      const distance = length(x - nearestX, y - nearestY);
      if (distance < thickness / 2) {
        scene.particles.push({
          x,
          y,
          mass: params.restDensity * params.particleVolume,
          phase,
          vx,
          vy,
        });
        break;
      }
    }
  });
};

export const fillRect = ({
  scene,
  params,
  phase,
  x0,
  y0,
  x1,
  y1,
  vx = 0,
  vy = 0,
}: {
  scene: Scene;
  params: Params;
  phase: number;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  vx?: number;
  vy?: number;
}) => {
  forPosInRect({params, x0, y0, x1, y1}, (x, y) => {
    scene.particles.push({
      x,
      y,
      mass: params.restDensity * params.particleVolume,
      phase,
      vx,
      vy,
    });
  });
};
