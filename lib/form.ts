import type { ZodType } from "zod";

export type FormState = { error?: string; fieldErrors?: Record<string, string>; ok?: string; values?: Record<string, string> };

// Valeurs à réafficher après une erreur : React vide les champs non contrôlés après chaque action.
// Les champs sensibles ne sont jamais renvoyés.
export function echoValues(formData: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of formData.entries()) {
    if (typeof v === "string" && !k.startsWith("$ACTION") && !/pass/i.test(k)) out[k] = v;
  }
  return out;
}

export function parseForm<T>(schema: ZodType<T>, formData: FormData): { data: T } | { state: FormState } {
  const raw: Record<string, FormDataEntryValue> = {};
  for (const [k, v] of formData.entries()) if (!k.startsWith("$ACTION")) raw[k] = v;
  const result = schema.safeParse(raw);
  if (result.success) return { data: result.data };
  const fieldErrors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = String(issue.path[0] ?? "form");
    fieldErrors[key] ??= issue.message;
  }
  return { state: { error: "Veuillez corriger les champs signalés.", fieldErrors, values: echoValues(formData) } };
}
