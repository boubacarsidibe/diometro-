import { z } from "zod";

const text = (max: number) => z.string().trim().max(max);
const optionalDate = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .pipe(z.union([z.null(), z.iso.date()]));

export const STATUTS = ["En service", "Hors service", "En réparation", "Réformé"] as const;
export const INTERVENTION_TYPES = ["Étalonnage", "Vérification", "Réparation", "Ajustage"] as const;
export const RESULTATS = ["Conforme", "Non conforme", "Conforme avec réserve"] as const;
export const ROLES = ["admin", "responsable", "consultation"] as const;

export const passwordSchema = z
  .string()
  .min(12, "12 caractères minimum")
  .max(128)
  .regex(/[a-z]/, "Ajoutez une minuscule")
  .regex(/[A-Z]/, "Ajoutez une majuscule")
  .regex(/\d/, "Ajoutez un chiffre");

export const loginSchema = z.object({
  email: z.email("Email invalide").max(254),
  password: z.string().min(1).max(128),
});

export const registerSchema = z.object({
  email: z.email("Email invalide").max(254),
  password: passwordSchema,
});

export const onboardingSchema = z.object({
  company: text(120).min(2, "Nom d'entreprise trop court"),
  displayName: text(120).min(2, "Nom trop court"),
});

export const instrumentSchema = z
  .object({
    ref: text(60).min(1, "Référence requise"),
    designation: text(200).min(1, "Désignation requise"),
    type_mesure: text(100),
    batiment: text(100),
    zone: text(100),
    statut: z.enum(STATUTS),
    date_etalonnage: optionalDate,
    date_prochaine: optionalDate,
    frequence_mois: z
      .string()
      .trim()
      .transform((v) => (v === "" ? null : Number(v)))
      .pipe(z.union([z.null(), z.number().int().min(1).max(120)])),
    commentaires: text(2000),
  })
  .refine((v) => !v.date_etalonnage || !v.date_prochaine || v.date_prochaine >= v.date_etalonnage, {
    message: "La prochaine échéance doit suivre le dernier étalonnage",
    path: ["date_prochaine"],
  });

export const interventionSchema = z.object({
  instrument_id: z.uuid(),
  date: z.iso.date(),
  type: z.enum(INTERVENTION_TYPES),
  resultat: z.enum(RESULTATS),
  prestataire: text(200),
  ref_certificat: text(100),
  observation: text(2000),
});

export const memberSchema = z.object({
  user_id: z.uuid(),
  role: z.enum(ROLES),
  active: z.enum(["true", "false"]).transform((v) => v === "true"),
});

export const inviteSchema = z.object({
  email: z.email("Email invalide").max(254),
  displayName: text(120).min(2, "Nom trop court"),
  role: z.enum(ROLES),
});

export const emailSchema = z.object({ email: z.email("Email invalide").max(254) });
export const newPasswordSchema = z.object({ password: passwordSchema });

export const mfaCodeSchema = z.string().regex(/^\d{6}$/, "Code à 6 chiffres");

export type InstrumentInput = z.infer<typeof instrumentSchema>;
