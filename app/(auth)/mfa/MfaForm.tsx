"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { mfaCodeSchema } from "@/lib/schemas";
import { Notice } from "@/components/Field";

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

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    if (!mfaCodeSchema.safeParse(code).success || !factorId) return setError("Saisissez le code à 6 chiffres.");
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
    setBusy(false);
    if (error) return setError("Code incorrect ou expiré.");
    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={submit} noValidate>
      <p className="lead">
        {enroll ? "Scannez ce QR code avec votre application d'authentification, puis saisissez le code." : "Saisissez le code de votre application d'authentification."}
      </p>
      <Notice error={error} />
      {enroll && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="qr" src={enroll.qr} alt="QR code d'enrôlement TOTP" width={180} height={180} />
          <p className="helper">Saisie manuelle : <span className="secret">{enroll.secret}</span></p>
        </>
      )}
      <div className="field" style={{ marginTop: 14 }}>
        <label htmlFor="code">Code à 6 chiffres</label>
        <input id="code" className="input" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} required />
      </div>
      <div className="form-actions">
        <button className="btn primary" disabled={busy || !factorId}>{busy ? "Vérification…" : "Valider"}</button>
      </div>
    </form>
  );
}
