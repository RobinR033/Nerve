"use client";

import { useEffect } from "react";
import { CaptureModal } from "./CaptureModal";
import { useCaptureStore } from "@/stores/captureStore";

export function CaptureProvider({ children }: { children: React.ReactNode }) {
  const { open, openCapture, closeCapture } = useCaptureStore();

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      // ⌘K / Ctrl+K — altijd
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        open ? closeCapture() : openCapture();
        return;
      }
      // "c" — alleen als je niet in een input/textarea/select zit
      if (e.key === "c" && !e.metaKey && !e.ctrlKey) {
        const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
        if (tag !== "input" && tag !== "textarea" && tag !== "select") {
          open ? closeCapture() : openCapture();
        }
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, openCapture, closeCapture]);

  return (
    <>
      {children}
      <CaptureModal open={open} onClose={closeCapture} />
    </>
  );
}
