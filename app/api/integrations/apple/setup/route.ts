import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  apple_id_email: z.string().email(),
  app_password: z.string().min(1),
  selected_list_urls: z.array(z.string().url()),
  selected_list_names: z.array(z.string()),
});

// POST — sla integratie op (wachtwoord wordt versleuteld via Supabase Vault)
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Ongeldige invoer" }, { status: 400 });
  }

  const { error } = await supabase.rpc("upsert_apple_integration", {
    p_apple_id_email: parsed.data.apple_id_email,
    p_app_password: parsed.data.app_password,
    p_selected_list_urls: parsed.data.selected_list_urls,
    p_selected_list_names: parsed.data.selected_list_names,
  });

  if (error) {
    console.error("Apple setup fout:", error);
    return NextResponse.json({ error: "Opslaan mislukt" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

// DELETE — verwijder integratie inclusief het vault-secret
export async function DELETE() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  const { error } = await supabase.rpc("delete_apple_integration");

  if (error) {
    return NextResponse.json({ error: "Verwijderen mislukt" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
