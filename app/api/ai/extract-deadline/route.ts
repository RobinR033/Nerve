import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { extractDeadline } from "@/lib/ai/extractDeadline";

const schema = z.object({
  text: z.string().min(1).max(500),
});

export async function POST(req: NextRequest) {
  // Auth check
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Valideer input
  const body = await req.json();
  const result = schema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: "Ongeldige invoer" }, { status: 400 });
  }

  const deadline = await extractDeadline(result.data.text);
  return NextResponse.json(deadline);
}
