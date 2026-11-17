"use client";
import { useEffect, useState } from "react";

// Horloge numérique de la console : heure du fuseau de l'administrateur, à la seconde.
export function ConsoleClock({ timeZone }: { timeZone: string }) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const part = (o: Intl.DateTimeFormatOptions) => {
    if (!now) return "";
    try { return now.toLocaleString("fr-FR", { timeZone, ...o }); } catch { return now.toLocaleString("fr-FR", o); }
  };
  const city = timeZone.split("/").pop()!.replace(/_/g, " ");
  return (
    <div className="cs-clock" role="timer" aria-label={`Heure de ${city}`}>
      <div className="cs-clock-t">
        <time dateTime={now?.toISOString()}>{now ? part({ hour: "2-digit", minute: "2-digit" }) : "--:--"}</time>
        <small>{now ? part({ second: "2-digit" }).padStart(2, "0") : "--"}</small>
      </div>
      <div className="cs-clock-d"><span>{part({ weekday: "short", day: "2-digit", month: "short" })}</span><span className="on">● {city}</span></div>
    </div>
  );
}
