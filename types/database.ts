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
  apple_reminder_uid: string | null;
  parent_id: string | null;
  completed_at: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type TaskInsert = Omit<Task, "id" | "user_id" | "created_at" | "updated_at" | "parent_id" | "apple_reminder_uid" | "outlook_message_id"> & {
  parent_id?: string | null;
  apple_reminder_uid?: string | null;
  outlook_message_id?: string | null;
};
export type TaskUpdate = Partial<TaskInsert>;

export type ProjectType = "project" | "interne_activiteit";

export type Project = {
  id: string;
  user_id: string;
  name: string;
  color: string;
  type: ProjectType;
  status_note: string | null;
  created_at: string;
};

export type ProjectUpdate = Partial<Pick<Project, "name" | "color" | "type" | "status_note">>;

// Kleurpresets — gelijkmatig verdeeld over de kleurencirkel, maximaal onderscheidend
export const PROJECT_COLOR_PRESETS = [
  { label: "Rood",   color: "#EF4444" }, //   0° — helder rood
  { label: "Oranje", color: "#F97316" }, //  30° — oranje
  { label: "Geel",   color: "#EAB308" }, //  50° — geel
  { label: "Limoen", color: "#84CC16" }, //  85° — limoengroen (duidelijk anders dan groen)
  { label: "Groen",  color: "#22C55E" }, // 142° — groen
  { label: "Cyan",   color: "#06B6D4" }, // 192° — cyaan (duidelijk anders dan blauw)
  { label: "Blauw",  color: "#3B82F6" }, // 217° — blauw
  { label: "Paars",  color: "#A855F8" }, // 270° — paars (meer magenta toon dan blauw)
  { label: "Roze",   color: "#EC4899" }, // 322° — felroze
  { label: "Grijs",  color: "#6B7280" }, //  —   — neutraal
] as const;

// Supabase Database type
export type Database = {
  public: {
    Tables: {
      tasks: {
        Row: Task;
        Insert: Omit<Task, "id" | "created_at" | "updated_at" | "parent_id" | "apple_reminder_uid" | "outlook_message_id"> & {
          parent_id?: string | null;
          apple_reminder_uid?: string | null;
          outlook_message_id?: string | null;
        };
        Update: Partial<Omit<Task, "id" | "user_id" | "created_at">>;
        Relationships: [];
      };
      projects: {
        Row: Project;
        Insert: Omit<Project, "id" | "created_at">;
        Update: Partial<Omit<Project, "id" | "user_id" | "created_at">>;
        Relationships: [];
      };
      apple_integrations: {
        Row: {
          id: string;
          user_id: string;
          apple_id_email: string;
          app_password_id: string;
          selected_list_urls: string[];
          selected_list_names: string[];
          last_synced_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: never; // altijd via upsert_apple_integration RPC
        Update: { last_synced_at?: string | null };
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
      upsert_apple_integration: {
        Args: {
          p_apple_id_email: string;
          p_app_password: string;
          p_selected_list_urls: string[];
          p_selected_list_names: string[];
        };
        Returns: undefined;
      };
      delete_apple_integration: {
        Args: Record<string, never>;
        Returns: undefined;
      };
      get_my_apple_integration: {
        Args: Record<string, never>;
        Returns: { apple_id_email: string; app_password: string; selected_list_urls: string[] }[];
      };
      get_all_apple_integrations_admin: {
        Args: Record<string, never>;
        Returns: { user_id: string; apple_id_email: string; app_password: string; selected_list_urls: string[] }[];
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
