import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Category } from "@/types/database";

interface CategoryStore {
  activeCategory: Category;
  setCategory: (category: Category) => void;
}

export const useCategoryStore = create<CategoryStore>()(
  persist(
    (set) => ({
      activeCategory: "werk",
      setCategory: (category) => set({ activeCategory: category }),
    }),
    { name: "nerve-category" }
  )
);
