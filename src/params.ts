export type PrimaryParams = {
  dimension: 2;
  get mode(): 'cpu' | 'webgl';
  get n(): number;
  particleRadius: number;
  viscosity: number;
  stiffness: number;
  restDensity: number;
  hSmoothing: number;
  worldWidth: number;
  worldHeight: number;
  cellResolutionX: number;
  cellResolutionY: number;
  particleRestitution: number;
  wallRestitution: number;
  renderMode: 'simple' | 'metaballs';
  metaballScale: number;
  metaballThreshold: number;
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
      get mode() {
        return searchParams.has('cpu') ? 'cpu' : 'webgl';
      },
      get n() {
        return n;
      },
      particleRadius: 0.01,
      viscosity: 0.0015,
      stiffness: 1.0,
      restDensity: 3000,
      hSmoothing: 0.05,
      worldWidth: 1,
      worldHeight: 1,
      cellResolutionX: 40,
      cellResolutionY: 40,
      particleRestitution: 0.9,
      wallRestitution: 0.4,
      renderMode: 'metaballs',
      metaballScale: 3.0,
      metaballThreshold: 0.5,
    })
  );
};
