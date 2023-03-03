import {Pane} from 'tweakpane';
import {Params} from './params';

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

export const createUi = (params: Params) => {
  const pane = new Pane();

  const root = pane.addFolder({title: 'settings', expanded: false});

  root.addButton({title: 'Set particle count'}).on('click', () => {
    const url = new URL(window.location.href);
    const n = Number.parseInt(prompt('Particle count', String(params.n)));
    if (Number.isFinite(n)) {
      url.searchParams.set('n', String(n));
    }
    window.location.href = url.toString();
  });

  const switcherTitle =
    params.mode === 'webgl' ? 'Switch to CPU (slow)' : 'Switch to GPU (faster)';
  root.addButton({title: switcherTitle}).on('click', () => {
    const url = new URL(window.location.href);
    if (params.mode === 'webgl') url.searchParams.set('cpu', '');
    else url.searchParams.delete('cpu');
    window.location.href = url.toString();
  });

  const phys = root.addFolder({title: 'physics', expanded: true});
  phys.addInput(params, 'logTimestep', {min: -4, max: -1.4});
  phys.addInput(params, 'substeps', {min: 1, max: 10, step: 1});
  phys.addInput(pointProxy(params, 'gravity'), 'gravity', {
    x: {min: -1, max: 1},
    y: {min: -1, max: 1},
  });
  phys.addInput(params, 'hSmoothing', {min: 0});
  phys.addInput(params, 'particleRadius', {min: 0});
  phys.addInput(params, 'restDensity', {min: 1});
  phys.addInput(params, 'stiffness', {min: 0});
  phys.addInput(params, 'viscosity', {min: 0});

  const gfx = root.addFolder({title: 'graphics', expanded: true});
  gfx.addInput(params, 'renderMode', {
    options: {simple: 'simple', metaballs: 'metaballs'},
  });
  gfx.addInput(params, 'metaballScale', {min: 1, max: 8});
  gfx.addInput(params, 'metaballThreshold', {min: 0, max: 1});
  gfx.addInput(params, 'metaballStretch', {min: 0, max: 8});
};
