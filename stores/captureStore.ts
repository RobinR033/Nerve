import { create } from "zustand";
import type { Category } from "@/types/database";

type CaptureStore = {
  open: boolean;
  defaultCategory: Category | null;
  openCapture: (defaultCategory?: Category | null) => void;
  closeCapture: () => void;
};

export const useCaptureStore = create<CaptureStore>((set) => ({
  open: false,
  defaultCategory: null,
  openCapture: (defaultCategory = null) => set({ open: true, defaultCategory }),
  closeCapture: () => set({ open: false, defaultCategory: null }),
}));
