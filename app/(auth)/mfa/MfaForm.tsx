"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { mfaCodeSchema } from "@/lib/schemas";
import { OtpInput, OtpShell, OtpSubmit } from "@/components/auth/Otp";
import { rememberTotp } from "./actions";

type Enrollment = { factorId: string; qr: string; secret: string };

export function MfaForm() {
  const router = useRouter();
  const [factorId, setFactorId] = useState<string | null>(null);
  const [enroll, setEnroll] = useState<Enrollment | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) return setError("Impossible de charger la double authentification.");
      const verified = data.totp.find((f) => f.status === "verified");
      if (verified) return setFactorId(verified.id);
      // Nettoie une inscription abandonnée avant d'en démarrer une nouvelle.
      await Promise.all(data.all.filter((f) => f.status === "unverified").map((f) => supabase.auth.mfa.unenroll({ factorId: f.id })));
      const res = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: `DIOMETRO ${Date.now()}` });
      if (res.error) return setError("Impossible de démarrer l'enrôlement.");
      setFactorId(res.data.id);
      setEnroll({ factorId: res.data.id, qr: res.data.totp.qr_code, secret: res.data.totp.secret });
    })();
  }, []);

  async function verify(value: string) {
    setError(undefined);
    if (!mfaCodeSchema.safeParse(value).success || !factorId) return setError("Saisissez le code à 6 chiffres.");
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: value });
    if (error) { setBusy(false); setCode(""); return setError("Code incorrect ou expiré."); }
    await rememberTotp();
    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <OtpShell title="Vérifier le" em="code"
      subtitle={enroll ? "Scannez ce QR code avec votre application d'authentification, puis saisissez le code à 6 chiffres affiché." : "Saisissez le code à 6 chiffres affiché par votre application d'authentification."}>
      <form onSubmit={(e) => { e.preventDefault(); void verify(code); }} noValidate className="otp-form">
        {error && <div className="otp-alert" role="alert">{error}</div>}
        {enroll && (
          <div className="otp-enroll">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="qr" src={enroll.qr} alt="QR code d'enrôlement TOTP" width={160} height={160} />
            <p className="otp-hint">Saisie manuelle : <span className="secret">{enroll.secret}</span></p>
          </div>
        )}
        <OtpInput value={code} onChange={setCode} invalid={Boolean(error)} disabled={busy || !factorId} onComplete={(v) => { if (!busy) void verify(v); }} />
        <OtpSubmit pending={busy} disabled={!factorId || code.length !== 6} />
      </form>
    </OtpShell>
  );
}
