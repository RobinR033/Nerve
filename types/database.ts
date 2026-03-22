export type Priority = "low" | "medium" | "high" | "urgent";
export type TaskStatus = "todo" | "in_progress" | "done" | "late";
export type Recurrence = "daily" | "weekdays" | "weekly" | "monthly";
export type Category = "werk" | "prive";

export type Task = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  priority: Priority;
  status: TaskStatus;
  deadline: string | null;
  deadline_has_time: boolean;
  project: string | null;
  context: string | null;
  tags: string[];
  recurrence: Recurrence | null;
  category: Category | null;
  outlook_message_id: string | null;
  parent_id: string | null;
  completed_at: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type TaskInsert = Omit<Task, "id" | "user_id" | "created_at" | "updated_at" | "parent_id"> & {
  parent_id?: string | null;
};
export type TaskUpdate = Partial<TaskInsert>;

export type Project = {
  id: string;
  user_id: string;
  name: string;
  color: string;
  created_at: string;
};

export type ProjectUpdate = Partial<Pick<Project, "name" | "color">>;

// Kleurpresets — subtiele tinten voor overzicht
export const PROJECT_COLOR_PRESETS = [
  { label: "Blauw",  color: "#3B82F6" },
  { label: "Groen",  color: "#16A34A" },
  { label: "Paars",  color: "#7C3AED" },
  { label: "Oranje", color: "#F97316" },
  { label: "Geel",   color: "#D97706" },
  { label: "Roze",   color: "#DB2777" },
  { label: "Teal",   color: "#0D9488" },
  { label: "Rood",   color: "#DC2626" },
  { label: "Indigo", color: "#4F46E5" },
  { label: "Grijs",  color: "#6B7280" },
] as const;

// Supabase Database type
export type Database = {
  public: {
    Tables: {
      tasks: {
        Row: Task;
        Insert: Omit<Task, "id" | "created_at" | "updated_at" | "parent_id"> & { parent_id?: string | null };
        Update: Partial<Omit<Task, "id" | "user_id" | "created_at">>;
        Relationships: [];
      };
      projects: {
        Row: Project;
        Insert: Omit<Project, "id" | "created_at">;
        Update: Partial<Omit<Project, "id" | "user_id" | "created_at">>;
        Relationships: [];
      };
      push_subscriptions: {
        Row: {
          id: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth_key: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth_key: string;
        };
        Update: Partial<{
          endpoint: string;
          p256dh: string;
          auth_key: string;
        }>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      mark_late_tasks: {
        Args: Record<string, never>;
        Returns: undefined;
      };
    };
    Enums: {
      priority: Priority;
      task_status: TaskStatus;
      recurrence: Recurrence;
    };
    CompositeTypes: Record<string, never>;
  };
};
