"use client";

import { useState, useEffect, useCallback } from "react";

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

export default function InstellingenPage() {
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

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

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
      if (!res.ok) {
        setError(data.error ?? "Verbinding mislukt");
        return;
      }
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
    if (selectedUrls.length === 0) {
      setError("Selecteer minimaal één lijst");
      return;
    }
    setError(null);
    setStep("saving");

    const selectedNames = lists
      .filter((l) => selectedUrls.includes(l.url))
      .map((l) => l.displayName);

    const res = await fetch("/api/integrations/apple/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apple_id_email: email,
        app_password: password,
        selected_list_urls: selectedUrls,
        selected_list_names: selectedNames,
      }),
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
    return new Date(iso).toLocaleString("nl-NL", {
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-10">
      <h1 className="font-display text-3xl font-bold text-gray-900 mb-1">Instellingen</h1>
      <p className="text-gray-500 text-sm mb-8">Beheer je integraties en voorkeuren.</p>

      {/* Apple Reminders sectie */}
      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-100">
          <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center shrink-0">
            {/* Apple-icoon */}
            <svg className="w-5 h-5 text-gray-700" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11" />
            </svg>
          </div>
          <div>
            <h2 className="font-semibold text-gray-900 text-sm">Apple Reminders</h2>
            <p className="text-xs text-gray-400">Siri-herinneringen verschijnen automatisch in Nerve</p>
          </div>
          {status?.connected && (
            <span className="ml-auto text-xs font-medium bg-green-50 text-green-700 px-2.5 py-1 rounded-full">
              Verbonden
            </span>
          )}
        </div>

        <div className="px-6 py-5">
          {/* Laden */}
          {status === null && (
            <p className="text-sm text-gray-400">Laden...</p>
          )}

          {/* Verbonden — toon status */}
          {status?.connected && step === "status" && (
            <div className="space-y-4">
              <div className="space-y-1">
                <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Account</p>
                <p className="text-sm text-gray-700">{status.email}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">
                  Gesynchroniseerde lijst{(status.listNames?.length ?? 0) > 1 ? "en" : ""}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {status.listNames?.map((name) => (
                    <span
                      key={name}
                      className="text-xs bg-orange-soft text-orange font-medium px-2.5 py-1 rounded-full"
                    >
                      {name}
                    </span>
                  ))}
                </div>
              </div>
              {status.lastSyncedAt && (
                <p className="text-xs text-gray-400">
                  Laatste sync: {formatDate(status.lastSyncedAt)}
                </p>
              )}
              <button
                onClick={handleDisconnect}
                className="text-xs text-red-500 hover:text-red-700 transition-colors font-medium"
              >
                Integratie verwijderen
              </button>
            </div>
          )}

          {/* Niet verbonden — stap 1: credentials */}
          {!status?.connected && step === "status" && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Verbind je iCloud-account om Siri-herinneringen automatisch in Nerve te ontvangen.
                Afvinken in Nerve werkt ook direct terug in Herinneringen.
              </p>
              <button
                onClick={() => setStep("credentials")}
                className="w-full bg-orange text-white text-sm font-semibold py-2.5 px-4 rounded-xl hover:bg-orange/90 transition-colors"
              >
                Verbinden met iCloud
              </button>
            </div>
          )}

          {/* Stap 1: credentials invullen */}
          {step === "credentials" && (
            <div className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3">
                <p className="text-xs text-yellow-800 font-medium mb-1">App-specifiek wachtwoord vereist</p>
                <p className="text-xs text-yellow-700">
                  Gebruik niet je Apple ID-wachtwoord. Maak een app-specifiek wachtwoord aan via{" "}
                  <span className="font-mono">appleid.apple.com</span> → Beveiliging → App-specifieke wachtwoorden.
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Apple ID (e-mailadres)</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="naam@icloud.com"
                    className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange/30 focus:border-orange"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">App-specifiek wachtwoord</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="xxxx-xxxx-xxxx-xxxx"
                    className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange/30 focus:border-orange font-mono"
                  />
                </div>
              </div>

              {error && <p className="text-xs text-red-500">{error}</p>}

              <div className="flex gap-2">
                <button
                  onClick={() => { setStep("status"); setError(null); }}
                  className="flex-1 text-sm font-medium text-gray-500 py-2.5 px-4 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  Annuleren
                </button>
                <button
                  onClick={handleFetchLists}
                  disabled={loading || !email || !password}
                  className="flex-1 bg-orange text-white text-sm font-semibold py-2.5 px-4 rounded-xl hover:bg-orange/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Verbinden..." : "Volgende"}
                </button>
              </div>
            </div>
          )}

          {/* Stap 2: lijst kiezen */}
          {step === "pick-list" && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Welke lijst synchroniseren?</p>
                <p className="text-xs text-gray-400">
                  Kies de lijst die Nerve bewaakt. Andere lijsten (bijv. inpaklijsten) worden genegeerd.
                </p>
              </div>

              <div className="space-y-2">
                {lists.map((list) => {
                  const selected = selectedUrls.includes(list.url);
                  return (
                    <button
                      key={list.url}
                      onClick={() => toggleList(list.url)}
                      className={[
                        "w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-sm text-left transition-all",
                        selected
                          ? "border-orange bg-orange-soft text-orange font-semibold"
                          : "border-gray-200 text-gray-700 hover:border-gray-300",
                      ].join(" ")}
                    >
                      <div className={[
                        "w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0",
                        selected ? "border-orange bg-orange" : "border-gray-300",
                      ].join(" ")}>
                        {selected && (
                          <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 12 12">
                            <path d="M10 3L5 8.5 2 5.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                          </svg>
                        )}
                      </div>
                      {list.displayName}
                    </button>
                  );
                })}
              </div>

              {error && <p className="text-xs text-red-500">{error}</p>}

              <div className="flex gap-2">
                <button
                  onClick={() => { setStep("credentials"); setError(null); }}
                  className="flex-1 text-sm font-medium text-gray-500 py-2.5 px-4 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  Terug
                </button>
                <button
                  onClick={handleSave}
                  disabled={selectedUrls.length === 0}
                  className="flex-1 bg-orange text-white text-sm font-semibold py-2.5 px-4 rounded-xl hover:bg-orange/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Opslaan
                </button>
              </div>
            </div>
          )}

          {/* Opslaan */}
          {step === "saving" && (
            <p className="text-sm text-gray-500">Opslaan...</p>
          )}
        </div>
      </section>
    </div>
  );
}
