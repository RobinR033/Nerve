# Overleggen → Nerve: zo zet je het aan

De lopende band van opname tot actiesuggestie in Nerve:

```
iPhone (Opdracht "Overleg opnemen")
   │  opname in iCloud Drive/Nerve-Inbox
   ▼
MacBook – transcriptie-app            ← "postkamer": werkt zodra de Mac aan staat
   │  Whisper op de Mac (gratis, audio blijft lokaal)
   │  claude -p → verslag + acties (je eigen Claude-abonnement)
   ▼
Nerve – /api/integrations/meetings
   │  map-voorstel (gratis regels, geen AI)
   ▼
Dashboard "Uit overleggen"            ← jij keurt goed: ✓ taak, ✎ aanpassen, ✕ kaf
```

Kosten: €0 per overleg via deze route. Alleen geplakte aantekeningen in Nerve
(knop **+ Aantekening**) gebruiken de Claude API voor het vinden van acties:
een paar cent per stuk.

---

## Stap 1 — Database bijwerken (eenmalig, ±2 minuten)

1. Open je Supabase-project → **SQL Editor** → **New query**.
2. Plak de inhoud van `supabase/migrations/004_meetings.sql` en klik **Run**.

Dit maakt drie nieuwe tabellen (overleggen, mappen, actiesuggesties) en twee
extra kolommen bij taken (`waiting_for` voor "wacht op", en herkomst).
Alle tabellen hebben Row Level Security aan.

## Stap 2 — Sleutel instellen in Vercel (eenmalig)

De sleutel is een soort wachtwoord tussen de transcriptie-app en Nerve.

1. Maak een lange willekeurige sleutel, bijv. in Terminal: `openssl rand -hex 32`
2. Vercel → je Nerve-project → **Settings → Environment Variables**:
   - `MEETINGS_WEBHOOK_SECRET` = die sleutel
3. Opnieuw deployen (Vercel → Deployments → Redeploy).

## Stap 3 — Claude Code op de Mac (eenmalig)

De app gebruikt `claude -p` om het verslag te maken, met je eigen abonnement.

1. Installeer Claude Code (zie claude.com/claude-code) als dat nog niet zo is.
2. Open Terminal, typ `claude` en log in. Daarna kun je Terminal sluiten.

## Stap 4 — Transcriptie-app instellen (eenmalig)

Open de app → **Instellingen** → blok **Nerve**:

1. **Adres van Nerve**: bijv. `https://jouw-nerve.vercel.app`
2. **Sleutel**: dezelfde als in stap 2
3. **Je eigen naam**: zodat Claude "jouw" acties scheidt van die van anderen
4. Klik **Verbinding testen** → "Verbinding met Nerve werkt ✓"
5. Vink **Nieuwe transcripties automatisch naar Nerve sturen** aan
6. **Kies inbox-map…** → maak in iCloud Drive een map `Nerve-Inbox` en kies die

"Volledig transcript meesturen" staat standaard uit: dan gaan alleen het
verslag en de acties naar Nerve. Zet het aan als je ook het ruwe transcript in
Nerve wilt kunnen teruglezen.

Bij elk transcript staat ook een knop **Naar Nerve** om er handmatig een te sturen
(bijv. oudere opnames, of als het automatisch versturen mislukte).

## Stap 5 — iPhone: Opdracht "Overleg opnemen" (eenmalig, ±5 minuten)

Open de app **Opdrachten** (Shortcuts) → **+** en voeg deze acties toe:

1. **Vraag om invoer**: tekst, vraag "Welk overleg?"
   (tip: typ de mapnaam, bijv. "Weekly MT" of "Bila Jan" — dan stelt Nerve meteen
   de goede map voor)
2. **Neem audio op**: Begin opnemen *Onmiddellijk*, Stop *Bij tik*
3. **Wijzig naam van** *Opgenomen audio* naar *Gevraagde invoer*
4. **Bewaar bestand** → iCloud Drive / `Nerve-Inbox`, "Vraag waar te bewaren" uit

Noem de opdracht "Overleg opnemen" en zet hem op je beginscherm of onder de
Actieknop. Klaar: één tik om op te nemen, de rest gaat vanzelf.

> Gebruik je liever Dictafoon? Deel de opname → **Bewaar in Bestanden** →
> `Nerve-Inbox`. Geeft de bestandsnaam niets prijs ("Nieuwe opname 12"), dan
> neemt de app de titel over die Claude voorstelt.

---

## Zo werkt het daarna, elke dag

- Nieuwe overleggen verschijnen op het dashboard onder **Uit overleggen** (in
  werk-modus).
- Per overleg één kaart: het **mapvoorstel** (oranje omrand) en de
  **actiesuggesties**.
  - ✓ = wordt een taak. Ligt de actie bij iemand anders ("naja → Jan"), dan
    komt hij onder **Wacht op** op je dashboard, gegroepeerd per persoon.
  - ✎ = eerst aanpassen (tekst, wie, datum).
  - ✕ = kaf, weg ermee (terug te zetten).
- **Opbergen** zet het overleg in de gekozen map en haalt de kaart weg.
  Suggesties die je niet hebt gekozen, vervallen.
- Onder **Overleggen** (zijbalk) vind je alles terug in mappen: Projecten,
  Personen, Overlegreeksen, Overig — met submappen en zoeken.
  Bij een persoonsmap zie je ook overleggen elders waar die persoon bij was.

### Hoe Nerve een map voorstelt (zonder AI, dus gratis)

In deze volgorde:
1. Map die je zelf koos bij **+ Aantekening**
2. Eerder overleg met dezelfde titel (datums tellen niet mee) → dezelfde map
3. Mapnaam staat als los woord in de titel ("Weekly MT 6 okt" → *Weekly MT*)
4. Precies één andere deelnemer met een eigen persoonsmap → die bila-map

De naam die je in de iPhone-opdracht typt wordt de titel, en telt dus mee bij
regel 2 en 3. Hoe vaker je opbergt, hoe beter de voorstellen.

---

## Voor ontwikkelaars: het datacontract

`POST /api/integrations/meetings` met `Authorization: Bearer <MEETINGS_WEBHOOK_SECRET>`.
`GET` op hetzelfde adres = verbindingstest (slaat niets op).

```json
{
  "external_id": "transcriptie-tool:<job-id>",
  "source": "transcriptie-tool",
  "title": "Bila Jan",
  "held_at": "2026-10-06T08:15:00Z",
  "participants": ["Robin", "Jan"],
  "summary": "## Besproken punten\n- …",
  "transcript": null,
  "folder_hint": null,
  "owner_name": "Robin",
  "actions": [
    { "text": "Offerte sturen", "owner": "other", "person": "Jan",
      "deadline": "2026-10-10", "quote": "ik stuur de offerte vrijdag" }
  ]
}
```

- `summary` of `transcript` is verplicht.
- `actions` weglaten = Nerve haalt zelf acties uit de tekst (Claude API);
  `[]` = bewust geen acties.
- Idempotent op `external_id`: twee keer sturen maakt geen dubbel overleg.
- Schema: `lib/utils/meetingPayload.ts`. Opslag: `lib/supabase/meetingsIngest.ts`.
