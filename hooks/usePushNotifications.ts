"use client";

import { useEffect, useRef } from "react";
import type { Task } from "@/types/database";

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;

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
          applicationServerKey: VAPID_PUBLIC,
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

// --- Deadline notificaties per taak ---

export function useDeadlineNotifications(tasks: Task[]) {
  // Sla timers op zodat we ze kunnen annuleren als taken veranderen
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    const now = new Date();

    // Taken die in aanmerking komen: niet afgerond, niet gearchiveerd, heeft tijdstip, deadline in de toekomst
    const eligible = tasks.filter(
      (t) =>
        t.deadline_has_time &&
        t.deadline &&
        t.status !== "done" &&
        t.archived_at === null &&
        new Date(t.deadline) > now
    );

    // Annuleer timers voor taken die niet meer in de lijst staan
    const eligibleIds = new Set(eligible.map((t) => t.id));
    for (const [id, timer] of timersRef.current) {
      if (!eligibleIds.has(id)) {
        clearTimeout(timer);
        timersRef.current.delete(id);
      }
    }

    // Plan nieuwe timer voor elke in aanmerking komende taak
    for (const task of eligible) {
      // Sla over als al ingepland voor dit id
      if (timersRef.current.has(task.id)) continue;

      const delay = new Date(task.deadline!).getTime() - now.getTime();

      const timer = setTimeout(async () => {
        timersRef.current.delete(task.id);
        await fetch("/api/notifications/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "deadline",
            taskId: task.id,
            taskTitle: task.title,
          }),
        }).catch(console.error);
      }, delay);

      timersRef.current.set(task.id, timer);
    }

    // Cleanup bij unmount of opnieuw uitvoeren
    return () => {
      for (const timer of timersRef.current.values()) {
        clearTimeout(timer);
      }
      timersRef.current.clear();
    };
  }, [tasks]);
}
