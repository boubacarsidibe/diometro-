import { z } from "zod";

const n = (min: number, max: number) => z.number().finite().min(min).max(max);

export const pipetteSchema = z.object({
  vnom: n(0.0001, 1000), ta: n(-50, 100), p: n(300, 1300), te: n(0, 100), tv: n(-50, 100), alpha: n(0, 0.001), emt: n(0, 100),
  resBal: n(0, 1), resTh: n(0, 10), resBaro: n(0, 100),
  h: z.union([z.null(), n(0, 100)]), useHumidite: z.boolean(),
  masses: z.array(n(0, 100000)).min(2).max(20),
});

const readings = z.array(n(-300, 2000)).max(20);
export const pt100Schema = z.object({
  a: n(-1000, 1000), b: n(-1000, 1000), c: n(-1000, 1000), emt: n(0.0000001, 100),
  resLue: n(0, 100), resEt: n(0, 100), uEt: n(0, 100), uDerive: n(0, 100), uHomog: n(0, 100),
  modeRig: z.boolean(),
  points: z.array(z.object({ cons: z.union([z.null(), n(-300, 2000)]), vref: readings, vlue: readings })).min(1).max(10),
});

export const directSchema = z.object({
  emt: n(0.0000001, 1e9),
  points: z.array(z.object({ ref: n(-1e9, 1e9), lue: n(-1e9, 1e9) })).min(1).max(20),
});

export const CALC_KINDS = ["pipette", "pt100", "direct"] as const;
export type CalcKind = (typeof CALC_KINDS)[number];
