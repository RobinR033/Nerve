"use client";

import { useEffect, useRef } from "react";

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

// Bereken milliseconden tot een bepaald tijdstip vandaag (of morgen als al voorbij)
function msUntil(hour: number, minute: number): number {
  const now = new Date();
  const target = new Date();
  target.setHours(hour, minute, 0, 0);
  if (target <= now) target.setDate(target.getDate() + 1);
  return target.getTime() - now.getTime();
}

export function usePushNotifications() {
  const scheduledRef = useRef(false);

  useEffect(() => {
    if (scheduledRef.current) return;
    scheduledRef.current = true;

    async function setup() {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

      // Registreer service worker
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      // Vraag toestemming
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return;

      // Haal bestaande subscription op of maak nieuwe
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC),
        });
      }

      // Stuur subscription naar server
      const subJson = sub.toJSON();
      await fetch("/api/notifications/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: sub.endpoint,
          p256dh: (subJson.keys as Record<string, string>)?.p256dh,
          auth: (subJson.keys as Record<string, string>)?.auth,
        }),
      });

      // Plan dagelijkse notificaties (ma-vr)
      scheduleDaily(8, 50, "dagstart");
      scheduleDaily(16, 50, "wrapup");
    }

    setup().catch(console.error);
  }, []);
}

function scheduleDaily(hour: number, minute: number, type: string) {
  const delay = msUntil(hour, minute);

  setTimeout(async () => {
    // Alleen op werkdagen sturen
    const day = new Date().getDay();
    if (day >= 1 && day <= 5) {
      await fetch("/api/notifications/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      }).catch(console.error);
    }
    // Herplan voor morgen
    scheduleDaily(hour, minute, type);
  }, delay);
}
