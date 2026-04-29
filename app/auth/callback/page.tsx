"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState("Inloggen...");

  useEffect(() => {
    const supabase = createClient();

    async function handleCallback() {
      const params = new URLSearchParams(window.location.search);
      const hash = window.location.hash.substring(1);
      const hashParams = new URLSearchParams(hash);

      const code = params.get("code");
      const tokenHash = params.get("token_hash");
      const type = params.get("type") ?? hashParams.get("type");
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");

      try {
        // 1. PKCE flow (Google OAuth, nieuwere Supabase)
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (!error) { router.replace("/dashboard"); return; }
        }

        // 2. Token hash flow (magic link / OTP via query param)
        if (tokenHash && type) {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: type as "email" | "magiclink" | "recovery" | "invite",
          });
          if (!error) { router.replace("/dashboard"); return; }
        }

        // 3. Implicit / fragment flow (oudere magic link)
        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (!error) { router.replace("/dashboard"); return; }
        }

        // 4. Supabase heeft sessie al verwerkt via detectSessionInUrl
        const { data: { session } } = await supabase.auth.getSession();
        if (session) { router.replace("/dashboard"); return; }

        setStatus("Inloggen mislukt — probeer opnieuw.");
        setTimeout(() => router.replace("/login"), 2000);
      } catch {
        setStatus("Inloggen mislukt — probeer opnieuw.");
        setTimeout(() => router.replace("/login"), 2000);
      }
    }

    handleCallback();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFAF8]">
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-orange border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm text-gray-500">{status}</p>
      </div>
    </div>
  );
}
