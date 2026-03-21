# CLAUDE.md — Nerve

> Dit bestand is de centrale context voor Claude Code. Lees dit altijd volledig voordat je iets bouwt, aanpast of adviseert. Wijk hier niet van af zonder expliciete instructie.

---

## 🧠 Wat is Nerve?

Nerve is een persoonlijk task command center — het zenuwcentrum voor dagelijkse taken en focus. Het doel is niet nóg een to-do app bouwen, maar een **intelligente capture- en focustool** die zich aanpast aan hoe Robin werkt.

Nerve moet aanvoelen als een levend systeem: het denkt mee, herkent patronen en helpt de gebruiker elke dag de juiste dingen doen.

**Fase 1 is puur persoonlijk** — één gebruiker, geen team, geen multi-tenant logica.

---

## ⚙️ Tech Stack

### Frontend
- **Framework**: Next.js (App Router)
- **Taal**: TypeScript
- **Styling**: Tailwind CSS
- **Animaties**: Framer Motion
- **State management**: Zustand (lichtgewicht, geen Redux overhead)
- **Forms / validatie**: React Hook Form + Zod

### Backend / API
- **Runtime**: Next.js API Routes (geen aparte backend in fase 1)
- **AI**: Anthropic Claude API (claude-sonnet-4-20250514)
  - Voor: prioriteit suggesties, deadline extractie uit tekst/foto, dagelijkse focuslijst, patroonherkenning

### Database
- **Primair**: Supabase (PostgreSQL)
  - Auth: Supabase Auth (magic link / Google OAuth)
  - Storage: Supabase Storage (voor foto/screenshot uploads)
  - Realtime: optioneel later voor notificaties

### Integraties (later)
- Outlook (Microsoft Graph API) — e-mail capture
- Browser extensie (Chrome/Edge) — quick capture vanuit browser
- Spraak input — Web Speech API of Whisper API

---

## 🗂️ Mappenstructuur

```
nerve/
├── app/                        # Next.js App Router
│   ├── (auth)/                 # Login / onboarding pagina's
│   ├── (app)/                  # Hoofdapp (authenticated)
│   │   ├── dashboard/          # Dagelijks overzicht + focuslijst
│   │   ├── tasks/              # Takenbeheer (lijst, filters, detail)
│   │   └── capture/            # Quick capture interface
│   └── api/                    # API routes
│       ├── tasks/              # CRUD voor taken
│       ├── ai/                 # AI endpoints (prioriteit, focus, extract)
│       └── integrations/       # Outlook, extensie webhook etc.
├── components/
│   ├── ui/                     # Herbruikbare UI primitives
│   ├── tasks/                  # Taak-specifieke componenten
│   ├── capture/                # Capture modals / widgets
│   └── ai/                     # AI suggestie UI
├── lib/
│   ├── supabase/               # Supabase client + helpers
│   ├── ai/                     # Claude API wrappers
│   └── utils/                  # Gedeelde utilities
├── hooks/                      # Custom React hooks
├── stores/                     # Zustand stores
├── types/                      # Globale TypeScript types
└── CLAUDE.md                   # ← dit bestand
```

---

## 🎨 Designprincipes

### Karakter
Nerve is **kleurrijk, energiek en intentioneel**. Het voelt niet aan als een zakelijke tool, maar als een persoonlijk systeem met persoonlijkheid. Denk aan de energie van een goed ontworpen sport- of muziekapp — niet saai, wel overzichtelijk.

### Visuele richting
- **Kleurenpalet**: Levendige accentkleuren (bijv. elektrisch oranje, intens geel, fel blauw) op een heldere lichte achtergrond. Geen pastelkleuren, geen grijs-op-grijs.
- **Typografie**: Karaktervolle display font voor titels/acties (bijv. Syne, Cabinet Grotesk, Chillax). Scherp leesbaar voor body tekst. Nooit Inter of Roboto.
- **Animaties**: Betekenisvolle micro-interacties bij het toevoegen, afronden en prioriteren van taken. Framer Motion voor entrance/exit animaties.
- **Lay-out**: Ruimtelijk maar met duidelijke hiërarchie. Gebruik grid-breaking elementen voor de hero/dashboard view. Niet alles netjes in een raster.
- **Licht-first**: Standaard light mode met een heldere, energieke uitstraling. Dark mode optioneel later.

### UI-principes
1. **Capture is heilig** — de snelste route naar een nieuwe taak mag nooit meer dan 2 seconden kosten.
2. **Geen UI-ruis** — toon alleen wat nu relevant is. Verberg complexiteit achter progressive disclosure.
3. **AI is assistent, niet baas** — suggesties zijn altijd zichtbaar als suggesties, nooit als automatische acties zonder bevestiging.
4. **Energiek maar niet afleidend** — animaties versterken, ze onderbreken nooit de flow.

### Taakgedrag & statussen
- Taken worden afgevinkt met een vinkje — met een korte animatie als beloning.
- Afgeronde taken verdwijnen uit de actieve lijst maar worden **altijd bewaard in een archief**. Nooit permanent verwijderd tenzij de gebruiker dat expliciet doet.
- Taken met een deadline die niet zijn afgerond, schuiven automatisch door naar een **"Te laat" categorie** — zichtbaar als een aparte sectie in het dashboard. Geen stille verdwijning, maar ook geen paniek: rustige maar duidelijke signalering.
- Dit "sneeuwschuiver-mechanisme" draait dagelijks (via een geplande job of bij het openen van de app): alles wat gisteren niet af was, belandt in "Te laat".

### Notificaties
Nerve heeft drie vaste notificatiemomenten op doordeweekse dagen (ma-vr):

1. **08:50 — Dagstart push**: AI-gegenereerde focuslijst voor die dag. Wat zijn de 3-5 prioriteiten? Zijn er taken die gisteren zijn blijven liggen?
2. **Op het moment zelf — Deadline push**: Als een taak een specifiek tijdstip heeft (bijv. "vergadering om 14:00"), stuurt Nerve een pushmelding op dat tijdstip.
3. **16:50 — Wrap-up push**: Wat is er afgerond vandaag? Wat schuift door? Een kort dagoverzicht als afsluiter.

Notificatietijden zijn aanpasbaar in de instellingen, maar bovenstaande zijn de slimme defaults.

---

## 🗺️ Roadmap

### Fase 1 — Fundament (MVP)
**Doel**: werkende kern, dagelijks bruikbaar voor één gebruiker.

- [ ] Supabase setup (auth, database schema, storage)
- [ ] Taak CRUD: aanmaken, bewerken, verwijderen, afronden
- [ ] Metadata per taak: prioriteit, categorie/project, deadline, context, tags
- [ ] Dashboard: dagelijks overzicht + handmatige focuslijst
- [ ] Quick capture: keyboard shortcut + modal
- [ ] Basisdesign systeem (kleuren, typografie, componenten)

### Fase 2 — AI-laag
**Doel**: Nerve denkt actief mee.

- [ ] Claude API integratie
- [ ] Automatische prioriteitssuggestie bij aanmaken taak
- [ ] Deadline extractie uit vrije tekst ("vrijdag", "volgende week")
- [ ] Dagelijkse AI-gegenereerde focuslijst (max 3-5 taken)
- [ ] Patroonherkenning: welke taken blijven liggen? Welke context werkt het beste?

### Fase 3 — Capture uitbreiden
**Doel**: overal en snel kunnen invoeren.

- [ ] Foto/screenshot upload → AI extraheert taak + deadline
- [ ] Spraak input → transcriptie → taak aanmaken
- [ ] Browser extensie (Chrome/Edge) voor quick capture
- [ ] Outlook koppeling via Microsoft Graph API (e-mail → taak)

### Fase 4 — Verdieping & polish
**Doel**: systeem rijpt mee met gebruik.

- [ ] Terugkerende taken + templates
- [ ] Geavanceerde filtering en zoeken
- [ ] Weekoverzicht / review modus
- [ ] Exporteren (PDF, CSV)
- [ ] Optioneel: team/collega toegang (multi-user)

---

## 📐 Codeafspraken

- **TypeScript strict mode** aan. Geen `any` tenzij echt onvermijdelijk.
- **Componenten** zijn klein en enkelvoudig van verantwoordelijkheid.
- **API routes** valideren altijd input via Zod schemas.
- **Supabase queries** zitten nooit direct in componenten — altijd via `lib/supabase/`.
- **AI calls** zitten altijd in `lib/ai/` — nooit inline in componenten of API routes.
- **Commentaar** in het Nederlands is prima, code zelf in het Engels.
- Gebruik **geen** class components. Alleen functional components met hooks.

---

## 🔐 Beveiliging & privacy

- Alle Supabase tabellen hebben Row Level Security (RLS) aan.
- API keys staan **nooit** in de client-side code — altijd via `.env.local` en server-side.
- In fase 1 is er maar één gebruiker, maar bouw alsof er meer komen (RLS vanaf dag 1).

---

*Laatste update: maart 2026 — Robin*
