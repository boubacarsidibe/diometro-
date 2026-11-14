import { AuthSwitcher } from "@/components/auth/AuthCards";
import { TRIAL_DAYS } from "@/lib/plans";
import { LoginPane, SignupPane } from "../panes";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return <AuthSwitcher initial="login" trialDays={TRIAL_DAYS} login={<LoginPane error={error} />} signup={<SignupPane />} />;
}
