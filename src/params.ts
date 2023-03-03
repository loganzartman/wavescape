export type PrimaryParams = {
  cellResolutionX: number;
  cellResolutionY: number;
  dimension: 2;
  get mode(): 'cpu' | 'webgl';
  get n(): number;
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
});

const scaleByN = (
  defaultN: number,
  actualN: number,
  params: PrimaryParams
): PrimaryParams => {
  const f = actualN / defaultN;
  return {
    ...params,
    particleRadius: params.particleRadius / f ** 0.5,
    restDensity: params.restDensity * f,
  };
};

const searchParams = new URL(document.location.href).searchParams;

export const makeDefaultParams = (): Params => {
  const n = searchParams.has('n')
    ? Number.parseInt(searchParams.get('n'))
    : 1000;
  return withDerived(
    scaleByN(500, n, {
      dimension: 2,
      cellResolutionX: 40,
      cellResolutionY: 40,
      get mode() {
        return searchParams.has('cpu') ? 'cpu' : 'webgl';
      },
      get n() {
        return n;
      },
      gravity: [0, 0.5],
      hSmoothing: 0.05,
      logTimestep: -1.7,
      metaballScale: 4.0,
      metaballStretch: 2.0,
      metaballThreshold: 0.5,
      particleRadius: 0.01,
      particleRestitution: 0.9,
      renderMode: 'metaballs',
      restDensity: 3000,
      stiffness: 1.0,
      substeps: 1,
      viscosity: 0.0015,
      wallRestitution: 0.4,
      worldHeight: 1,
      worldWidth: 1,
    })
  );
};
