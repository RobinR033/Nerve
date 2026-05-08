"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

interface RemindersList {
  url: string;
  displayName: string;
}

interface IntegrationStatus {
  connected: boolean;
  email?: string;
  listNames?: string[];
  lastSyncedAt?: string | null;
}

type Step = "status" | "credentials" | "pick-list" | "saving";

const cardStyle = {
  background: "rgba(255,253,250,0.82)",
  border: "0.5px solid rgba(255,255,255,0.7)",
  boxShadow: "0 1px 0 rgba(255,255,255,.7) inset, 0 4px 16px -4px rgba(60,40,30,.08)",
};

export default function InstellingenPage() {
  // ── Profiel ──────────────────────────────────────────────────────────────
  const [displayName, setDisplayName] = useState("");
  const [nameSaving, setNameSaving] = useState(false);
  const [nameSaved, setNameSaved] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      const meta = data.user?.user_metadata;
      setDisplayName((meta?.full_name as string | undefined) ?? "");
    });
  }, []);

  async function handleSaveName() {
    if (!displayName.trim()) return;
    setNameSaving(true);
    setNameSaved(false);
    const supabase = createClient();
    await supabase.auth.updateUser({ data: { full_name: displayName.trim() } });
    setNameSaving(false);
    setNameSaved(true);
    setTimeout(() => setNameSaved(false), 2500);
  }

  // ── Notificaties ─────────────────────────────────────────────────────────
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [notifStatus, setNotifStatus] = useState<"unknown" | "granted" | "denied" | "unsupported">("unknown");

  useEffect(() => {
    if (!("Notification" in window)) { setNotifStatus("unsupported"); return; }
    setNotifStatus(Notification.permission as "granted" | "denied" | "default");
    setNotifEnabled(Notification.permission === "granted" && localStorage.getItem("nerve-notif") !== "off");
  }, []);

  async function handleToggleNotif() {
    if (notifEnabled) {
      localStorage.setItem("nerve-notif", "off");
      setNotifEnabled(false);
      return;
    }
    if (!("Notification" in window)) return;
    const perm = await Notification.requestPermission();
    setNotifStatus(perm as "granted" | "denied");
    if (perm === "granted") {
      localStorage.removeItem("nerve-notif");
      setNotifEnabled(true);
    }
  }

  // ── Apple Reminders ──────────────────────────────────────────────────────
  const [status, setStatus] = useState<IntegrationStatus | null>(null);
  const [step, setStep] = useState<Step>("status");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [lists, setLists] = useState<RemindersList[]>([]);
  const [selectedUrls, setSelectedUrls] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadStatus = useCallback(async () => {
    const res = await fetch("/api/integrations/apple/status");
    const data = await res.json();
    setStatus(data);
  }, []);

  useEffect(() => { loadStatus(); }, [loadStatus]);

  async function handleFetchLists() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/integrations/apple/lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Verbinding mislukt"); return; }
      setLists(data.lists);
      setStep("pick-list");
    } catch {
      setError("Kan geen verbinding maken met iCloud");
    } finally {
      setLoading(false);
    }
  }

  function toggleList(url: string) {
    setSelectedUrls((prev) =>
      prev.includes(url) ? prev.filter((u) => u !== url) : [...prev, url]
    );
  }

  async function handleSave() {
    if (selectedUrls.length === 0) { setError("Selecteer minimaal één lijst"); return; }
    setError(null);
    setStep("saving");
    const selectedNames = lists.filter((l) => selectedUrls.includes(l.url)).map((l) => l.displayName);
    const res = await fetch("/api/integrations/apple/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apple_id_email: email, app_password: password, selected_list_urls: selectedUrls, selected_list_names: selectedNames }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Opslaan mislukt");
      setStep("pick-list");
      return;
    }
    await loadStatus();
    setStep("status");
    setEmail("");
    setPassword("");
  }

  async function handleDisconnect() {
    if (!confirm("Apple Reminders integratie verwijderen?")) return;
    await fetch("/api/integrations/apple/setup", { method: "DELETE" });
    await loadStatus();
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleString("nl-NL", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-10 space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold mb-1" style={{ color: "#1A1410", letterSpacing: "-.03em" }}>Instellingen</h1>
        <p className="text-sm" style={{ color: "#9A8F84" }}>Beheer je profiel, notificaties en integraties.</p>
      </div>

      {/* ── Profiel ── */}
      <section className="rounded-2xl overflow-hidden" style={cardStyle}>
        <div className="flex items-center gap-3 px-5 py-4 border-b" style={{ borderColor: "rgba(0,0,0,0.05)" }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "linear-gradient(135deg, #FF7A45 0%, #FF5A1F 50%, #FF3D8B 100%)" }}>
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-semibold" style={{ color: "#1A1410" }}>Profiel</h2>
            <p className="text-xs" style={{ color: "#9A8F84" }}>Je naam zoals die in de app verschijnt</p>
          </div>
        </div>
        <div className="px-5 py-4">
          <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: "#6B6157" }}>
            Weergavenaam
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSaveName(); }}
              placeholder="Bijv. Robin"
              className="flex-1 text-sm rounded-xl px-3 py-2.5 outline-none transition-all"
              style={{
                background: "rgba(255,253,250,0.9)",
                border: "0.5px solid rgba(0,0,0,0.12)",
                color: "#1A1410",
              }}
            />
            <button
              onClick={handleSaveName}
              disabled={nameSaving || !displayName.trim()}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #FF7A45 0%, #FF5A1F 60%, #FF3D8B 110%)" }}
            >
              {nameSaving ? "…" : nameSaved ? "Opgeslagen ✓" : "Opslaan"}
            </button>
          </div>
        </div>
      </section>

      {/* ── Notificaties ── */}
      <section className="rounded-2xl overflow-hidden" style={cardStyle}>
        <div className="flex items-center gap-3 px-5 py-4 border-b" style={{ borderColor: "rgba(0,0,0,0.05)" }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "rgba(255,90,31,0.1)" }}>
            <svg className="w-4 h-4" style={{ color: "#FF5A1F" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-semibold" style={{ color: "#1A1410" }}>Pushmeldingen</h2>
            <p className="text-xs" style={{ color: "#9A8F84" }}>Dagstart, deadlines en wrap-up (ma–vr)</p>
          </div>
          {notifStatus !== "unsupported" && (
            <button
              onClick={handleToggleNotif}
              className="ml-auto shrink-0 rounded-full transition-all"
              style={{
                width: 44,
                height: 26,
                background: notifEnabled ? "linear-gradient(135deg, #FF7A45, #FF3D8B)" : "rgba(0,0,0,0.1)",
                position: "relative",
              }}
              aria-label={notifEnabled ? "Notificaties uitschakelen" : "Notificaties inschakelen"}
            >
              <span
                className="absolute top-0.5 transition-all rounded-full bg-white"
                style={{
                  width: 22,
                  height: 22,
                  left: notifEnabled ? "calc(100% - 24px)" : 2,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                }}
              />
            </button>
          )}
        </div>
        <div className="px-5 py-4">
          {notifStatus === "unsupported" && (
            <p className="text-sm" style={{ color: "#9A8F84" }}>Pushmeldingen worden niet ondersteund in deze browser.</p>
          )}
          {notifStatus === "denied" && (
            <p className="text-sm" style={{ color: "#E5484D" }}>
              Notificaties zijn geblokkeerd. Sta ze toe via de browser-instellingen en herlaad de pagina.
            </p>
          )}
          {notifStatus === "granted" && (
            <p className="text-sm" style={{ color: "#6B6157" }}>
              {notifEnabled ? "Je ontvangt meldingen op werkdagen om 08:50 en 16:50." : "Meldingen zijn uitgeschakeld."}
            </p>
          )}
          {notifStatus !== "granted" && notifStatus !== "denied" && notifStatus !== "unsupported" && (
            <p className="text-sm" style={{ color: "#6B6157" }}>Schakel de toggle in om toestemming te geven voor meldingen.</p>
          )}
        </div>
      </section>

      {/* ── Apple Reminders ── */}
      <section className="rounded-2xl overflow-hidden" style={cardStyle}>
        <div className="flex items-center gap-3 px-5 py-4 border-b" style={{ borderColor: "rgba(0,0,0,0.05)" }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "rgba(0,0,0,0.04)" }}>
            <svg className="w-5 h-5" style={{ color: "#1A1410" }} viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11" />
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-semibold" style={{ color: "#1A1410" }}>Apple Reminders</h2>
            <p className="text-xs" style={{ color: "#9A8F84" }}>Siri-herinneringen verschijnen automatisch in Nerve</p>
          </div>
          {status?.connected && (
            <span className="ml-auto text-xs font-semibold px-2.5 py-1 rounded-full"
              style={{ background: "rgba(31,157,85,0.1)", color: "#1F9D55" }}>
              Verbonden
            </span>
          )}
        </div>

        <div className="px-5 py-4">
          {status === null && <p className="text-sm" style={{ color: "#9A8F84" }}>Laden…</p>}

          {status?.connected && step === "status" && (
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "#9A8F84" }}>Account</p>
                <p className="text-sm" style={{ color: "#1A1410" }}>{status.email}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "#9A8F84" }}>
                  Gesynchroniseerde lijst{(status.listNames?.length ?? 0) > 1 ? "en" : ""}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {status.listNames?.map((name) => (
                    <span key={name} className="text-xs font-medium px-2.5 py-1 rounded-full"
                      style={{ background: "rgba(255,90,31,0.08)", color: "#FF5A1F" }}>
                      {name}
                    </span>
                  ))}
                </div>
              </div>
              {status.lastSyncedAt && (
                <p className="text-xs" style={{ color: "#9A8F84" }}>Laatste sync: {formatDate(status.lastSyncedAt)}</p>
              )}
              <button onClick={handleDisconnect} className="text-xs font-medium transition-colors" style={{ color: "#E5484D" }}>
                Integratie verwijderen
              </button>
            </div>
          )}

          {!status?.connected && step === "status" && (
            <div className="space-y-3">
              <p className="text-sm" style={{ color: "#6B6157" }}>
                Verbind je iCloud-account om Siri-herinneringen automatisch in Nerve te ontvangen.
              </p>
              <button
                onClick={() => setStep("credentials")}
                className="w-full text-white text-sm font-semibold py-2.5 px-4 rounded-xl transition-opacity hover:opacity-90"
                style={{ background: "linear-gradient(135deg, #FF7A45 0%, #FF5A1F 60%, #FF3D8B 110%)" }}
              >
                Verbinden met iCloud
              </button>
            </div>
          )}

          {step === "credentials" && (
            <div className="space-y-4">
              <div className="rounded-xl p-3" style={{ background: "rgba(234,179,8,0.08)", border: "0.5px solid rgba(234,179,8,0.3)" }}>
                <p className="text-xs font-semibold mb-1" style={{ color: "#92400e" }}>App-specifiek wachtwoord vereist</p>
                <p className="text-xs" style={{ color: "#78350f" }}>
                  Gebruik niet je Apple ID-wachtwoord. Maak een app-specifiek wachtwoord aan via{" "}
                  <span className="font-mono">appleid.apple.com</span> → Beveiliging.
                </p>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: "#6B6157" }}>Apple ID (e-mailadres)</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="naam@icloud.com"
                    className="w-full text-sm rounded-xl px-3 py-2.5 outline-none"
                    style={{ background: "rgba(255,253,250,0.9)", border: "0.5px solid rgba(0,0,0,0.12)", color: "#1A1410" }} />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: "#6B6157" }}>App-specifiek wachtwoord</label>
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="xxxx-xxxx-xxxx-xxxx"
                    className="w-full text-sm rounded-xl px-3 py-2.5 outline-none font-mono"
                    style={{ background: "rgba(255,253,250,0.9)", border: "0.5px solid rgba(0,0,0,0.12)", color: "#1A1410" }} />
                </div>
              </div>
              {error && <p className="text-xs" style={{ color: "#E5484D" }}>{error}</p>}
              <div className="flex gap-2">
                <button onClick={() => { setStep("status"); setError(null); }}
                  className="flex-1 text-sm font-medium py-2.5 px-4 rounded-xl transition-colors"
                  style={{ color: "#6B6157", background: "rgba(0,0,0,0.04)" }}>
                  Annuleren
                </button>
                <button onClick={handleFetchLists} disabled={loading || !email || !password}
                  className="flex-1 text-white text-sm font-semibold py-2.5 px-4 rounded-xl transition-opacity hover:opacity-90 disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg, #FF7A45, #FF5A1F 60%, #FF3D8B)" }}>
                  {loading ? "Verbinden…" : "Volgende"}
                </button>
              </div>
            </div>
          )}

          {step === "pick-list" && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold mb-0.5" style={{ color: "#1A1410" }}>Welke lijst synchroniseren?</p>
                <p className="text-xs" style={{ color: "#9A8F84" }}>Andere lijsten (bijv. inpaklijsten) worden genegeerd.</p>
              </div>
              <div className="space-y-2">
                {lists.map((list) => {
                  const selected = selectedUrls.includes(list.url);
                  return (
                    <button key={list.url} onClick={() => toggleList(list.url)}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-left transition-all"
                      style={{
                        border: `0.5px solid ${selected ? "rgba(255,90,31,0.4)" : "rgba(0,0,0,0.08)"}`,
                        background: selected ? "rgba(255,90,31,0.06)" : "rgba(255,253,250,0.6)",
                        color: selected ? "#FF5A1F" : "#1A1410",
                        fontWeight: selected ? 600 : 400,
                      }}>
                      <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all"
                        style={{ borderColor: selected ? "#FF5A1F" : "rgba(0,0,0,0.2)", background: selected ? "#FF5A1F" : "transparent" }}>
                        {selected && (
                          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" />
                          </svg>
                        )}
                      </div>
                      {list.displayName}
                    </button>
                  );
                })}
              </div>
              {error && <p className="text-xs" style={{ color: "#E5484D" }}>{error}</p>}
              <div className="flex gap-2">
                <button onClick={() => { setStep("credentials"); setError(null); }}
                  className="flex-1 text-sm font-medium py-2.5 px-4 rounded-xl"
                  style={{ color: "#6B6157", background: "rgba(0,0,0,0.04)" }}>
                  Terug
                </button>
                <button onClick={handleSave} disabled={selectedUrls.length === 0}
                  className="flex-1 text-white text-sm font-semibold py-2.5 px-4 rounded-xl disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg, #FF7A45, #FF5A1F 60%, #FF3D8B)" }}>
                  Opslaan
                </button>
              </div>
            </div>
          )}

          {step === "saving" && <p className="text-sm" style={{ color: "#9A8F84" }}>Opslaan…</p>}
        </div>
      </section>
    </div>
  );
}
