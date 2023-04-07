import '../../src/index.css';
import '../../src/reset.css';
import {
  engineDraw,
  engineInit,
  engineResetScene,
  engineStep,
} from '../../src/engine';
import {createScene, fillRect, makeDamBreak, makeWalls} from '../../src/scene';
import {PHASE_FLUID} from '../../src/constants';

const nWarmup = 20;
const nSamples = 50;

const runBenchmark = (engine) => {
  let clockMs = 1;

  const {params} = engine;
  const scene = createScene();
  makeWalls({scene, params});
  fillRect({
    scene,
    params,
    phase: PHASE_FLUID,
    x0: 0.01,
    y0: 0.5,
    x1: 0.2,
    y1: 0.99,
  });
  engineResetScene(engine, scene);

  engineStep(engine, {clockMs});
  engineDraw(engine);

  // warmup
  for (let i = 0; i < nWarmup; ++i) {
    engineStep(engine, {clockMs: ++clockMs});
  }
  const t0 = Date.now();
  // benchmark
  for (let i = 0; i < nSamples; ++i) {
    engineStep(engine, {clockMs: ++clockMs});
  }
  const sampleTime = (Date.now() - t0) / nSamples;
  console.log(sampleTime);
  engineDraw(engine);
};

const init = () => {
  const engine = engineInit({
    containerSelector: '#container',
    clockMs: 0,
  });

  const starter = document.createElement('button');
  starter.innerText = 'start';
  starter.addEventListener(
    'click',
    () => {
      runBenchmark(engine);
    },
    false
  );
  document.getElementById('container')!.parentElement!.appendChild(starter);
};
init();
