"use client";
import { useEffect, useMemo, useState } from "react";
import { COUNTRIES, countryByCode, countryOfZone, gmtOffset } from "@/lib/timezones";

// Choix du pays de l'entreprise (tous les pays du monde), puis de la ville de référence quand le pays a plusieurs fuseaux
// (États-Unis, Canada, Russie, Brésil, RD Congo…). Sert à afficher l'heure exacte du lieu de l'entreprise.
export function CountryTimeZoneSelect({ country, timeZone, detect = false, error }: { country?: string | null; timeZone?: string | null; detect?: boolean; error?: string }) {
  const initial = countryByCode(country) ?? countryOfZone(timeZone);
  const [code, setCode] = useState(initial?.code ?? "");
  const [tz, setTz] = useState(initial?.zones.some((z) => z.id === timeZone) ? timeZone! : initial?.zones[0]?.id ?? "");
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 30_000);
    if (detect && !code) {
      // Inscription : le pays est déduit du fuseau de l'ordinateur, l'utilisateur peut le changer.
      try {
        const browser = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const c = countryOfZone(browser);
        if (c) { setCode(c.code); setTz(browser); }
      } catch { /* pas d'Intl : choix manuel */ }
    }
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const current = countryByCode(code);
  const zones = current?.zones ?? [];
  const label = useMemo(() => {
    if (!now || !tz) return null;
    try {
      return now.toLocaleString("fr-FR", { timeZone: tz, weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
    } catch {
      return null;
    }
  }, [now, tz]);

  return (
    <div className="tz-pick">
      <div className="field">
        <label htmlFor="country">Pays de l&apos;entreprise</label>
        <select id="country" name="country" className="input" required value={code}
          onChange={(e) => { const c = countryByCode(e.target.value); setCode(e.target.value); setTz(c?.zones[0]?.id ?? ""); }}>
          <option value="" disabled>Choisissez un pays…</option>
          {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
        </select>
      </div>
      {zones.length > 1 ? (
        <div className="field">
          <label htmlFor="time_zone">Ville / fuseau horaire</label>
          <select id="time_zone" name="time_zone" className="input" required value={tz} onChange={(e) => setTz(e.target.value)}>
            {zones.map((z) => <option key={z.id} value={z.id}>{z.city} ({gmtOffset(z.id)})</option>)}
          </select>
        </div>
      ) : <input type="hidden" name="time_zone" value={tz} />}
      {error && <span className="field-error" role="alert">{error}</span>}
      {label && <span className="helper">Heure actuelle sur place : {label} ({gmtOffset(tz)}).</span>}
    </div>
  );
}
