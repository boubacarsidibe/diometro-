"use client";
import { useActionState, useEffect, useState } from "react";
import { PLANS } from "@/lib/schemas";
import { fmtDate } from "@/lib/dates";
import { daysSince, daysUntil, planName, relanceMessage, type ConsoleTenant } from "@/lib/console";
import { sendRelance, setTenant } from "@/app/(console)/admin/actions";

function useEscape(onClose: () => void) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
}

/** Bouton « Gérer » + tiroir de modification de l'abonnement. */
export function ManageButton({ t, today, label = "Gérer", primary }: { t: ConsoleTenant; today: string; label?: string; primary?: boolean }) {
  const [open, setOpen] = useState(false);
  return (<>
    <button type="button" className={`cs-btn small${primary ? " primary" : ""}`} onClick={() => setOpen(true)}>{label}</button>
    {open && <ManageDrawer t={t} today={today} onClose={() => setOpen(false)} />}
  </>);
}

/** Bouton « Relancer » + tiroir d'e-mail pré-rempli selon la raison de la relance. */
export function RelanceButton({ t, today, primary }: { t: ConsoleTenant; today: string; primary?: boolean }) {
  const [open, setOpen] = useState(false);
  return (<>
    <button type="button" className={`cs-btn small${primary ? " primary" : ""}`} onClick={() => setOpen(true)} disabled={!t.admin_email} title={t.admin_email ? undefined : "Aucune adresse d'administrateur connue"}>Relancer</button>
    {open && <RelanceDrawer t={t} today={today} onClose={() => setOpen(false)} />}
  </>);
}

export function ManageDrawer({ t, today, onClose }: { t: ConsoleTenant; today: string; onClose: () => void }) {
  const [state, formAction, pending] = useActionState(setTenant, {});
  const [plan, setPlan] = useState(t.plan);
  const [max, setMax] = useState(t.max_instruments == null ? "" : String(t.max_instruments));
  const [end, setEnd] = useState(t.plan_expires_at ?? "");
  useEscape(onClose);
  const extend = (n: number) => {
    const base = end && daysUntil(end, today) > 0 ? end : today;
    const d = new Date(base + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); setEnd(d.toISOString().slice(0, 10));
  };
  const idle = daysSince(t.last_sign_in_at, today);
  return (
    <>
      <div className="cs-scrim" onClick={onClose} />
      <aside className="cs-drawer" role="dialog" aria-modal="true" aria-labelledby="cs-d-title">
        <header><div><h3 id="cs-d-title">{t.name}</h3><div className="cs-muted">Inscrite le {fmtDate(t.created_at)}</div></div><button type="button" className="cs-btn small" onClick={onClose}>Fermer</button></header>
        <form action={formAction} className="cs-d-body">
          <input type="hidden" name="tenant_id" value={t.id} />
          <div className="cs-d-stats">
            <div><b>{t.users}</b><small>utilisateurs</small></div>
            <div><b>{t.instruments}</b><small>instruments</small></div>
            <div><b>{idle === null ? "—" : idle === 0 ? "Auj." : `${idle} j`}</b><small>dernière connexion</small></div>
          </div>
          {t.admin_email && <p className="cs-muted">Administrateur : <span className="cs-sel">{t.admin_email}</span></p>}
          <label className="cs-field">Statut du compte
            <select name="status" className="cs-input" defaultValue={t.status}><option value="active">Actif</option><option value="blocked">Bloqué</option></select>
          </label>
          <label className="cs-field">Formule
            <select name="plan" className="cs-input" value={plan} onChange={(e) => { setPlan(e.target.value); const p = PLANS.find((x) => x.id === e.target.value); setMax(p?.instruments == null ? "" : String(p.instruments)); }}>
              {PLANS.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}
            </select>
          </label>
          <label className="cs-field">Limite d&apos;instruments
            <input name="max_instruments" type="number" min={0} className="cs-input" value={max} onChange={(e) => setMax(e.target.value)} placeholder="Illimité" />
          </label>
          <label className="cs-field">Fin d&apos;abonnement
            <input name="expires" type="date" className="cs-input" value={end} onChange={(e) => setEnd(e.target.value)} />
          </label>
          <div className="cs-muted">Prolonger : <button type="button" className="cs-btn small" onClick={() => extend(30)}>+ 30 jours</button> <button type="button" className="cs-btn small" onClick={() => extend(365)}>+ 1 an</button></div>
          <p className="cs-hint">Chaque modification est enregistrée dans le journal, avec l&apos;état avant et après.</p>
          {state.error && <p className="cs-err" role="alert">{state.error}</p>}
          {state.ok && <p className="cs-ok" role="status">{state.ok}</p>}
          <div className="cs-d-actions"><button type="button" className="cs-btn" onClick={onClose}>Fermer</button><button className="cs-btn primary" disabled={pending}>{pending ? "Enregistrement…" : "Appliquer"}</button></div>
        </form>
      </aside>
    </>
  );
}

function RelanceDrawer({ t, today, onClose }: { t: ConsoleTenant; today: string; onClose: () => void }) {
  const [state, formAction, pending] = useActionState(sendRelance, {});
  const m = relanceMessage(t, today, planName);
  useEscape(onClose);
  return (
    <>
      <div className="cs-scrim" onClick={onClose} />
      <aside className="cs-drawer" role="dialog" aria-modal="true" aria-labelledby="cs-r-title">
        <header><div><h3 id="cs-r-title">Relancer {t.name}</h3><div className="cs-muted">E-mail à l&apos;administrateur de l&apos;entreprise</div></div><button type="button" className="cs-btn small" onClick={onClose}>Fermer</button></header>
        <form action={formAction} className="cs-d-body">
          <input type="hidden" name="tenant_id" value={t.id} />
          <p className="cs-muted">Destinataire : <span className="cs-sel">{t.admin_email ?? "inconnu"}</span></p>
          <label className="cs-field">Objet
            <input name="subject" className="cs-input" defaultValue={m.subject} maxLength={150} required />
          </label>
          <label className="cs-field">Message
            <textarea name="body" className="cs-input cs-mail" rows={12} defaultValue={m.body} maxLength={4000} required />
          </label>
          <p className="cs-hint">Votre nom et « DIOMETRO » sont ajoutés en signature. Les réponses arrivent sur votre adresse. La relance est notée dans le journal.</p>
          {state.error && <p className="cs-err" role="alert">{state.error}</p>}
          {state.ok && <p className="cs-ok" role="status">{state.ok}</p>}
          <div className="cs-d-actions"><button type="button" className="cs-btn" onClick={onClose}>Fermer</button><button className="cs-btn primary" disabled={pending || !!state.ok}>{pending ? "Envoi…" : state.ok ? "Envoyé" : "Envoyer"}</button></div>
        </form>
      </aside>
    </>
  );
}
