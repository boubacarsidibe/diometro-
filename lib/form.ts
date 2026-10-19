import type { ZodType } from "zod";

export type FormState = { error?: string; fieldErrors?: Record<string, string>; ok?: string };

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
  return { state: { error: "Veuillez corriger les champs signalés.", fieldErrors } };
}
