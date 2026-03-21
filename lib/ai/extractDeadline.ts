import Anthropic from "@anthropic-ai/sdk";

type DeadlineResult = {
  deadline: string | null;       // ISO 8601 datetime string
  deadline_has_time: boolean;
  original: string;
};


/**
 * Extraheer een deadline uit vrije tekst.
 * Bijv. "vrijdag", "volgende week maandag", "morgen 14:00" → ISO datetime
 */
export async function extractDeadline(
  text: string,
  referenceDate?: string
): Promise<DeadlineResult> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const today = referenceDate ?? new Date().toISOString().split("T")[0];

  const message = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 256,
    messages: [
      {
        role: "user",
        content: `Vandaag is ${today}. Extraheer de deadline uit de volgende tekst en geef terug als JSON.

Tekst: "${text}"

Geef ALLEEN een JSON object terug, geen uitleg:
{
  "deadline": "<ISO 8601 datum of datum+tijd, of null als er geen deadline in staat>",
  "deadline_has_time": <true als er een specifiek tijdstip is, anders false>,
  "original": "${text}"
}

Voorbeelden:
- "vrijdag" → deadline = aankomende vrijdag
- "morgen 14:00" → deadline = morgen 14:00, deadline_has_time = true
- "volgende week" → deadline = maandag van volgende week
- "geen deadline" → deadline = null`,
      },
    ],
  });

  const raw = message.content[0].type === "text" ? message.content[0].text : "";

  try {
    const parsed = JSON.parse(raw.trim());
    return {
      deadline: parsed.deadline ?? null,
      deadline_has_time: parsed.deadline_has_time ?? false,
      original: text,
    };
  } catch {
    return { deadline: null, deadline_has_time: false, original: text };
  }
}
