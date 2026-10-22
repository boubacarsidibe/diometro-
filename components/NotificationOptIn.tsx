"use client";
import { useEffect, useState } from "react";

// Notifications du navigateur (pendant que l'application est ouverte) : une par jour au plus.
export function NotificationOptIn({ alertCount }: { alertCount: number }) {
  const [perm, setPerm] = useState<NotificationPermission | "unsupported">("unsupported");
  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    setPerm(Notification.permission);
    try {
      const today = new Date().toISOString().slice(0, 10);
      if (Notification.permission === "granted" && alertCount > 0 && localStorage.getItem("diometro-notif") !== today) {
        new Notification("DIOMETRO", { body: `${alertCount} instrument${alertCount > 1 ? "s" : ""} à étalonner ou en retard.` });
        localStorage.setItem("diometro-notif", today);
      }
    } catch {
      // stockage ou notifications indisponibles : sans effet
    }
  }, [alertCount]);
  if (perm !== "default") return null;
  return <button type="button" className="btn small soft" style={{ marginTop: 8 }} onClick={async () => setPerm(await Notification.requestPermission())}>🔔 Activer les notifications</button>;
}
