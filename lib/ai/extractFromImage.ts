import Anthropic from "@anthropic-ai/sdk";

export type ImageExtractResult = {
  title: string;
  deadline: string | null;
  deadline_has_time: boolean;
  project: string | null;
  priority: "low" | "medium" | "high" | "urgent";
  notes: string | null;
};


export async function extractFromImage(
  base64: string,
  mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp",
  referenceDate?: string
): Promise<ImageExtractResult> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const today = referenceDate ?? new Date().toISOString().split("T")[0];

  const message = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 512,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mediaType, data: base64 },
          },
          {
            type: "text",
            text: `Vandaag is ${today}. Analyseer deze afbeelding (screenshot, foto, whiteboard, e-mail, notitie) en extraheer een taak.

Geef ALLEEN JSON terug:
{
  "title": "<korte actie-gerichte taaknaam, max 10 woorden, Nederlands>",
  "deadline": "<ISO 8601 datum of datum+tijd, of null>",
  "deadline_has_time": <true/false>,
  "project": "<projectnaam als duidelijk zichtbaar, anders null>",
  "priority": "urgent"|"high"|"medium"|"low",
  "notes": "<extra context in 1 zin als nuttig, anders null>"
}`,
          },
        ],
      },
    ],
  });

  const raw = message.content[0].type === "text" ? message.content[0].text : "";

  try {
    const parsed = JSON.parse(raw.trim());
    return {
      title: parsed.title ?? "Taak uit afbeelding",
      deadline: parsed.deadline ?? null,
      deadline_has_time: parsed.deadline_has_time ?? false,
      project: parsed.project ?? null,
      priority: parsed.priority ?? "medium",
      notes: parsed.notes ?? null,
    };
  } catch {
    return {
      title: "Taak uit afbeelding",
      deadline: null,
      deadline_has_time: false,
      project: null,
      priority: "medium",
      notes: null,
    };
  }
}
