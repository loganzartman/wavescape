import '../../src/index.css';
import '../../src/reset.css';
import {
  engineDraw,
  engineInit,
  engineResetScene,
  engineStep,
} from '../../src/engine';
import {createScene, fillRect, makeWalls} from '../../src/scene';
import {PHASE_FLUID} from '../../src/constants';
import {makeDefaultParams} from '../../src/params';

const warmupCount = 1;
const cycleCount = 3;
const nSamples = 100;

const init = () => {
  const params = makeDefaultParams();
  const engine = engineInit({
    containerSelector: '#container',
    clockMs: 0,
    params,
  });

  const runBenchmark = () => {
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

    const runCycle = () => {
      let clockMs = 1;
      engineResetScene(engine, scene);

      const t0 = Date.now();
      // benchmark
      for (let i = 0; i < nSamples; ++i) {
        engineStep(engine, {clockMs: ++clockMs});
      }
      return Date.now() - t0;
    };

    let totalTime = 0;
    for (let i = 0; i < warmupCount; ++i) runCycle();
    for (let i = 0; i < cycleCount; ++i) totalTime += runCycle();

    const sampleTime = totalTime / (nSamples * cycleCount);
    engineDraw(engine);
    return sampleTime;
  };

  (window as any).runBenchmark = runBenchmark;
};
init();
