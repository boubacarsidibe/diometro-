import type { Metadata } from "next";
import { INDEXABLE } from "@/lib/seo";
import { AuthSwitcher } from "@/components/auth/AuthCards";
import { TRIAL_DAYS } from "@/lib/plans";
import { LoginPane, SignupPane } from "../panes";

export const metadata: Metadata = { title: "Essai gratuit · DIOMETRO", description: "Inscrivez votre entreprise sur DIOMETRO : 30 jours d'essai gratuit, toutes les fonctionnalités de suivi métrologique.", robots: INDEXABLE };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ formule?: string }> }) {
  const { formule } = await searchParams;
  return <AuthSwitcher initial="signup" trialDays={TRIAL_DAYS} login={<LoginPane />} signup={<SignupPane formule={formule} />} />;
}
