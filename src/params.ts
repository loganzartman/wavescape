export type PrimaryParams = {
  dimension: number;
  particleRadius: number;
  viscosity: number;
  stiffness: number;
  restDensity: number;
  hSmoothing: number;
};

export type DerivedParams = {
  get eta(): number;
  get sigma(): number;
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
});

export const makeDefaultParams = (): Params =>
  withDerived({
    dimension: 2,
    particleRadius: 0.01,
    viscosity: 0.002,
    stiffness: 1.0,
    restDensity: 3000,
    hSmoothing: 0.05,
  });
