export type PrimaryParams = {
  cellResolutionX: number;
  cellResolutionY: number;
  dimension: 2;
  get mode(): 'cpu' | 'webgl';
  gravity: [number, number];
  hSmoothing: number;
  logTimestep: number;
  metaballScale: number;
  metaballStretch: number;
  metaballThreshold: number;
  particleRadius: number;
  particleRestitution: number;
  renderMode: 'simple' | 'metaballs';
  restDensity: number;
  stiffness: number;
  substeps: number;
  viscosity: number;
  wallRestitution: number;
  worldHeight: number;
  worldWidth: number;
};

export type DerivedParams = {
  get eta(): number;
  get sigma(): number;
  get cellWidth(): number;
  get cellHeight(): number;
  get collisionDistance(): number;
  get particleVolume(): number;
};

export type Params = PrimaryParams & DerivedParams;

export const withDerived = (params: PrimaryParams): Params => ({
  ...params,
  get eta() {
    return 0.01 * this.hSmoothing ** 2;
  },
  get sigma() {
    return 40 / (7 * Math.PI * this.hSmoothing ** 2);
  },
  get cellWidth() {
    return this.worldWidth / this.cellResolutionX;
  },
  get cellHeight() {
    return this.worldHeight / this.cellResolutionY;
  },
  get collisionDistance() {
    return this.particleRadius; // TODO: based on rest density
  },
  get particleVolume() {
    return (2 * this.particleRadius) ** 2;
  },
});

const searchParams = new URL(document.location.href).searchParams;

export const makeDefaultParams = (): Params => {
  return withDerived({
    dimension: 2,
    cellResolutionX: 40,
    cellResolutionY: 40,
    get mode() {
      return searchParams.has('cpu') ? 'cpu' : 'webgl';
    },
    gravity: [0, 0.5],
    hSmoothing: 0.03,
    logTimestep: -1.7,
    metaballScale: 4.0,
    metaballStretch: 2.0,
    metaballThreshold: 0.5,
    particleRestitution: 0.9,
    particleRadius: 0.005,
    renderMode: 'simple',
    restDensity: 10000,
    stiffness: 1.0,
    substeps: 2,
    viscosity: 0.001,
    wallRestitution: 0.4,
    worldHeight: 1,
    worldWidth: 1,
  });
};
