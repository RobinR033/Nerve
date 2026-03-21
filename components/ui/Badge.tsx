import type { Priority, TaskStatus } from "@/types/database";

/* ── Priority badge ─────────────────────────────────────── */

const priorityConfig: Record<Priority, { label: string; dot: string; bg: string; text: string }> = {
  urgent: {
    label: "Urgent",
    dot:  "bg-[#FF2020]",
    bg:   "bg-[#FFF0F0]",
    text: "text-[#CC0000]",
  },
  high: {
    label: "Hoog",
    dot:  "bg-orange",
    bg:   "bg-orange-soft",
    text: "text-orange-dark",
  },
  medium: {
    label: "Normaal",
    dot:  "bg-yellow-dark",
    bg:   "bg-yellow-soft",
    text: "text-[#8A6E00]",
  },
  low: {
    label: "Laag",
    dot:  "bg-gray-400",
    bg:   "bg-gray-100",
    text: "text-gray-500",
  },
};

export function PriorityBadge({ priority }: { priority: Priority }) {
  const cfg = priorityConfig[priority];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

/* ── Status badge ───────────────────────────────────────── */

const statusConfig: Record<TaskStatus, { label: string; bg: string; text: string }> = {
  todo: {
    label: "Te doen",
    bg:   "bg-gray-100",
    text: "text-gray-500",
  },
  in_progress: {
    label: "Bezig",
    bg:   "bg-blue-soft",
    text: "text-blue-dark",
  },
  done: {
    label: "Klaar",
    bg:   "bg-green-50",
    text: "text-green-700",
  },
  late: {
    label: "Te laat",
    bg:   "bg-[#FFF0F0]",
    text: "text-[#CC0000]",
  },
};

export function StatusBadge({ status }: { status: TaskStatus }) {
  const cfg = statusConfig[status];
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text}`}
    >
      {cfg.label}
    </span>
  );
}

/* ── Generieke badge ────────────────────────────────────── */

type BadgeProps = {
  children: React.ReactNode;
  variant?: "default" | "orange" | "blue" | "yellow" | "green" | "red";
};

const genericVariants: Record<NonNullable<BadgeProps["variant"]>, string> = {
  default: "bg-gray-100 text-gray-600",
  orange:  "bg-orange-soft text-orange-dark",
  blue:    "bg-blue-soft text-blue-dark",
  yellow:  "bg-yellow-soft text-[#8A6E00]",
  green:   "bg-green-50 text-green-700",
  red:     "bg-[#FFF0F0] text-[#CC0000]",
};

export function Badge({ children, variant = "default" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${genericVariants[variant]}`}
    >
      {children}
    </span>
  );
}
