export type Priority = "low" | "medium" | "high" | "urgent";
export type TaskStatus = "todo" | "in_progress" | "done" | "late";

export type Task = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  priority: Priority;
  status: TaskStatus;
  deadline: string | null;        // ISO timestamp
  deadline_has_time: boolean;     // Of het deadline een specifiek tijdstip heeft
  project: string | null;
  context: string | null;         // bijv. @thuis, @computer, @bellen
  tags: string[];
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type TaskInsert = Omit<Task, "id" | "user_id" | "created_at" | "updated_at">;
export type TaskUpdate = Partial<TaskInsert>;

// Supabase Database type — uitbreiden naarmate er meer tabellen bijkomen
export type Database = {
  public: {
    Tables: {
      tasks: {
        Row: Task;
        Insert: Omit<Task, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Task, "id" | "user_id" | "created_at">>;
      };
    };
    Enums: {
      priority: Priority;
      task_status: TaskStatus;
    };
  };
};
