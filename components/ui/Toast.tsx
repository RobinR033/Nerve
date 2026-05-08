"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useToastStore } from "@/stores/toastStore";

export function ToastContainer() {
  const { toasts, dismiss } = useToastStore();

  return (
    <div
      style={{
        position: "fixed",
        bottom: "calc(env(safe-area-inset-bottom, 0px) + 80px)",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        pointerEvents: "none",
      }}
    >
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            style={{
              pointerEvents: "auto",
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "10px 14px",
              borderRadius: 14,
              background: "rgba(26,20,16,0.88)",
              backdropFilter: "blur(10px) saturate(120%)",
              WebkitBackdropFilter: "blur(10px) saturate(120%)",
              boxShadow: "0 4px 24px -4px rgba(0,0,0,0.3)",
              color: "#fff",
              fontSize: 13.5,
              fontWeight: 500,
              whiteSpace: "nowrap",
            }}
          >
            <span>{toast.message}</span>
            {toast.action && (
              <button
                onClick={() => {
                  toast.action!.onClick();
                  dismiss(toast.id);
                }}
                style={{
                  background: "rgba(255,90,31,0.9)",
                  border: "none",
                  borderRadius: 8,
                  color: "#fff",
                  fontSize: 12.5,
                  fontWeight: 600,
                  padding: "4px 10px",
                  cursor: "pointer",
                  letterSpacing: "-.01em",
                }}
              >
                {toast.action.label}
              </button>
            )}
            <button
              onClick={() => dismiss(toast.id)}
              style={{
                background: "transparent",
                border: "none",
                color: "rgba(255,255,255,0.5)",
                cursor: "pointer",
                padding: 2,
                lineHeight: 1,
                fontSize: 16,
              }}
              aria-label="Sluiten"
            >
              ×
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
