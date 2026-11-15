"use client";
import { useEffect, useState } from "react";

// Heure du lieu de l'entreprise (fuseau choisi dans Paramètres), affichée en haut de la barre latérale.
export function LiveClock({ timeZone, place }: { timeZone: string; place: string }) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    let timer: ReturnType<typeof setInterval> | undefined;
    // Calé sur le changement de minute, puis toutes les minutes.
    const first = setTimeout(() => { setNow(new Date()); timer = setInterval(() => setNow(new Date()), 60_000); }, 60_000 - (Date.now() % 60_000) + 50);
    return () => { clearTimeout(first); if (timer) clearInterval(timer); };
  }, []);
  const fmt = (o: Intl.DateTimeFormatOptions) => {
    if (!now) return "";
    try { return now.toLocaleString("fr-FR", { timeZone, ...o }); } catch { return now.toLocaleString("fr-FR", o); }
  };
  return (
    <div className="live-clock" title={`Heure locale de l'entreprise (${place}), réglable dans Paramètres`}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
      <time dateTime={now?.toISOString()} className="lc-time">{now ? fmt({ hour: "2-digit", minute: "2-digit" }) : "--:--"}</time>
      <span className="lc-date">{now ? fmt({ weekday: "short", day: "numeric", month: "short" }) : ""}</span>
      <span className="lc-place">· {place}</span>
    </div>
  );
}
