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

const buildingList = z
  .string()
  .max(1500)
  .transform((v) => [...new Set(v.split(/[,\n]/).map((b) => b.trim()).filter(Boolean))])
  .pipe(z.array(z.string().max(100)).max(50, "50 bâtiments maximum"));

export const onboardingSchema = z.object({
  company: text(120).min(2, "Nom d'entreprise trop court"),
  displayName: text(120).min(2, "Nom trop court"),
  sector: text(100),
  phone: text(40),
  buildings: buildingList,
});

export const CONFORMITES = ["Oui", "Non", "À vérifier"] as const;
export const ETALONNAGE_TYPES = ["Interne", "Externe", "Interne et externe", "À définir"] as const;
const emptyOrHttp = z.string().trim().max(500).refine((v) => v === "" || /^https?:\/\/[^\s]+$/i.test(v), "Adresse web invalide (http:// ou https://)");

export const instrumentSchema = z
  .object({
    conformite: z.enum(CONFORMITES).default("À vérifier"),
    mode_utilisation: text(200).default(""),
    graduation: text(100).default(""),
    tolerance: text(100).default(""),
    proprietaire: text(120).default(""),
    stockage: text(200).default(""),
    etalonnage_type: z.enum(ETALONNAGE_TYPES).default("À définir"),
    origine_frequence: text(200).default(""),
    raccordement: text(200).default(""),
    fiche_link: emptyOrHttp.default(""),
    certificat_link: emptyOrHttp.default(""),
    procedure_link: emptyOrHttp.default(""),
    prestataire_id: z.union([z.literal("").transform(() => null), z.uuid()]).optional().transform((v) => v ?? null),
    catalog_id: text(60).default(""),
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
  mode: z.enum(["Interne", "Externe"]).default("Externe"),
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
  phone: text(40).default(""),
  user_id: z.uuid(),
  role: z.enum(ROLES),
  active: z.enum(["true", "false"]).transform((v) => v === "true"),
});

export const inviteSchema = z.object({
  phone: text(40).default(""),
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
  tarif_horaire: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : Number(v.replace(",", "."))))
    .pipe(z.union([z.null(), z.number().min(0).max(99999999)])),
  devise: z.enum(["XOF", "EUR", "USD"]).default("XOF"),
  grille_tarifs: z
    .string()
    .max(4000)
    .transform((v, ctx) => {
      // Une ligne par tarif : « type de mesure ; prix ; unité »
      const out: { typeMesure: string; prix: number; unite: string }[] = [];
      for (const line of v.split("\n").map((l) => l.trim()).filter(Boolean)) {
        const [typeMesure = "", prix = "", unite = ""] = line.split(";").map((x) => x.trim());
        const n = Number(prix.replace(",", "."));
        if (!typeMesure || prix === "" || !Number.isFinite(n) || n < 0) {
          ctx.addIssue({ code: "custom", message: `Ligne invalide : « ${line.slice(0, 40)} »` });
          return z.NEVER;
        }
        out.push({ typeMesure: typeMesure.slice(0, 100), prix: n, unite: unite.slice(0, 40) });
      }
      return out;
    })
    .pipe(z.array(z.object({ typeMesure: z.string(), prix: z.number(), unite: z.string() })).max(50, "50 lignes maximum")),
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
  accreditation_label: text(60).min(1, "Organisme requis"),
  currency: z.enum(["XOF", "EUR", "USD"]),
  sector: text(100),
  phone: text(40),
  buildings: buildingList,
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

export const PLANS = [
  { id: "essai", nom: "Essai", instruments: 50 },
  { id: "starter", nom: "Starter", instruments: 50 },
  { id: "standard", nom: "Standard", instruments: 200 },
  { id: "pro", nom: "Pro", instruments: 500 },
  { id: "entreprise", nom: "Entreprise", instruments: 1000 },
  { id: "grandcompte", nom: "Grand Compte", instruments: 2000 },
  { id: "custom", nom: "Sur-mesure", instruments: null },
] as const;
export const PLAN_IDS = PLANS.map((p) => p.id) as unknown as [string, ...string[]];

export const platformTenantSchema = z.object({
  tenant_id: z.uuid(),
  status: z.enum(["active", "blocked"]),
  plan: z.enum(PLAN_IDS),
  max_instruments: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : Number(v)))
    .pipe(z.union([z.null(), z.number().int().min(0).max(1000000)])),
  expires: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v))
    .pipe(z.union([z.null(), z.iso.date()])),
});
