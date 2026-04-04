import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { fetchReminderLists } from "@/lib/apple/caldav";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// POST — haal beschikbare Reminders-lijsten op voor de ingevoerde credentials
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Ongeldige invoer" }, { status: 400 });
  }

  const { email, password } = parsed.data;

  try {
    const lists = await fetchReminderLists(email, password);
    return NextResponse.json({ lists });
  } catch (err) {
    console.error("Apple CalDAV lists fout:", err);
    return NextResponse.json(
      { error: "Kan niet verbinden met iCloud. Controleer je gegevens." },
      { status: 401 }
    );
  }
}
