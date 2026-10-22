// Étalonnage de pipettes par pesée — NF EN ISO 8655, masse volumique de l'eau Tanaka/CIPM,
// incertitude GUM (4 niveaux). Formules reprises à l'identique de l'ancienne version.

export type PipetteInput = {
  vnom: number; ta: number; p: number; te: number; tv: number; alpha: number; emt: number;
  resBal: number; resTh: number; resBaro: number;
  h: number | null; useHumidite: boolean; masses: number[];
};

export type PipetteResult = {
  n: number; mMoy: number; sM: number; rhoE: number; rhoA: number; Z: number; Y: number; V20: number;
  errAbs: number; errPct: number; cvPct: number; ucV20: number; UV20: number; conforme: boolean;
};

// g/cm³
export function rhoEau(t: number): number {
  const a0 = 999.83952, a1 = 16.945176, a2 = -7.9870401e-3, a3 = -46.170461e-6;
  const a4 = 105.56302e-9, a5 = -280.54253e-12, b1 = 16.879850e-3;
  return (a0 + a1 * t + a2 * t * t + a3 * t ** 3 + a4 * t ** 4 + a5 * t ** 5) / (1 + b1 * t) / 1000;
}

// g/cm³ — formule CIPM simplifiée (OIML R111 / EURAMET CG-18)
export function rhoAir(ta: number, pMbar: number, h: number | null, useHumidite: boolean): number {
  if (useHumidite && h !== null && !Number.isNaN(h)) {
    return (0.34848 * pMbar - 0.009 * h * Math.exp(0.061 * ta)) / (273.15 + ta) / 1000;
  }
  return (0.34848 * pMbar) / (273.15 + ta) / 1000;
}

export function computePipette(i: PipetteInput): PipetteResult | null {
  const masses = i.masses.filter((m) => Number.isFinite(m));
  if (masses.length < 2 || !Number.isFinite(i.vnom) || !Number.isFinite(i.te) || !Number.isFinite(i.ta)) return null;

  const n = masses.length;
  const mMoy = masses.reduce((a, b) => a + b, 0) / n;
  const variance = masses.reduce((a, b) => a + (b - mMoy) ** 2, 0) / (n - 1);
  const sM = Math.sqrt(variance);

  const rhoE = rhoEau(i.te);
  const rhoA = rhoAir(i.ta, i.p, i.h, i.useHumidite);
  const rhoPoids = 8.0;
  const Z = (1 / (rhoE - rhoA)) * (1 - rhoA / rhoPoids);
  const Y = 1 - i.alpha * (i.tv - 20);
  const V20 = mMoy * Z * Y;

  const errAbs = V20 - i.vnom;
  const errPct = (errAbs / i.vnom) * 100;
  const cvPct = ((sM * Z) / V20) * 100;

  // Budget d'incertitude (GUM)
  const uMrep = sM / Math.sqrt(n);
  const uMres = i.resBal / 2 / Math.sqrt(3);
  const uM = Math.sqrt(uMrep ** 2 + uMres ** 2);
  const uTe = i.resTh / 2 / Math.sqrt(3);
  const uTv = i.resTh / 2 / Math.sqrt(3);
  const uTa = i.resTh / 2 / Math.sqrt(3);
  const uAlpha = i.alpha * 0.1;
  const deriv = (f: (x: number) => number, x: number, h = 1e-4) => (f(x + h) - f(x - h)) / (2 * h);
  const uRhoE = Math.abs(deriv(rhoEau, i.te)) * uTe;
  const uZ = Math.abs(-(1 / (rhoE - rhoA) ** 2) * (1 - rhoA / rhoPoids)) * uRhoE;
  const uY = Math.sqrt(((i.tv - 20) * uAlpha) ** 2 + (i.alpha * uTv) ** 2);
  const dVdm = Z * Y, dVdZ = mMoy * Y, dVdY = mMoy * Z;
  const ucV20 = Math.sqrt((dVdm * uM) ** 2 + (dVdZ * uZ) ** 2 + (dVdY * uY) ** 2);
  const UV20 = 2 * ucV20; // k = 2

  // uRhoA, uP : calculés dans l'ancienne version mais sans effet sur le résultat (non propagés).
  void uTa;

  return { n, mMoy, sM, rhoE, rhoA, Z, Y, V20, errAbs, errPct, cvPct, ucV20, UV20, conforme: Math.abs(errPct) <= i.emt };
}
