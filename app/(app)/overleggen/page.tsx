import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { OverleggenClient } from "./OverleggenClient";

export default async function OverleggenPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return <OverleggenClient />;
}
