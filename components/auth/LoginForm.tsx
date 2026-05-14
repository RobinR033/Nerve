"use client";

import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const schema = z.object({
  email: z.string().email("Voer een geldig e-mailadres in"),
});

type FormData = z.infer<typeof schema>;

const cardStyle: React.CSSProperties = {
  background: "rgba(255,253,250,0.78)",
  backdropFilter: "var(--backdrop-blur-lg)",
  WebkitBackdropFilter: "var(--backdrop-blur-lg)",
  border: "0.5px solid rgba(255,255,255,0.65)",
  boxShadow:
    "0 1px 0 rgba(255,255,255,.7) inset, 0 12px 36px -8px rgba(60,40,30,0.16), 0 2px 6px rgba(60,40,30,0.06)",
};

const brandButtonStyle: React.CSSProperties = {
  background: "linear-gradient(135deg, #FF7A45 0%, #FF5A1F 50%, #FF3D8B 110%)",
  boxShadow:
    "0 1px 0 rgba(255,255,255,.3) inset, 0 6px 18px -4px rgba(255,90,31,.5)",
};

export function LoginForm() {
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState(["", "", "", "", "", "", "", ""]);
  const [codeError, setCodeError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: data.email,
      options: { shouldCreateUser: false },
    });
    if (!error) {
      setEmail(data.email);
      setCode(["", "", "", "", "", "", "", ""]);
      setCodeError("");
      setStep("code");
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    }
  }

  async function verifyCode(fullCode: string) {
    setVerifying(true);
    setCodeError("");
    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: fullCode,
      type: "email",
    });
    if (error) {
      setCodeError("Code onjuist of verlopen. Probeer opnieuw.");
      setCode(["", "", "", "", "", "", "", ""]);
      setTimeout(() => inputRefs.current[0]?.focus(), 50);
      setVerifying(false);
    } else {
      router.push("/dashboard");
    }
  }

  function handleCodeInput(index: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...code];
    next[index] = digit;
    setCode(next);
    if (digit && index < 7) {
      inputRefs.current[index + 1]?.focus();
    }
    if (next.every((d) => d !== "")) {
      verifyCode(next.join(""));
    }
  }

  function handleCodeKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handleCodePaste(e: React.ClipboardEvent) {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 8);
    if (pasted.length === 8) {
      setCode(pasted.split(""));
      verifyCode(pasted);
    }
  }

  async function loginWithGoogle() {
    setGoogleLoading(true);
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  return (
    <div className="w-full max-w-md">
      {/* Logo + naam */}
      <div className="flex flex-col items-center mb-8">
        <img
          src="/icon-192.png"
          alt="Nerve"
          width={64}
          height={64}
          style={{ width: 64, height: 64, borderRadius: 16, display: "block" }}
        />
        <h1
          className="font-display mt-3"
          style={{
            fontSize: 28,
            fontWeight: 700,
            color: "#1A1410",
            letterSpacing: "-.035em",
          }}
        >
          Nerve
        </h1>
        <p className="text-sm mt-1" style={{ color: "#6B6157" }}>
          Jouw persoonlijk task command center
        </p>
      </div>

      {/* Card */}
      <div className="rounded-2xl p-6 md:p-8" style={cardStyle}>
        <AnimatePresence mode="wait">
          {step === "email" ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <h2
                className="font-display text-2xl font-bold mb-1"
                style={{ color: "#1A1410", letterSpacing: "-.02em" }}
              >
                Welkom terug
              </h2>
              <p className="text-sm mb-6" style={{ color: "#6B6157" }}>
                Log in om verder te gaan.
              </p>

              {/* Google OAuth */}
              <button
                type="button"
                onClick={loginWithGoogle}
                disabled={googleLoading}
                className="w-full flex items-center justify-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all active:scale-[0.99] disabled:opacity-60"
                style={{
                  background: "rgba(255,255,255,0.8)",
                  border: "0.5px solid rgba(0,0,0,0.08)",
                  color: "#1A1410",
                  boxShadow: "0 1px 0 rgba(255,255,255,.7) inset, 0 2px 6px rgba(60,40,30,0.06)",
                }}
              >
                <GoogleIcon />
                {googleLoading ? "Laden…" : "Doorgaan met Google"}
              </button>

              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px" style={{ background: "rgba(0,0,0,0.08)" }} />
                <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#9A8F84" }}>
                  of via e-mail
                </span>
                <div className="flex-1 h-px" style={{ background: "rgba(0,0,0,0.08)" }} />
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
                <div>
                  <input
                    {...register("email")}
                    type="email"
                    placeholder="jouw@email.nl"
                    autoComplete="email"
                    autoFocus
                    className="w-full rounded-xl px-4 py-3 text-sm transition-all"
                    style={{
                      background: "rgba(255,255,255,0.7)",
                      border: "0.5px solid rgba(0,0,0,0.08)",
                      color: "#1A1410",
                    }}
                  />
                  {errors.email && (
                    <p className="mt-1.5 text-xs" style={{ color: "#E5484D" }}>
                      {errors.email.message}
                    </p>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full text-white font-semibold rounded-xl px-4 py-3 text-sm transition-opacity hover:opacity-90 active:scale-[0.99] disabled:opacity-60"
                  style={brandButtonStyle}
                >
                  {isSubmitting ? "Versturen…" : "Stuur code"}
                </button>
              </form>
            </motion.div>
          ) : (
            <motion.div
              key="code"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{
                  background: "rgba(255,90,31,.1)",
                  border: "0.5px solid rgba(255,90,31,.2)",
                }}
              >
                <svg
                  className="w-7 h-7"
                  style={{ color: "#FF5A1F" }}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.8}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>

              <h2
                className="font-display text-xl font-bold mb-1 text-center"
                style={{ color: "#1A1410", letterSpacing: "-.02em" }}
              >
                Voer de code in
              </h2>
              <p className="text-sm text-center mb-6 leading-relaxed" style={{ color: "#6B6157" }}>
                We stuurden een 8-cijferige code naar
                <br />
                <span className="font-semibold" style={{ color: "#1A1410" }}>{email}</span>
              </p>

              <div className="flex gap-1.5 justify-center mb-3" onPaste={handleCodePaste}>
                {code.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => {
                      inputRefs.current[i] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleCodeInput(i, e.target.value)}
                    onKeyDown={(e) => handleCodeKeyDown(i, e)}
                    disabled={verifying}
                    className="w-9 h-12 sm:w-10 sm:h-12 text-center text-lg font-bold rounded-xl transition-all disabled:opacity-40"
                    style={{
                      background: "rgba(255,255,255,0.85)",
                      border: `1.5px solid ${digit ? "#FF5A1F" : "rgba(0,0,0,0.08)"}`,
                      color: "#1A1410",
                    }}
                  />
                ))}
              </div>

              {verifying && (
                <p className="text-center text-sm mb-2" style={{ color: "#9A8F84" }}>
                  Verifiëren…
                </p>
              )}
              {codeError && (
                <p className="text-center text-sm mb-2" style={{ color: "#E5484D" }}>
                  {codeError}
                </p>
              )}

              <button
                onClick={() => {
                  setStep("email");
                  setCodeError("");
                }}
                className="w-full text-sm transition-colors text-center mt-2"
                style={{ color: "#9A8F84" }}
              >
                Ander e-mailadres of nieuwe code
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4" />
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853" />
      <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05" />
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335" />
    </svg>
  );
}
