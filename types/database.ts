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
  completed_at: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type TaskInsert = Omit<Task, "id" | "user_id" | "created_at" | "updated_at">;
export type TaskUpdate = Partial<TaskInsert>;

// Supabase Database type — exact formaat dat supabase-js verwacht
export type Database = {
  public: {
    Tables: {
      tasks: {
        Row: Task;
        Insert: Omit<Task, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Task, "id" | "user_id" | "created_at">>;
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
