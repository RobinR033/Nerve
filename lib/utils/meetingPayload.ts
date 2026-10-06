import { z } from "zod";

// Gedeeld schema voor overleggen die binnenkomen via webhook (transcriptie-tool)
// of handmatig (geplakte aantekeningen). Validatie gebeurt in de API routes.
export const meetingActionSchema = z.object({
  text: z.string().trim().min(2).max(300),
  owner: z.enum(["me", "other"]).default("me"),
  person: z.string().trim().max(120).nullish(),
  deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}/).nullish(),
  quote: z.string().max(600).nullish(),
});

export const meetingPayloadSchema = z.object({
  external_id: z.string().trim().min(1).max(200).nullish(),
  source: z.string().trim().min(1).max(60).default("transcriptie-tool"),
  title: z.string().trim().min(1).max(300),
  held_at: z.iso.datetime({ offset: true }).optional(),
  participants: z.array(z.string().trim().min(1).max(120)).max(50).default([]),
  summary: z.string().max(200_000).nullish(),
  transcript: z.string().max(1_000_000).nullish(),
  folder_hint: z.string().trim().max(200).nullish(),
  owner_name: z.string().trim().max(120).nullish(),
  // undefined = Nerve haalt zelf acties eruit (AI); [] = bewust geen acties
  actions: z.array(meetingActionSchema).max(50).optional(),
}).refine((p) => Boolean(p.summary?.trim() || p.transcript?.trim()), {
  message: "summary of transcript is verplicht",
});

export type MeetingPayload = z.infer<typeof meetingPayloadSchema>;
