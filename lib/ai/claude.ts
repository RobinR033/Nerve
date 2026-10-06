import Anthropic from "@anthropic-ai/sdk";
import type {
  BetaContentBlockParam,
  BetaMessage,
  MessageCreateParamsNonStreaming,
} from "@anthropic-ai/sdk/resources/beta/messages/messages";

/**
 * Twee niveaus:
 * - "simple": herkennen/categoriseren (snel invoeren, prio, deadline, acties uit overleg).
 *   Sonnet 5.5 zonder thinking → snel en goedkoop.
 * - "complex": werk dat baat heeft bij nadenken (focuslijst, patronen, samenvattingen).
 *   Opus 5.5 met adaptive thinking.
 * Modellen zijn per niveau te wisselen via env, zonder codewijziging.
 */
export type AiTier = "simple" | "complex";

export const AI_MODELS: Record<AiTier, string> = {
  simple: process.env.ANTHROPIC_MODEL_SIMPLE || "claude-sonnet-5-5",
  complex: process.env.ANTHROPIC_MODEL_COMPLEX || "claude-opus-5-5",
};

// Server-side fallback: wordt een verzoek om veiligheidsredenen geweigerd, dan draait
// de API het automatisch op een ander model (routing per weigeringscategorie).
const FALLBACK_BETA = "server-side-fallback-2026-07-01";

export type AskOptions = {
  tier: AiTier;
  content: string | BetaContentBlockParam[];
  // Bij "complex" telt thinking mee in max_tokens → ruime standaard
  maxTokens?: number;
};

export function buildRequest({ tier, content, maxTokens }: AskOptions): MessageCreateParamsNonStreaming {
  const base = {
    model: AI_MODELS[tier],
    messages: [{ role: "user" as const, content }],
    betas: [FALLBACK_BETA],
    fallbacks: "default" as const,
  };
  if (tier === "simple") {
    return {
      ...base,
      max_tokens: maxTokens ?? 2048,
      // between_tools = geen extended thinking; mag geen andere velden hebben en werkt t/m effort "high"
      thinking: { type: "between_tools" },
      output_config: { effort: "low" },
    };
  }
  return {
    ...base,
    max_tokens: maxTokens ?? 16000,
    thinking: { type: "adaptive" },
    output_config: { effort: "medium" },
  };
}

export class AiError extends Error {}

/** Alle tekstblokken samen; thinking- en fallback-blokken worden overgeslagen. */
export function readText(message: Pick<BetaMessage, "content" | "stop_reason">): string {
  if (message.stop_reason === "refusal") {
    throw new AiError("Claude weigerde dit verzoek");
  }
  const text = message.content
    .flatMap((block) => (block.type === "text" ? [block.text] : []))
    .join("")
    .trim();
  if (!text) {
    throw new AiError(
      message.stop_reason === "max_tokens" ? "Antwoord afgekapt (max_tokens)" : "Leeg antwoord van Claude",
    );
  }
  return text;
}

/** Haalt het JSON-object uit een antwoord, ook als het in een codeblok of tussen tekst staat. */
export function extractJson<T = unknown>(text: string): T {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  const json = start >= 0 && end > start ? text.slice(start, end + 1) : text.trim();
  return JSON.parse(json) as T;
}

let client: Anthropic | null = null;

/** Eén verzoek aan Claude; geeft de antwoordtekst terug of gooit een fout. */
export async function askClaude(options: AskOptions): Promise<string> {
  client ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const message = await client.beta.messages.create(buildRequest(options));
  return readText(message);
}
