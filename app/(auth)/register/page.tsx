import { AuthSwitcher } from "@/components/auth/AuthCards";
import { TRIAL_DAYS } from "@/lib/plans";
import { LoginPane, SignupPane } from "../panes";

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ formule?: string }> }) {
  const { formule } = await searchParams;
  return <AuthSwitcher initial="signup" trialDays={TRIAL_DAYS} login={<LoginPane />} signup={<SignupPane formule={formule} />} />;
}
