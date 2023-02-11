import {Pane} from 'tweakpane';
import {Params} from './params';

export const createUi = (params: Params) => {
  const pane = new Pane();
  const root = pane.addFolder({title: 'settings'});
  root.addInput(params, 'hSmoothing', {min: 0});
  root.addInput(params, 'particleRadius', {min: 0});
  root.addInput(params, 'restDensity', {min: 1});
  root.addInput(params, 'stiffness', {min: 0});
  root.addInput(params, 'viscosity', {min: 0});
};
