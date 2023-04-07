import './reset.css';
import './index.css';
import {createScene, makeDamBreak} from './scene';
import {
  engineDraw,
  engineInit,
  engineResetScene,
  EngineState,
  engineStep,
} from './engine';
import {autoSetGraphRange, createTweaks} from './tweaks';

const reset = (engine: EngineState) => {
  const {params} = engine;
  const scene = createScene();
  makeDamBreak({params, scene});
  engineResetScene(engine, scene);
};

const initKeybinds = (engine: EngineState) => {
  addEventListener(
    'keydown',
    (event) => {
      if (event.code == 'Space') {
        engine.running = !engine.running;
      }
      if (event.code == 'KeyR') {
        reset(engine);
      }
      if (event.code == 'KeyS') {
        engine.step = true;
      }
    },
    false
  );
};

const init = () => {
  const engine = engineInit({
    containerSelector: '#container',
    clockMs: Date.now(),
  });
  reset(engine);

  initKeybinds(engine);

  const {fpsGraph} = createTweaks({
    params: engine.params,
    state: engine.state,
    onReset: () => {
      reset(engine);
    },
  });

  const frame = () => {
    fpsGraph.begin();
    engineStep(engine, {clockMs: Date.now()});
    engineDraw(engine);
    fpsGraph.end();
    autoSetGraphRange(fpsGraph);

    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
};

init();
