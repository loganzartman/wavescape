export type PrimaryParams = {
  dimension: 2;
  particleRadius: number;
  viscosity: number;
  stiffness: number;
  restDensity: number;
  hSmoothing: number;
  worldWidth: number;
  worldHeight: number;
  cellResolutionX: number;
  cellResolutionY: number;
};

export type DerivedParams = {
  get eta(): number;
  get sigma(): number;
  get cellWidth(): number;
  get cellHeight(): number;
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

export const makeDefaultParams = ({n}: {n: number}): Params =>
  withDerived(
    scaleByN(500, n, {
      dimension: 2,
      particleRadius: 0.01,
      viscosity: 0.002,
      stiffness: 1.0,
      restDensity: 3000,
      hSmoothing: 0.05,
      worldWidth: 1,
      worldHeight: 1,
      cellResolutionX: 16,
      cellResolutionY: 16,
    })
  );
