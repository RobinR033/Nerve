import { askClaude } from "./claude";
import type { MeetingSource } from "./askMeetings";

const MAX_SUMMARY = 3_000;

/** Projectstatus in max 5 regels, op basis van recente overleggen en open taken. Voorstel, geen automatische actie. */
export async function projectStatus(input: {
  project: string;
  meetings: MeetingSource[];
  openTasks: string[];
  waitingFor: string[];
}): Promise<string> {
  const meetings = input.meetings
    .slice(0, 10)
    .map((m) => `- ${m.heldAt.slice(0, 10)} "${m.title}":\n${(m.summary ?? "(geen verslag)").slice(0, MAX_SUMMARY)}`)
    .join("\n\n");

  const text = await askClaude({
    tier: "simple",
    content: `Schrijf een statusupdate van project "${input.project}" voor de gebruiker zelf (bijv. om snel bij te praten of door te geven aan een leidinggevende).

Recente overleggen (nieuwste eerst):
${meetings || "(geen)"}

Open taken van de gebruiker:
${input.openTasks.map((t) => `- ${t}`).join("\n") || "(geen)"}

Wacht op anderen:
${input.waitingFor.map((t) => `- ${t}`).join("\n") || "(niets)"}

Regels:
- Maximaal 5 korte regels, elk beginnend met "- ".
- Volgorde: waar staat het project, recente besluiten, wat loopt er, risico's/blokkades, eerstvolgende stap.
- Alleen feiten uit de input; verzin niets. Nederlands, zakelijk en kort.
- Geef alleen de regels terug, geen kopje of inleiding.`,
  });
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("- "))
    .slice(0, 5)
    .join("\n") || text.trim();
}
