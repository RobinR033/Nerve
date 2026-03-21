import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { suggestPriority } from "@/lib/ai/suggestPriority";

const schema = z.object({
  title: z.string().min(2).max(300),
});

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const result = schema.safeParse(body);
  if (!result.success) return NextResponse.json({ error: "Ongeldige invoer" }, { status: 400 });

  const suggestion = await suggestPriority(result.data.title);
  return NextResponse.json(suggestion);
}
