import { create } from "zustand";

type CaptureStore = {
  open: boolean;
  openCapture: () => void;
  closeCapture: () => void;
};

export const useCaptureStore = create<CaptureStore>((set) => ({
  open: false,
  openCapture: () => set({ open: true }),
  closeCapture: () => set({ open: false }),
}));
