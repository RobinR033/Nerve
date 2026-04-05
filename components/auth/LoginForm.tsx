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
    <div className="w-full max-w-sm">
      <AnimatePresence mode="wait">
        {step === "email" ? (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.3 }}
          >
            <h2 className="font-display text-3xl font-bold text-gray-900 mb-2">
              Welkom terug
            </h2>
            <p className="text-gray-500 mb-8">Log in om verder te gaan met Nerve.</p>

            {/* Google OAuth */}
            <button
              type="button"
              onClick={loginWithGoogle}
              disabled={googleLoading}
              className="w-full flex items-center justify-center gap-3 border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors mb-6 disabled:opacity-60"
            >
              <GoogleIcon />
              {googleLoading ? "Laden..." : "Doorgaan met Google"}
            </button>

            <div className="flex items-center gap-4 mb-6">
              <div className="flex-1 h-px bg-gray-100" />
              <span className="text-xs text-gray-400 font-medium">of via e-mail</span>
              <div className="flex-1 h-px bg-gray-100" />
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <input
                  {...register("email")}
                  type="email"
                  placeholder="jouw@email.nl"
                  autoComplete="email"
                  autoFocus
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF4800]/30 focus:border-[#FF4800] transition-all"
                />
                {errors.email && (
                  <p className="mt-1.5 text-xs text-red-500">{errors.email.message}</p>
                )}
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#FF4800] hover:bg-[#E03E00] text-white font-semibold rounded-xl px-4 py-3 text-sm transition-colors disabled:opacity-60"
              >
                {isSubmitting ? "Versturen..." : "Stuur code"}
              </button>
            </form>
          </motion.div>
        ) : (
          <motion.div
            key="code"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.3 }}
          >
            <div className="w-16 h-16 bg-[#FF4800]/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-[#FF4800]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>

            <h2 className="font-display text-2xl font-bold text-gray-900 mb-2 text-center">
              Voer de code in
            </h2>
            <p className="text-gray-500 text-sm text-center mb-8 leading-relaxed">
              We stuurden een 8-cijferige code naar<br />
              <span className="font-medium text-gray-900">{email}</span>
            </p>

            {/* 6-digit code input */}
            <div className="flex gap-1.5 justify-center mb-4" onPaste={handleCodePaste}>
              {code.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => { inputRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleCodeInput(i, e.target.value)}
                  onKeyDown={(e) => handleCodeKeyDown(i, e)}
                  disabled={verifying}
                  className="w-9 h-12 sm:w-11 sm:h-14 text-center text-lg font-bold border-2 rounded-xl text-gray-900 focus:outline-none focus:border-[#FF4800] transition-all disabled:opacity-40"
                  style={{ borderColor: digit ? "#FF4800" : undefined }}
                />
              ))}
            </div>

            {verifying && (
              <p className="text-center text-sm text-gray-400 mb-4">Verifiëren…</p>
            )}
            {codeError && (
              <p className="text-center text-sm text-red-500 mb-4">{codeError}</p>
            )}

            <button
              onClick={() => { setStep("email"); setCodeError(""); }}
              className="w-full text-sm text-gray-400 hover:text-gray-600 transition-colors text-center mt-2"
            >
              Ander e-mailadres of nieuwe code
            </button>
          </motion.div>
        )}
      </AnimatePresence>
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
