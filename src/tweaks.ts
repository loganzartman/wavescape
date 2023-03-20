import {Pane} from 'tweakpane';
import * as TweakpaneEssentialsPlugin from '@tweakpane/plugin-essentials';
import {Params} from './params';
import {State} from './state';
import {FpsGraphBladeApi} from '@tweakpane/plugin-essentials';
import {COLOR_PRESSURE, COLOR_PRETTY, COLOR_VELOCITY} from './constants';

const pointProxy = (object: any, key: string) => {
  const dim = object[key].length;
  const proxy = {};
  const letters = ['x', 'y', 'z', 'w'];
  if (dim > 4) throw new Error('Point has more than 4 dimensions');
  for (let i = 0; i < dim; ++i) {
    Object.defineProperty(proxy, letters[i], {
      get() {
        return object[key][i];
      },
      set(val) {
        object[key][i] = val;
      },
      enumerable: true,
    });
  }
  return {[key]: proxy};
};

export const createTweaks = ({
  state,
  params,
  onReset,
}: {
  state: State;
  params: Params;
  onReset: () => void;
}): {fpsGraph: any} => {
  const pane = new Pane();
  pane.registerPlugin(TweakpaneEssentialsPlugin);

  const root = pane.addFolder({title: 'settings', expanded: false});

  const switcherTitle =
    params.mode === 'webgl' ? 'Switch to CPU (slow)' : 'Switch to GPU (faster)';
  root.addButton({title: switcherTitle}).on('click', () => {
    const url = new URL(window.location.href);
    if (params.mode === 'webgl') url.searchParams.set('cpu', '');
    else url.searchParams.delete('cpu');
    window.location.href = url.toString();
  });

  const stats = root.addFolder({title: 'stats', expanded: true});
  const fpsGraph = stats.addBlade({
    view: 'fpsgraph',
    label: 'fps',
    interval: 100,
    bufferSize: 20,
    min: 0,
    max: 300,
  });
  stats.addMonitor(state, 'capacity', {
    label: 'particles',
    format: (n) => String(n),
  });

  const scn = root.addFolder({title: 'scene', expanded: false});
  scn.addInput(params, 'particleRadius', {
    min: 1 / 400,
    max: 1 / 100,
  });
  scn.addButton({title: 'apply & reset'}).on('click', onReset);

  const time = root.addFolder({title: 'time', expanded: false});
  time.addInput(params, 'logTimestep', {min: -4, max: -1.4});
  time.addInput(params, 'autoSubstep');
  time.addInput(params, 'maxSubsteps', {min: 1, max: 20, step: 1});
  time.addInput(params, 'timestepLambda', {min: 0, max: 1});
  time.addInput(params, 'limitSpeed');

  const phys = root.addFolder({title: 'physics', expanded: false});
  phys.addInput(pointProxy(params, 'gravity'), 'gravity', {
    x: {min: -1, max: 1},
    y: {min: -1, max: 1},
  });
  phys.addInput(params, 'smoothingScale', {min: 0.5, max: 2.0, step: 0.1});
  phys.addInput(params, 'restDensity', {min: 1});
  phys.addInput(params, 'stiffness', {min: 0});
  phys.addInput(params, 'viscosity', {min: 0.00001, max: 0.01, step: 0.00001});

  const gfx = root.addFolder({title: 'graphics', expanded: false});
  gfx.addInput(params, 'renderMode', {
    options: {simple: 'simple', metaballs: 'metaballs'},
  });
  gfx.addInput(params, 'colorMode', {
    options: {
      pretty: COLOR_PRETTY,
      velocity: COLOR_VELOCITY,
      pressure: COLOR_PRESSURE,
    },
  });
  gfx.addInput(params, 'metaballScale', {min: 1, max: 8});
  gfx.addInput(params, 'metaballThreshold', {min: 0, max: 1});
  gfx.addInput(params, 'metaballStretch', {min: 0, max: 8});

  return {fpsGraph};
};

// here be dragons
const computeGraphRange = (graphBladeApi: any) => {
  const values = graphBladeApi?.controller_?.valueController?.value_?.value_;
  let min = values[0];
  let max = values[0];
  if (!isFinite(min)) min = 0;
  if (!isFinite(max)) max = 0;
  for (const v of values) {
    if (v < min) min = v;
    if (v > max) max = v;
  }
  return [min, max];
};

// https://github.com/cocopon/tweakpane/issues/371#issuecomment-1131843384
export const autoSetGraphRange = (graphBladeApi: any) => {
  const [, max] = computeGraphRange(graphBladeApi);
  graphBladeApi.controller_.valueController.graphC_.props_.set('minValue', 0);
  graphBladeApi.controller_.valueController.graphC_.props_.set(
    'maxValue',
    max * 1.2
  );
};
