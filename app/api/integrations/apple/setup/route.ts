import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  apple_id_email: z.string().email(),
  app_password: z.string().min(1),
  selected_list_urls: z.array(z.string().url()),
  selected_list_names: z.array(z.string()),
});

// POST — sla integratie op (aanmaken of bijwerken)
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

  const { error } = await supabase.from("apple_integrations").upsert(
    {
      user_id: user.id,
      ...parsed.data,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (error) {
    console.error("Apple setup fout:", error);
    return NextResponse.json({ error: "Opslaan mislukt" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

// DELETE — verwijder de integratie
export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  const { error } = await supabase
    .from("apple_integrations")
    .delete()
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: "Verwijderen mislukt" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
