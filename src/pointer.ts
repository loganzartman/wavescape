import {length} from './util';

let pointerDown = false;
let pointerX = 0;
let pointerY = 0;
let lastPointerX = 0;
let lastPointerY = 0;
let pointerDx = 0;
let pointerDy = 0;

export const updatePointer = (realDt: number) => {
  pointerDx = (pointerX - lastPointerX) / realDt;
  pointerDy = (pointerY - lastPointerY) / realDt;
  lastPointerX = pointerX;
  lastPointerY = pointerY;
};

export const getPointerForce = (x: number, y: number) => {
  if (!pointerDown) {
    return [0, 0];
  }
  const mag = 20;
  const rad = 0.1;
  const dist = length(x - pointerX, y - pointerY);
  const f = 1 - Math.min(1, dist / rad);
  return [mag * pointerDx * f, mag * pointerDy * f];
};

export const screenToWorld = (x: number, y: number) => {
  const dim = Math.min(window.innerWidth, window.innerHeight);
  const worldX = (x - (window.innerWidth - dim) * 0.5) / dim;
  const worldY = (y - (window.innerHeight - dim) * 0.5) / dim;
  return [worldX, worldY];
};

export const getPointerPos = () => [pointerX, pointerY];

export const getPointerVel = () => [pointerDx, pointerDy];

export const getPointerDown = () => pointerDown;

export const initPointer = () => {
  addEventListener(
    'pointerdown',
    (event) => {
      pointerDown = true;
      const [worldX, worldY] = screenToWorld(event.pageX, event.pageY);
      lastPointerX = worldX;
      lastPointerY = worldY;
    },
    false
  );
  addEventListener(
    'pointerup',
    () => {
      pointerDown = false;
    },
    false
  );
  addEventListener(
    'pointermove',
    (event) => {
      const [worldX, worldY] = screenToWorld(event.pageX, event.pageY);
      pointerX = worldX;
      pointerY = worldY;
    },
    false
  );
};
