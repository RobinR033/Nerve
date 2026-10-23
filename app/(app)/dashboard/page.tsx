import { getAuthUser } from "@/lib/supabase/server";
import { DashboardClient } from "./DashboardClient";

export default async function DashboardPage() {
  const user = await getAuthUser();

  const meta = user?.user_metadata;
  const firstName =
    (meta?.full_name as string | undefined)?.split(" ")[0] ??
    (meta?.name as string | undefined)?.split(" ")[0] ??
    "Robin";

  return <DashboardClient firstName={firstName} />;
}
