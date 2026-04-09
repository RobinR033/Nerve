"use client";

import { useCategoryStore } from "@/stores/categoryStore";
import { TasksClient } from "@/app/(app)/tasks/TasksClient";

export default function TakenPage() {
  const { activeCategory } = useCategoryStore();

  return (
    <TasksClient
      category={activeCategory}
      title={activeCategory === "werk" ? "Werk" : "Privé"}
      showOutlookTab={activeCategory === "werk"}
      hideBoard
    />
  );
}
