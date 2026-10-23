"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCaptureStore } from "@/stores/captureStore";

const navItems = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: (active: boolean) => (
      <svg className="w-[22px] h-[22px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2 : 1.7}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 11l9-8 9 8M5 10v10h14V10" />
      </svg>
    ),
  },
  {
    href: "/overleggen",
    label: "Overleggen",
    icon: (active: boolean) => (
      <svg className="w-[22px] h-[22px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2 : 1.7}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h6m-9 8l3.5-3H18a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v14z" />
      </svg>
    ),
  },
  null,
  {
    href: "/agenda",
    label: "Agenda",
    icon: (active: boolean) => (
      <svg className="w-[22px] h-[22px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2 : 1.7}>
          <rect x="3" y="5" width="18" height="16" rx="2" /><path strokeLinecap="round" d="M3 9h18M8 3v4M16 3v4" />
        </svg>
    ),
  },
  {
    href: "/instellingen",
    label: "Instellingen",
    icon: (active: boolean) => (
      <svg className="w-[22px] h-[22px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2 : 1.7}>
          <circle cx="12" cy="12" r="3" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v.1a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
        </svg>
    ),
  },
];

export function BottomNav() {
  const pathname = usePathname();
  const openCapture = useCaptureStore((s) => s.openCapture);

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-30 pb-safe"
      style={{
        background: "rgba(255,253,250,0.75)",
        backdropFilter: "var(--backdrop-blur)",
        WebkitBackdropFilter: "var(--backdrop-blur)",
        borderTop: "0.5px solid rgba(255,255,255,0.5)",
        boxShadow: "0 -1px 0 rgba(0,0,0,0.04), 0 -8px 24px -8px rgba(60,40,30,0.08)",
      }}
    >
      <div className="flex items-center justify-around px-2 h-16">
        {navItems.map((item, i) => {
          if (item === null) {
            return (
              <div key="fab" className="flex justify-center flex-1">
                <button
                  onClick={() => openCapture()}
                  className="-translate-y-3 rounded-full flex items-center justify-center active:scale-95 transition-transform"
                  style={{
                    width: 52,
                    height: 52,
                    background: "linear-gradient(135deg, #FF7A45 0%, #FF5A1F 50%, #FF3D8B 110%)",
                    boxShadow:
                      "0 1px 0 rgba(255,255,255,.4) inset, 0 8px 24px -4px rgba(255,90,31,.55), 0 2px 6px rgba(255,61,139,.25)",
                  }}
                >
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </div>
            );
          }

          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl flex-1 transition-all"
              style={{ color: active ? "#FF5A1F" : "#9A8F84" }}
            >
              {item.icon(active)}
              <span className="text-[9px] font-semibold" style={{ letterSpacing: "-.005em" }}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
