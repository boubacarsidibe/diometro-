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
  prestataire_id: z.union([z.literal("").transform(() => null), z.uuid()]).optional().transform((v) => v ?? null),
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

const checkbox = z
  .string()
  .optional()
  .transform((v) => v === "on" || v === "true");
const emptyOrEmail = z.union([z.literal(""), z.email("Email invalide").max(254)]);
const emptyOrUrl = z
  .string()
  .trim()
  .max(300)
  .refine((v) => v === "" || /^https?:\/\/[^\s]+$/i.test(v), "Adresse web invalide (http:// ou https://)");

export const PRESTATAIRE_TYPES = ["Étalonnage externe", "Maintenance", "Fabricant", "Autre"] as const;
export const ATTACHMENT_KINDS = ["certificat", "fiche_de_vie", "procedure", "photo", "autre"] as const;
export const ATTACHMENT_MIMES = [
  "application/pdf", "image/png", "image/jpeg", "image/webp",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

export const prestataireSchema = z.object({
  nom: text(200).min(1, "Nom requis"),
  type: z.enum(PRESTATAIRE_TYPES),
  domaines: z
    .string()
    .max(600)
    .transform((v) => [...new Set(v.split(",").map((d) => d.trim()).filter(Boolean))])
    .pipe(z.array(z.string().max(60)).max(20, "20 domaines maximum")),
  cofrac: checkbox,
  ref_cofrac: text(100),
  adresse: text(300),
  telephone: text(40),
  email: emptyOrEmail,
  site_web: emptyOrUrl,
  contact_nom: text(120),
  contact_fonction: text(120),
  delai_moyen_jours: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : Number(v)))
    .pipe(z.union([z.null(), z.number().int().min(0).max(365)])),
  note_interne: z.coerce.number().int().min(0).max(5),
  actif: checkbox,
  commentaires: text(2000),
});

export const brandingSchema = z.object({
  name: text(120).min(2, "Nom trop court"),
  accent: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Couleur invalide"),
  alerts_enabled: checkbox,
});

export const inventoryNoteSchema = z.object({ note: text(500) });

export const uploadRequestSchema = z.object({
  instrument_id: z.uuid(),
  filename: z.string().trim().min(1).max(200),
  mime: z.enum(ATTACHMENT_MIMES),
  size: z.number().int().min(1).max(MAX_ATTACHMENT_BYTES),
  kind: z.enum(ATTACHMENT_KINDS),
});
export const registerAttachmentSchema = z.object({
  instrument_id: z.uuid(),
  object_id: z.uuid(),
  filename: z.string().trim().min(1).max(200),
  kind: z.enum(ATTACHMENT_KINDS),
});

export const platformTenantSchema = z.object({
  tenant_id: z.uuid(),
  status: z.enum(["active", "blocked"]),
  plan: z.enum(["essai", "standard", "premium"]),
  expires: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v))
    .pipe(z.union([z.null(), z.iso.date()])),
});
