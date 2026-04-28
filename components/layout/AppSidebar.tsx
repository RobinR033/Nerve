"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

const navItems = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: (
      <svg className="w-[17px] h-[17px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 11l9-8 9 8M5 10v10h14V10" />
      </svg>
    ),
  },
  {
    href: "/taken",
    label: "Taken",
    icon: (
      <svg className="w-[17px] h-[17px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <rect x="3" y="5" width="3" height="3" rx=".5" /><rect x="3" y="11" width="3" height="3" rx=".5" /><rect x="3" y="17" width="3" height="3" rx=".5" /><path strokeLinecap="round" d="M9 6.5h12M9 12.5h12M9 18.5h12" />
      </svg>
    ),
  },
  {
    href: "/agenda",
    label: "Agenda",
    icon: (
      <svg className="w-[17px] h-[17px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <rect x="3" y="5" width="18" height="16" rx="2" /><path strokeLinecap="round" d="M3 9h18M8 3v4M16 3v4" />
      </svg>
    ),
  },
  {
    href: "/bord",
    label: "Bord",
    icon: (
      <svg className="w-[17px] h-[17px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <rect x="3" y="4" width="5" height="16" rx="1" /><rect x="10" y="4" width="5" height="10" rx="1" /><rect x="17" y="4" width="4" height="14" rx="1" />
      </svg>
    ),
  },
  {
    href: "/review",
    label: "Weekoverzicht",
    icon: (
      <svg className="w-[17px] h-[17px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
      </svg>
    ),
  },
  {
    href: "/instellingen",
    label: "Instellingen",
    icon: (
      <svg className="w-[17px] h-[17px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <circle cx="12" cy="12" r="3" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v.1a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
      </svg>
    ),
  },
];

// Mini progress ring SVG around avatar
function AvatarRing({ initials, progress = 0.6 }: { initials: string; progress?: number }) {
  const size = 36;
  const stroke = 2.5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - progress);
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg
        width={size}
        height={size}
        style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)" }}
      >
        <defs>
          <linearGradient id="sidebar-ring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FF7A45" />
            <stop offset="60%" stopColor="#FF5A1F" />
            <stop offset="100%" stopColor="#FF3D8B" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(0,0,0,0.07)" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="url(#sidebar-ring)"
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 4,
          borderRadius: "50%",
          background: "linear-gradient(135deg, #FFE0CC 0%, #FFC9D8 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 11,
          fontWeight: 700,
          color: "#E63E0C",
          letterSpacing: "-.02em",
          boxShadow: "0 2px 8px -2px rgba(255,90,31,.3)",
        }}
      >
        {initials}
      </div>
    </div>
  );
}

export function AppSidebar({ user }: { user: User }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  const initials = user.email?.slice(0, 2).toUpperCase() ?? "?";
  const emailShort = user.email ? (user.email.length > 22 ? user.email.slice(0, 21) + "…" : user.email) : "";

  return (
    <aside
      className="hidden md:flex w-56 h-full flex-col shrink-0 relative z-10"
      style={{
        background: "rgba(255,253,250,0.55)",
        backdropFilter: "blur(30px) saturate(180%)",
        WebkitBackdropFilter: "blur(30px) saturate(180%)",
        borderRight: "0.5px solid rgba(255,255,255,0.5)",
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 pt-5 pb-4">
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            background: "linear-gradient(135deg, #FF7A45 0%, #FF5A1F 50%, #FF3D8B 100%)",
            boxShadow: "0 1px 0 rgba(255,255,255,.4) inset, 0 4px 12px -2px rgba(255,90,31,.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontWeight: 800,
            fontSize: 14,
            letterSpacing: "-.04em",
          }}
        >
          N
        </div>
        <span className="font-display text-[17px] font-semibold" style={{ color: "#1A1410", letterSpacing: "-.025em" }}>
          Nerve
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-1 flex flex-col gap-0.5">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13.5px] font-medium transition-all"
              style={
                active
                  ? {
                      background: "linear-gradient(135deg, #FF7A45 0%, #FF5A1F 60%, #FF3D8B 110%)",
                      color: "#fff",
                      fontWeight: 600,
                      letterSpacing: "-.005em",
                      boxShadow: "0 1px 0 rgba(255,255,255,.3) inset, 0 4px 12px -2px rgba(255,90,31,.45)",
                    }
                  : {
                      color: "#6B6157",
                      letterSpacing: "-.005em",
                    }
              }
            >
              {item.icon}
              <span className="flex-1">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Streak card */}
      <div className="px-3 mb-3">
        <div
          className="rounded-2xl p-3"
          style={{
            background: "linear-gradient(135deg, rgba(255,232,217,.9) 0%, rgba(255,222,233,.8) 100%)",
            border: "0.5px solid rgba(255,255,255,0.7)",
            boxShadow: "0 1px 0 rgba(255,255,255,.6) inset, 0 4px 14px -4px rgba(255,90,31,.18)",
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-base leading-none">🔥</span>
            <span
              className="text-[10px] font-bold uppercase tracking-widest"
              style={{ color: "#E63E0C", letterSpacing: ".08em" }}
            >
              STREAK
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span
              className="text-[26px] font-bold leading-none"
              style={{ color: "#1A1410", letterSpacing: "-.04em" }}
            >
              12
            </span>
            <span className="text-xs" style={{ color: "#6B6157" }}>
              dagen op rij
            </span>
          </div>
          {/* Mini streak bars */}
          <div className="flex gap-0.5 mt-2.5" style={{ height: 16 }}>
            {[0.6, 0.9, 0.7, 1, 0.8, 1, 1, 0.9, 1, 1, 1, 1, 0.3].map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-sm"
                style={{
                  background:
                    i === 12
                      ? "rgba(255,90,31,.25)"
                      : "linear-gradient(180deg, #FF7A45, #FF3D8B)",
                  opacity: 0.3 + h * 0.7,
                  transform: `scaleY(${0.4 + h * 0.6})`,
                  transformOrigin: "bottom",
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* User */}
      <div
        className="p-3 flex items-center gap-2.5"
        style={{ borderTop: "0.5px solid rgba(0,0,0,0.05)" }}
      >
        <AvatarRing initials={initials} progress={0.62} />
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-semibold truncate" style={{ color: "#1A1410" }}>
            {emailShort}
          </p>
          <p className="text-[10.5px]" style={{ color: "#9A8F84" }}>
            62% van vandaag
          </p>
        </div>
        <button
          onClick={handleLogout}
          title="Uitloggen"
          className="shrink-0 rounded-lg p-1.5 transition-colors"
          style={{ color: "#9A8F84" }}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
          </svg>
        </button>
      </div>
    </aside>
  );
}
