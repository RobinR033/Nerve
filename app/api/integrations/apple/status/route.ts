import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET — huidige integratiestatus ophalen
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("apple_integrations")
    .select("apple_id_email, selected_list_names, last_synced_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "Ophalen mislukt" }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ connected: false });
  }

  return NextResponse.json({
    connected: true,
    email: data.apple_id_email,
    listNames: data.selected_list_names,
    lastSyncedAt: data.last_synced_at,
  });
}
