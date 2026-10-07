import { create } from "zustand";
import { fetchMeetingTitles } from "@/lib/supabase/meetings";

type MeetingTitleStore = {
  titles: Record<string, string>;
  loaded: boolean;
  // Eén keer laden; daarna uit het geheugen
  load: () => void;
  setTitle: (id: string, title: string) => void;
};

export const useMeetingTitleStore = create<MeetingTitleStore>((set, get) => ({
  titles: {},
  loaded: false,
  load: () => {
    if (get().loaded) return;
    set({ loaded: true });
    fetchMeetingTitles()
      .then((titles) => set((s) => ({ titles: { ...titles, ...s.titles } })))
      .catch((err) => {
        // Tabel bestaat nog niet of geen verbinding: labels blijven gewoon weg
        console.error("Overlegtitels laden mislukt:", err);
        set({ loaded: false });
      });
  },
  setTitle: (id, title) => set((s) => ({ titles: { ...s.titles, [id]: title } })),
}));
