import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { extractFromImage } from "@/lib/ai/extractFromImage";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;
type AllowedType = (typeof ALLOWED_TYPES)[number];

const schema = z.object({
  base64: z.string().min(10),
  mediaType: z.enum(ALLOWED_TYPES),
});

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const result = schema.safeParse(body);
  if (!result.success) return NextResponse.json({ error: "Ongeldige invoer" }, { status: 400 });

  const extracted = await extractFromImage(result.data.base64, result.data.mediaType as AllowedType);
  return NextResponse.json(extracted);
}
