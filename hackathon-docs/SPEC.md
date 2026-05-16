# NEXUS — Technical Specification

> **AI Relationship Operating System for innovation ecosystems.**
> *"No ratings. Only actions. NEXUS remembers."*

Built for the **MyHack 2026** hackathon, targeting use-cases like **Cradle Fund's**
mentor-startup matching programmes (CIP).

---

## 1. Product Overview

### 1.1 Problem
Innovation programmes (accelerators, grant bodies, VC scouts) spend enormous
manual effort on three problems:

1. **Triage** — sifting through pitch decks to find investable startups.
2. **Matchmaking** — pairing startups with the *right* mentor based on real
   expertise overlap, not gut feel.
3. **Relationship Health** — knowing which mentor-startup pairs are working and
   which are silently dying. Today this is invisible until the cohort ends.

### 1.2 Solution
NEXUS is a relationship-graph platform that:

- Ingests pitch decks (PDF) and uses **Gemini** to extract structured tags +
  score quality across 4 dimensions.
- Generates **AI-reasoned matches** between startups and mentors with a
  natural-language justification per edge.
- Tracks **relationship health** continuously via observable signals
  (milestone completions, platform messages, days-since-interaction) and
  surfaces a Gemini-generated narrative ("this pair is decaying because…").
- Visualises the entire programme as a live **graph** for the programme
  manager, with at-risk relationships flagged automatically.

### 1.3 Personas
| Role | Primary surface | Goal |
|---|---|---|
| **Startup** | `/dashboard`, `/profile`, `/matches`, `/qr` | Upload deck, get matched, complete milestones |
| **Mentor** | `/dashboard`, `/profile`, `/matches`, `/qr` | Be matched with relevant startups, log mentoring activity |
| **Programme Manager (admin)** | `/admin/dashboard`, `/admin/programme` | Create programmes, trigger matching, monitor cohort health |

---

## 2. Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | **Next.js 16.2.6** (App Router) | See `AGENTS.md` — this is a *breaking-change* version; consult `node_modules/next/dist/docs/` before changes |
| Runtime | React 19.2.4 | Client components + Server route handlers |
| Styling | Tailwind CSS v4 (`@tailwindcss/postcss`) | Dark theme (`bg-gray-950`) throughout |
| Auth | Firebase Auth (Google OAuth) | Client SDK only |
| Database | Firebase Firestore | Client SDK for reads, Admin SDK for AI write-backs |
| Storage | Firebase Storage | Pitch deck PDFs at `pitch-decks/{uid}/{filename}` |
| AI | `@google/genai` (Gemini 2.0 Flash + 2.5 Pro + Embeddings) | Extraction, reasoning, and profile vectorisation |
| Graph viz | Cytoscape 3.33 (`cose` layout) | Admin ecosystem graph |
| QR | `qrcode.react` + `html5-qrcode` | Badge generation + scan |
| Language | TypeScript 5 | Strict types via `src/lib/types.ts` |

**No tests.** No linting beyond `eslint-config-next`. No CI configured.

---

## 3. Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                         BROWSER (Next.js)                        │
│  Client Components -> Firestore (read) + Firebase Auth + Storage  │
└──────────────────────────────────┬───────────────────────────────┘
                                   │
                  ┌────────────────┴────────────────┐
                  │                                 │
                  ▼                                 ▼
        ┌───────────────────┐             ┌────────────────────┐
        │  Next.js API      │             │  Firebase services │
        │  Route Handlers   │             │  (Auth/Firestore/  │
        │  (Node runtime)   │             │   Storage)         │
        └─────────┬─────────┘             └────────────────────┘
                  │
                  ▼
        ┌───────────────────┐
        │  Gemini AI        │
        │  (2.0 Flash /     │
        │   2.5 Pro /       │
        │   Embeddings)     │
        └───────────────────┘
```

### 3.1 Data flow — Pitch deck ingestion
1. Startup uploads PDF -> Firebase Storage (client SDK, `profile/page.tsx`).
2. `pitch_deck_url` written to user doc.
3. Client calls `/api/extract-deck`.
4. Route handler fetches PDF -> base64 -> Gemini `generateContent`
   (two sequential calls: tag extraction, quality score).
5. Admin SDK writes `tags`, `quality_score`, `quality_breakdown`,
   `quality_summary` back to `users/{uid}`.
6. Fire-and-forget call to `/api/embed-profile` to generate profile embedding.

### 3.2 Data flow — Match generation
1. Admin selects a programme and clicks **"Generate Matches"**.
2. POST `/api/generate-matches { programmeId }`.
3. Server queries qualified startups (`quality_score >= threshold`) and all
   mentors via Admin SDK.
4. Builds compact JSON payload -> Gemini 2.5 Pro -> returns
   `{startup_id, mentor_id, edge_weight, match_narrative}[]`.
5. Each match written as a `relationships` doc (batched), initial
   `health_score: 50`, `milestones_total: 4`.

### 3.3 Data flow — Health narration
1. User completes a milestone (`/matches/[id]`).
2. Client updates `milestones.{status,completed_at}`, writes a `signals` doc,
   increments `milestones_completed`, bumps `health_score` by +8 (capped at 100).
3. Fire-and-forget POST to `/api/health-narration { relationshipId }`.
4. Server reads relationship + milestones + computes days-since-interaction ->
   Gemini 2.0 Flash -> returns `{narration, trend}`.
5. Admin SDK updates `health_narration`, `health_trend`, `last_health_update`.

### 3.4 Data flow — Profile embedding
1. Profile saved or milestone completed.
2. Client or API calls `/api/embed-profile { userId }`.
3. Route handler reads user profile + engagement stats from Firestore.
4. Builds text description (profile fields + outcome data).
5. Gemini Embedding API -> 768-dim vector.
6. Vector stored in `users/{uid}.embedding`.

### 3.5 Data flow — Similarity scoring
1. `/api/graph-score { startupId, targetType, topK }`.
2. Reads startup embedding + all target-type embeddings from Firestore.
3. Cosine similarity on vectors, rank top-k.
4. Falls back to metadata matching when embeddings unavailable.

### 3.6 Authentication & routing
- Single `AuthProvider` (`src/lib/auth-context.tsx`) wraps the app in
  `src/app/layout.tsx`.
- `onAuthStateChanged` loads the matching `users/{uid}` doc into `profile`.
- Per-page client-side gates via `useEffect`:
  - No user -> `/`.
  - User + no profile -> `/auth/role-select`.
  - `admin` -> `/admin/dashboard`.
  - others -> `/dashboard`.
- **No server-side auth checks.** API routes accept any payload (see §8 Security).

---

## 4. Data Model (Firestore)

All collections are flat under the project root. IDs are auto-generated except
for users (Firebase Auth UID) and seeded fixtures.

### `users/{uid}` — `UserProfile`
```ts
{
  uid, role: "startup"|"mentor"|"admin",
  name, email, bio, industry,
  created_at,

  // startup
  pitch_deck_url?, tags?: StartupTags,
  quality_score?: number, quality_breakdown?: QualityBreakdown,
  quality_summary?: string,

  // mentor
  expertise_areas?: string[],
  years_experience?: number,
  past_mentoring?: string,

  // embeddings (both roles)
  embedding?: number[],              // 768-dim Gemini vector
  embedding_model?: string,          // "text-embedding-004"
  embedding_updated_at?: string,
}
```

`StartupTags` = `{industry, stage, tech_stack[], funding_ask, team_size, key_problem, unique_value_prop}`
`QualityBreakdown` = `{problem_clarity, market_size, team_strength, mvp_readiness}` each 0-25, total 0-100.

### `programmes/{id}` — `Programme`
`{name, description, status:"active"|"completed", match_threshold, created_by, created_at}`

### `relationships/{id}` — `Relationship`
The core entity. One per mentor-startup pair within a programme.
```ts
{
  mentor_id, startup_id, programme_id,
  created_at, last_active_at,

  health_score: 0..100,
  health_trend: "improving"|"stable"|"decaying",
  health_narration: string,
  last_health_update,

  platform_messages_sent, milestones_total, milestones_completed,

  edge_weight: 0..100,        // AI match compatibility
  match_narrative: string,    // why this pair

  outcome_status: "active"|"completed"|"terminated",
}
```

### `milestones/{id}` — `Milestone`
`{relationship_id, blueprint_type:"Business"|"Tech"|"Management"|"Certification", title, description, status:"pending"|"completed", due_at, completed_at}`

### `signals/{id}` — `Signal`
`{relationship_id, signal_type:"message"|"milestone_complete", actor_id, timestamp, metadata}`
Event log; currently only `milestone_complete` is written (see §7).

---

## 5. API Surface (Next.js route handlers)

All routes are `POST`, Node runtime, return JSON. None are authenticated.

### `POST /api/extract-deck`
**In:** `{pitchDeckUrl, userId}`
**Action:** Fetch PDF -> base64 -> 2x Gemini 2.0 Flash calls (extraction + quality).
**Out:** `{success, tags, quality_score, quality_breakdown}` or `{error}` (400/500).
**Side effect:** Updates `users/{userId}`. Triggers `/api/embed-profile`.

### `POST /api/generate-matches`
**In:** `{programmeId}`
**Action:** Read startups + mentors -> Gemini 2.5 Pro -> write `relationships`.
**Out:** `{success, matchCount}` or `{error}`.
**Constraints (in prompt):** 1 mentor per startup, mentors capped at 3 matches.

### `POST /api/health-narration`
**In:** `{relationshipId}`
**Action:** Read relationship + milestones -> Gemini 2.0 Flash -> update relationship.
**Out:** `{success, narration, trend}`.

### `POST /api/embed-profile`
**In:** `{userId}`
**Action:** Read profile + engagement stats -> build text -> Gemini Embedding API -> store vector.
**Out:** `{success, embedding_dimensions, model}`.
**Side effect:** Updates `users/{userId}.embedding`.

### `POST /api/graph-score`
**In:** `{startupId, targetType?, topK?}`
**Action:** Read embeddings -> cosine similarity -> rank top-k.
**Out:** `{source, target_type, matches[], scoring_method}`.
**Fallback:** Metadata matching when embeddings unavailable.

---

## 6. Page Inventory

| Route | Auth | Purpose |
|---|---|---|
| `/` | public | Landing + Google sign-in. Redirects authed users. |
| `/auth/role-select` | authed, no profile | One-time role chooser. Creates `users/{uid}`. |
| `/dashboard` | startup/mentor | List of own relationships with health snapshots. |
| `/matches` | startup/mentor | All matched counter-parties with AI narrative. |
| `/matches/[id]` | startup/mentor | Relationship detail: health, milestones, completion UI. |
| `/profile` | startup/mentor | Edit profile + (startup) upload deck + view AI tags/score. |
| `/qr` | startup/mentor | Generate own QR badge + scan others'. |
| `/view/[uid]` | public | Public-facing profile (QR landing target). |
| `/admin/dashboard` | admin | Cytoscape ecosystem graph + at-risk panel. |
| `/admin/programme` | admin | Create programmes, view qualified startups, trigger matching. |

---

## 7. Known Gaps / Implementation TODOs

These are inferred from the code, *not* fabricated requirements:

1. **Deck extraction is not wired to upload.** `profile/page.tsx` uploads the
   PDF and saves `pitch_deck_url`, but never POSTs to `/api/extract-deck`. The
   route exists and works if called manually but the UI has no trigger. Quality
   scores currently appear only via seeded data.
2. **`stage` on startup writes goes to the user doc** as a flat field but
   `StartupTags.stage` is the canonical location; profile form writes to a
   different shape than the type expects.
3. **Messages signal type is defined but never written.** `platform_messages_sent`
   is set on relationship creation and never incremented; no messaging UI exists.
4. **Health score arithmetic is ad-hoc.** `+8 per milestone, capped at 100`,
   no decay implementation. Decay is only narrated by Gemini, not computed.
5. **Match generation runs synchronously inside a Next.js route handler.**
   Will be slow / risks timeout on large cohorts. No queue, no retry.
6. **Dashboard ignores the user filter.** Comment in code: *"Show all
   relationships for demo — seeded data uses hardcoded IDs"* — every user
   sees every relationship. Same applies to admin programme listing.
7. **No Firestore security rules in the repo.** Rules are presumed deployed
   out-of-band but not version-controlled here.
8. **Firebase config falls back to demo values** (`demo-key`, `demo-project`)
   if env vars are missing — the app boots but Auth fails silently.
9. **`milestones_total: 4`** is hardcoded at relationship creation but no
   milestones are actually generated alongside the relationship — they exist
   only via the seed script.
10. **`/api/embed-profile` and `/api/graph-score` do not exist yet.** These
    routes are planned for the Gemini Embedding scoring layer (see TECH-PLAN.md).
    Until they exist, matching uses Gemini Pro only (no embedding-based similarity).

---

## 8. Security Considerations

- **API routes are unauthenticated.** Anyone with the deployed URL can call
  `/api/generate-matches`, `/api/extract-deck`, `/api/health-narration` and
  mutate Firestore via the Admin SDK. **Before production, gate with verified
  ID tokens (`getAuth().verifyIdToken`).**
- **`FIREBASE_PRIVATE_KEY` is loaded per-request** via dynamic import inside
  the route handlers. Fine, but ensure newlines are properly escaped in env.
- **Pitch decks are served by `getDownloadURL`** which yields a tokenised
  public URL — anyone with the link can read the PDF. Acceptable for demo,
  not for confidential decks.
- **No rate limiting** on Gemini-calling endpoints. A single user can rack up
  significant cost.
- **QR codes encode raw `/view/{uid}` URLs** — public by design, but anyone
  who guesses a UID can view the profile (which by intent is public).

---

## 9. Environment Variables

Required at runtime:

```
# Client (NEXT_PUBLIC_ prefix, embedded in bundle)
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID

# Server (route handlers + seed script)
FIREBASE_PROJECT_ID
FIREBASE_CLIENT_EMAIL
FIREBASE_PRIVATE_KEY   # escaped \n in env, unescaped at use

# AI
GEMINI_API_KEY
```

A Firebase service-account JSON exists locally
(`nexus-da697-firebase-adminsdk-fbsvc-b7bd9e51a6.json`) and is gitignored.

---

## 10. Development Workflow

```bash
pnpm install
pnpm dev                                                    # http://localhost:3000
pnpm build && pnpm start
pnpm lint

# Seed demo data (requires .env.local + admin creds)
npx ts-node --project tsconfig.seed.json scripts/seed-data.ts
```

Seed populates: 3 startups, 5 mentors, 1 programme, relationships at varied
health stages, and 4-milestone blueprints per relationship.

---

## 11. Deployment

- Project includes `vercel.svg` and standard Next.js layout — targeting Vercel.
- `.vercel` is gitignored. No `vercel.json` / `vercel.ts` committed.
- Next.js 16 + Fluid Compute is the expected runtime.
- Graph visualisation (FastAPI sidecar) is optional for production — deployable to Cloud Run if needed.

---

## 12. Design Language

- Dark UI throughout: `bg-gray-950`, `bg-gray-900` cards, `border-gray-800`.
- Accent: `blue-400` for primary, `green-400` for healthy, `yellow-400` warn,
  `red-400` decaying.
- Two emoji role icons: startup, mentor, admin.
- Wordmark: `NEX<span class="text-blue-400">US</span>`.
- Tagline: *"No ratings. Only actions. NEXUS remembers."*

---

## 13. Roadmap (suggested, not committed)

Short-term (close the loop on current features):
- Wire deck upload to `/api/extract-deck` automatically.
- Auto-generate the 4 milestones on relationship creation.
- Authenticate API routes with Firebase ID tokens.
- Generate profile embeddings on every profile save (`/api/embed-profile`).

Medium-term:
- Real messaging surface (writes `signals` of type `message`).
- Server-computed health decay (cron) rather than only Gemini-narrated.
- Programme outcome tracking (graduation, follow-on funding).
- Firestore security rules in-repo.
- Batch re-embedding jobs for all profiles.
