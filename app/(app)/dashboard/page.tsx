import { createClient } from "@/lib/supabase/server";
import { DashboardClient } from "./DashboardClient";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const meta = user?.user_metadata;
  const firstName =
    (meta?.full_name as string | undefined)?.split(" ")[0] ??
    (meta?.name as string | undefined)?.split(" ")[0] ??
    "daar";

  return <DashboardClient firstName={firstName} />;
}
