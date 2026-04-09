"use client";

import { useCategoryStore } from "@/stores/categoryStore";

export function CategoryToggle() {
  const { activeCategory, setCategory } = useCategoryStore();

  return (
    <div className="flex items-center bg-gray-100 rounded-xl p-0.5 gap-0.5">
      <button
        onClick={() => setCategory("werk")}
        className={[
          "px-3 py-1.5 rounded-[10px] text-xs font-semibold transition-all",
          activeCategory === "werk"
            ? "bg-white text-gray-900 shadow-sm"
            : "text-gray-400 hover:text-gray-600",
        ].join(" ")}
      >
        Werk
      </button>
      <button
        onClick={() => setCategory("prive")}
        className={[
          "px-3 py-1.5 rounded-[10px] text-xs font-semibold transition-all",
          activeCategory === "prive"
            ? "bg-white text-gray-900 shadow-sm"
            : "text-gray-400 hover:text-gray-600",
        ].join(" ")}
      >
        Privé
      </button>
    </div>
  );
}
