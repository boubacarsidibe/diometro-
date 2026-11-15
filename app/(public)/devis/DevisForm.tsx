"use client";
import Link from "next/link";
import { useActionState, useState } from "react";
import { DELAIS, FAMILLES, OUTILS, SECTEURS, TAILLES } from "@/lib/devis";
import { sendDevis, type DevisState } from "./actions";

function Err({ m }: { m?: string }) {
  return m ? <span className="field-error" role="alert">{m}</span> : null;
}

export function DevisForm({ formule }: { formule?: string }) {
  const [state, action, pending] = useActionState<DevisState, FormData>(sendDevis, {});
  const [copied, setCopied] = useState(false);
  const e = state.errors ?? {};
  const v = state.values ?? {};
  const s = (k: string) => (typeof v[k] === "string" ? (v[k] as string) : "");
  const fam = Array.isArray(v.familles) ? v.familles : [];

  if (state.ok) {
    return (
      <div className="card devis-done" role="status">
        <h2>Merci, votre demande est envoyée.</h2>
        <p>Nous revenons vers vous par e-mail rapidement. En attendant, vous pouvez essayer DIOMETRO gratuitement pendant 30 jours.</p>
        <div className="form-actions"><Link className="btn primary" href="/register">Démarrer l&apos;essai gratuit</Link><Link className="btn" href="/">Retour à l&apos;accueil</Link></div>
      </div>
    );
  }

  if (state.fallback) {
    const f = state.fallback;
    const mailto = `mailto:${f.to}?subject=${encodeURIComponent(f.subject)}&body=${encodeURIComponent(f.body)}`;
    return (
      <div className="card devis-done" role="status">
        <h2>Dernière étape : envoyez votre demande</h2>
        <p>Votre demande est prête. Cliquez ci-dessous pour l&apos;envoyer depuis votre messagerie, ou copiez-la et envoyez-la à <strong>{f.to}</strong>.</p>
        <pre className="devis-recap">{f.body}</pre>
        <div className="form-actions">
          <a className="btn primary" href={mailto}>Envoyer depuis ma messagerie</a>
          <button type="button" className="btn" onClick={async () => { try { await navigator.clipboard.writeText(`${f.subject}\n\n${f.body}`); setCopied(true); } catch { /* texte sélectionnable ci-dessus */ } }}>{copied ? "Copié" : "Copier la demande"}</button>
        </div>
      </div>
    );
  }

  return (
    <form key={state.n ?? 0} action={action} className="devis-form" noValidate>
      {state.error ? <div className="notice err">{state.error}</div> : null}
      {Object.keys(e).length ? <div className="notice err">Certains champs sont à compléter.</div> : null}
      <input type="text" name="site_web" tabIndex={-1} autoComplete="off" className="devis-trap" aria-hidden="true" />

      <fieldset className="card">
        <legend>Votre entreprise</legend>
        <div className="grid cols-2">
          <div className="field"><label htmlFor="d-ent">Entreprise *</label><input id="d-ent" className="input" name="entreprise" defaultValue={s("entreprise")} required autoComplete="organization" /><Err m={e.entreprise} /></div>
          <div className="field"><label htmlFor="d-sec">Secteur *</label><select id="d-sec" className="input" name="secteur" required defaultValue={s("secteur")}><option value="" disabled>Choisir…</option>{SECTEURS.map((s) => <option key={s}>{s}</option>)}</select><Err m={e.secteur} /></div>
          <div className="field"><label htmlFor="d-pays">Pays</label><input id="d-pays" className="input" name="pays" defaultValue={s("pays")} autoComplete="country-name" placeholder="Sénégal" /></div>
          <div className="field"><label htmlFor="d-ville">Ville</label><input id="d-ville" className="input" name="ville" defaultValue={s("ville")} autoComplete="address-level2" /></div>
          <div className="field"><label htmlFor="d-sites">Nombre de sites</label><input id="d-sites" className="input" name="sites" defaultValue={s("sites")} inputMode="numeric" placeholder="1" /></div>
        </div>
      </fieldset>

      <fieldset className="card">
        <legend>Vous</legend>
        <div className="grid cols-2">
          <div className="field"><label htmlFor="d-nom">Nom et prénom *</label><input id="d-nom" className="input" name="nom" defaultValue={s("nom")} required autoComplete="name" /><Err m={e.nom} /></div>
          <div className="field"><label htmlFor="d-fn">Fonction</label><input id="d-fn" className="input" name="fonction" defaultValue={s("fonction")} autoComplete="organization-title" placeholder="Responsable qualité, maintenance…" /></div>
          <div className="field"><label htmlFor="d-mail">E-mail professionnel *</label><input id="d-mail" className="input" name="email" defaultValue={s("email")} type="email" required autoComplete="email" /><Err m={e.email} /></div>
          <div className="field"><label htmlFor="d-tel">Téléphone ou WhatsApp</label><input id="d-tel" className="input" name="telephone" defaultValue={s("telephone")} type="tel" autoComplete="tel" /></div>
        </div>
      </fieldset>

      <fieldset className="card">
        <legend>Votre parc d&apos;instruments</legend>
        <div className="grid cols-2">
          <div className="field"><label htmlFor="d-taille">Nombre d&apos;instruments *</label><select id="d-taille" className="input" name="taille" required defaultValue={s("taille") || formule || ""}><option value="" disabled>Choisir…</option>{TAILLES.map((s) => <option key={s}>{s}</option>)}</select><Err m={e.taille} /></div>
          <div className="field"><label htmlFor="d-users">Nombre d&apos;utilisateurs prévus</label><input id="d-users" className="input" name="utilisateurs" defaultValue={s("utilisateurs")} inputMode="numeric" placeholder="3" /></div>
          <div className="field full">
            <span className="devis-label">Familles d&apos;instruments concernées</span>
            <div className="devis-chips">{FAMILLES.map((f) => <label key={f} className="devis-chip"><input type="checkbox" name="familles" value={f} defaultChecked={fam.includes(f)} /><span>{f}</span></label>)}</div>
          </div>
          <div className="field"><label htmlFor="d-outil">Comment suivez-vous votre parc aujourd&apos;hui ?</label><select id="d-outil" className="input" name="outil" defaultValue={s("outil")}><option value="">Choisir…</option>{OUTILS.map((s) => <option key={s}>{s}</option>)}</select></div>
          <div className="field"><label htmlFor="d-delai">Mise en place souhaitée</label><select id="d-delai" className="input" name="delai" defaultValue={s("delai")}><option value="">Choisir…</option>{DELAIS.map((s) => <option key={s}>{s}</option>)}</select></div>
          <div className="field full"><label htmlFor="d-msg">Vos besoins ou questions</label><textarea id="d-msg" className="input" name="message" defaultValue={s("message")} rows={4} maxLength={2000} placeholder="Ex. : audit prévu en mars, plusieurs ateliers, reprise d'un fichier Excel…" /></div>
        </div>
      </fieldset>

      <label className="devis-consent"><input type="checkbox" name="consent" defaultChecked={s("consent") === "on"} /><span>J&apos;accepte que DIOMETRO utilise ces informations pour répondre à ma demande. Voir la <Link href="/confidentialite">politique de confidentialité</Link>. *</span></label>
      <Err m={e.consent} />
      <div className="form-actions"><button className="btn primary" type="submit" disabled={pending}>{pending ? "Envoi…" : "Envoyer ma demande"}</button></div>
      <p className="helper">* Champs obligatoires. Réponse personnalisée, sans engagement.</p>
    </form>
  );
}
