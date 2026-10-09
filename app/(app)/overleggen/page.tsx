import { getAuthUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { OverleggenClient } from "./OverleggenClient";

export default async function OverleggenPage() {
  const user = await getAuthUser();
  if (!user) redirect("/login");
  return <OverleggenClient />;
}
