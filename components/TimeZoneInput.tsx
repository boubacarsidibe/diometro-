"use client";
import { useEffect, useState } from "react";

// Fuseau horaire du navigateur, envoyé avec le formulaire d'inscription de l'entreprise (modifiable ensuite dans Paramètres).
export function TimeZoneInput({ name = "time_zone" }: { name?: string }) {
  const [tz, setTz] = useState("");
  useEffect(() => {
    try {
      setTz(Intl.DateTimeFormat().resolvedOptions().timeZone ?? "");
    } catch {
      // Navigateur sans Intl : fuseau par défaut (Dakar) côté serveur.
    }
  }, []);
  return <input type="hidden" name={name} value={tz} />;
}
