# Nexus — AI Relationship Operating System

> **No ratings. Only actions. Nexus remembers.**

Nexus is an AI-powered relationship management platform built for innovation ecosystems — accelerators, incubators, and grant programmes. It replaces manual mentor-startup matching and subjective surveys with Gemini AI, behavioural signals, and a live relationship health graph.

Built with Next.js, Firebase, and the Gemini API.

---

## Table of Contents

- [What It Does](#what-it-does)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Pages & Routes](#pages--routes)
- [API Routes](#api-routes)
- [AI Flows](#ai-flows)
- [Data Model](#data-model)
- [Shared Components](#shared-components)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)

---

## What It Does

Nexus solves three problems in innovation programmes:

1. **Triage** — Startups upload a pitch deck. Gemini reads it multimodally, extracts structured tags, and scores quality across four dimensions (Problem Clarity, Market Size, Team Strength, MVP Readiness). Only startups above a programme's quality threshold enter the match pool.

2. **Matchmaking** — A programme manager clicks one button. Gemini 2.5 Pro reads every qualified startup against every mentor and writes a plain-English match narrative explaining *why* each pair fits. No gut feel. No spreadsheets.

3. **Relationship Health** — Every milestone completed, every message sent is a signal. Gemini narrates the health of each relationship continuously — "this pair is decaying because no platform activity in 14 days" — and the admin sees it all on a live graph. Relationships that were going to die silently now have a flag and a recommended action.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.2.6 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v4 + custom Nexus design tokens |
| Fonts | Geist, Geist Mono (next/font), Instrument Serif (next/font) |
| Auth | Firebase Auth (Google OAuth) |
| Database | Firebase Firestore |
| File Storage | Firebase Storage |
| AI — extraction & narration | Gemini 2.0 Flash |
| AI — match reasoning | Gemini 2.5 Pro |
| AI — profile vectorisation | Gemini Embedding API (text-embedding-004) |
| Graph visualisation | Cytoscape.js (cose layout) |
| QR generation | qrcode.react |
| QR scanning | html5-qrcode |

---

## Project Structure

```
src/
├── app/
│   ├── layout.tsx               # Root layout — fonts, AuthProvider, RoleSwitcher
│   ├── globals.css              # Design tokens, nx-* utility classes
│   ├── page.tsx                 # Landing page
│   │
│   ├── auth/
│   │   ├── role-select/         # Step 1 — pick Startup / Mentor / Admin
│   │   └── setup/               # Step 2 — fill profile, upload deck
│   │
│   ├── dashboard/               # Central hub — stats, relationships, milestones
│   ├── matches/                 # Explore AI-recommended connections
│   ├── requests/                # Approve or decline connection requests
│   ├── chat/
│   │   ├── page.tsx             # Chat list — all active conversations
│   │   └── [relationshipId]/    # Chat workspace — messages, milestones, health
│   ├── programmes/              # Browse and join cohorts
│   ├── view/[uid]/              # Public profile (QR scan landing)
│   ├── qr/                      # QR badge generation + camera scanner
│   ├── account/                 # Settings — profile, AI scores, notifications
│   ├── profile/                 # Redirects to /account
│   ├── settings/                # Redirects to /account
│   │
│   ├── admin/
│   │   ├── dashboard/           # Ecosystem graph (Cytoscape) + at-risk panel
│   │   └── programme/           # Create programmes, review pool, generate matches
│   │
│   └── api/
│       ├── extract-deck/        # POST — Gemini reads pitch PDF, returns tags + quality score
│       ├── generate-matches/    # POST — Gemini pairs startups and mentors, writes relationships
│       ├── health-narration/    # POST — Gemini narrates relationship health trend
│       ├── embed-profile/       # POST — Gemini Embedding API vectorises a profile
│       ├── graph-score/         # POST — cosine similarity scoring on stored embeddings
│       └── switch-role/         # POST — demo helper to switch user role
│
├── components/
│   ├── nx/                      # Nexus design system components
│   │   ├── icons.tsx            # SVG icon set (Icon.search, Icon.spark, etc.)
│   │   ├── primitives.tsx       # NXAvatar, NXPill, NXBtn, NXSearch, HealthBadge,
│   │   │                        #   QualityMeter, Sparkline, AICallout, NXTopbar,
│   │   │                        #   SectionHead, Toggle, initials(), avatarTone()
│   │   ├── sidebar.tsx          # NXSidebar — role-aware nav derived from useAuth()
│   │   └── index.ts             # Barrel export
│   │
│   ├── NavBar.tsx               # Legacy top nav (no longer used in redesigned pages)
│   └── RoleSwitcher.tsx         # Floating demo widget to switch between roles
│
└── lib/
    ├── firebase.ts              # Firebase client SDK initialisation
    ├── firebase-admin.ts        # Firebase Admin SDK (used in API routes only)
    ├── auth-context.tsx         # AuthProvider, useAuth() hook
    ├── types.ts                 # All TypeScript interfaces (UserProfile, Relationship, etc.)
    ├── embeddings.ts            # Cosine similarity utility
    ├── metadata-scorer.ts       # Cold-start fallback scoring (no embeddings needed)
    └── demo-seeds.ts            # Seed data profiles for the demo role switcher
```

---

## Pages & Routes

### Public

| Route | Description |
|---|---|
| `/` | Landing page — hero, sign-in with Google, programme strip |
| `/view/[uid]` | Public profile page — shown when someone scans a QR badge |

### Onboarding

| Route | Description |
|---|---|
| `/auth/role-select` | First-time users pick Startup, Mentor, or Programme Manager |
| `/auth/setup` | Profile setup form with live preview and AI extraction sidebar |

### Core (Startup & Mentor)

| Route | Description |
|---|---|
| `/dashboard` | Stats row, AI health narration, relationship table, milestones panel |
| `/matches` | Featured top match + grid of AI-ranked profiles. Connect button sends a connection request |
| `/requests` | Two-pane inbox — list of incoming/sent/archived requests + detail view with approve/decline |
| `/chat` | Chat list — all active relationship conversations. Start new chat from approved connections |
| `/chat/[relationshipId]` | Three-column workspace — messages, health panel, milestone tracker |
| `/programmes` | Browse and register for active cohorts |
| `/qr` | Printable A6 QR badge + built-in camera scanner |
| `/account` | Settings — profile fields, AI quality scores, notification toggles, danger zone |

### Admin (Programme Manager)

| Route | Description |
|---|---|
| `/admin/programme` | Create/edit programmes, review registrations, configure match thresholds, trigger AI matching |
| `/admin/dashboard` | Live Cytoscape ecosystem graph. Click any edge to read its Gemini health narration. At-risk panel lists decaying relationships |

---

## API Routes

All routes live under `src/app/api/` and run on the Node.js runtime.

### `POST /api/extract-deck`

Reads a startup's pitch deck PDF and extracts structured data.

**Input:** `{ base64Pdf: string, userId: string }`

**What it does:**
1. Sends the PDF (as base64) to Gemini 2.0 Flash twice — once for tag extraction, once for quality scoring.
2. Tag extraction returns: `industry`, `stage`, `tech_stack[]`, `funding_ask`, `team_size`, `key_problem`, `unique_value_prop`.
3. Quality scoring returns four dimensions, each 0–25, totalling 0–100, plus a one-sentence `quality_summary`.
4. Writes all extracted data back to `users/{userId}` via Admin SDK.
5. Fires a follow-up call to `/api/embed-profile` to regenerate the startup's embedding.

**Fallbacks:** If Gemini returns invalid JSON, default tags (`industry: "Unknown"`) and default scores (15 per dimension) are used instead of failing.

---

### `POST /api/generate-matches`

Runs AI-powered mentor-startup matching for a programme.

**Input:** `{ programmeId: string }`

**What it does:**
1. Reads all startups with `quality_score >= programme.match_threshold` from Firestore.
2. Reads all mentor profiles.
3. Sends both lists as a compact JSON payload to Gemini 2.5 Pro.
4. Gemini returns an array of `{ startup_id, mentor_id, edge_weight, match_narrative }`.
5. Each pairing is written as a new `relationships` document with `health_score: 50` as the starting value.

**Match narrative:** 2–3 sentences grounded in actual profile data — the model cannot reference a mentor who wasn't passed in the prompt.

---

### `POST /api/health-narration`

Generates a plain-English health assessment for a relationship after a milestone event.

**Input:** `{ relationshipId: string }`

**What it does:**
1. Reads the relationship document, all its milestones, and computes days since last interaction.
2. Passes this to Gemini 2.0 Flash with instructions to narrate the health trend.
3. Gemini returns `{ narration: string, trend: "improving"|"stable"|"decaying" }`.
4. Admin SDK updates `health_narration`, `health_trend`, and `last_health_update` on the relationship.

**Note:** The numeric `health_score` is computed client-side (+8 per milestone, capped at 100). Gemini only writes the narrative and trend label.

---

### `POST /api/embed-profile`

Converts a user profile into a 768-dimensional semantic vector.

**Input:** `{ userId: string }`

**What it does:**
1. Reads the user's profile and their engagement stats (completed mentorships, average health, milestones done).
2. Builds a plain-text description that includes both profile content and outcome data.
3. Sends to Gemini Embedding API (`text-embedding-004`).
4. Stores the resulting vector in `users/{userId}.embedding`.

**Why outcome data matters:** A mentor who has completed five successful mentorships gets a different vector than one with zero. Future matches improve because the embedding captures real results, not just stated expertise.

**Called automatically:** After deck extraction, after profile save, and after milestone completion.

---

### `POST /api/graph-score`

Scores a startup against a set of targets using cosine similarity on stored embeddings.

**Input:** `{ startupId: string, targetType?: "mentor"|"programme", topK?: number }`

**What it does:**
1. Reads the startup's embedding from Firestore.
2. Reads all target-type embeddings.
3. Computes cosine similarity for each pair.
4. Returns the top-k results ranked by score.

**Cold-start fallback:** If any profile lacks an embedding, falls back to metadata matching (industry overlap + tech stack Jaccard + stage fit). The response includes a `scoring_method` field indicating which path was used.

---

### `POST /api/switch-role`

Demo helper that switches the active user's role in Firestore without re-authenticating.

**Input:** `{ uid: string, targetRole: "startup"|"mentor"|"admin" }`

Used only by the `RoleSwitcher` floating widget. Not intended for production.

---

## AI Flows

The five AI flows form a feedback loop:

```
Upload deck
    │
    ▼
Flow 1: Extract tags + quality score   (Gemini 2.0 Flash × 2)
    │
    ▼
Flow 4: Generate profile embedding     (Gemini Embedding API)
    │
    ▼
Flow 5: Score matches                  (Cosine similarity — no AI call)
    │
    ▼
Flow 2: Generate match narratives      (Gemini 2.5 Pro)
    │
    ▼
User completes milestones
    │
    ▼
Flow 3: Health narration               (Gemini 2.0 Flash)
    │
    ▼
Flow 4: Re-embed with updated stats    (Gemini Embedding API)
    │
    ▼
Flow 5: Future matches improve         ← feedback loop complete
```

---

## Data Model

All Firestore collections are flat at the project root. IDs are auto-generated except for `users` (Firebase Auth UID).

### `users/{uid}`

Stores both mentor and startup profiles. Role-specific fields are optional.

```ts
{
  uid: string
  role: "startup" | "mentor" | "admin"
  name: string
  email: string
  description: string
  industry: string
  created_at: Timestamp

  // Startup only
  stage?: string
  pitch_deck_url?: string
  tags?: {
    industry: string
    stage: string
    tech_stack: string[]
    funding_ask: string
    team_size: number
    key_problem: string
    unique_value_prop: string
  }
  quality_score?: number           // 0–100
  quality_breakdown?: {
    problem_clarity: number        // 0–25
    market_size: number            // 0–25
    team_strength: number          // 0–25
    mvp_readiness: number          // 0–25
  }
  quality_summary?: string

  // Mentor only
  expertise_areas?: string[]
  years_experience?: number
  past_mentoring?: string

  // Both roles
  embedding?: number[]             // 768-dim Gemini vector
  embedding_model?: string
  embedding_updated_at?: string
}
```

### `programmes/{id}`

```ts
{
  name: string
  description: string
  status: "active" | "completed"
  match_threshold: number          // minimum quality_score to enter the pool
  created_by: string               // admin uid
  created_at: Timestamp
  start_date?: Timestamp
  end_date?: Timestamp
  venue?: string
  registration_deadline?: Timestamp
  capacity?: number
  prerequisites?: string
  contact_email?: string
}
```

### `relationships/{id}`

The core entity. One per mentor-startup pair.

```ts
{
  mentor_id: string
  startup_id: string
  programme_id: string             // "direct" for peer-to-peer connections
  created_at: Timestamp
  last_active_at: Timestamp

  health_score: number             // 0–100, starts at 50
  health_trend: "improving" | "stable" | "decaying"
  health_narration: string         // Gemini-generated plain English
  last_health_update: Timestamp

  platform_messages_sent: number
  milestones_total: number
  milestones_completed: number

  edge_weight: number              // AI-scored compatibility 0–100
  match_narrative: string          // why this pair was matched

  outcome_status: "active" | "completed" | "terminated"
}
```

### `milestones/{id}`

```ts
{
  relationship_id: string
  blueprint_type: "Business" | "Tech" | "Management" | "Certification"
  title: string
  description: string
  status: "pending" | "completed"
  due_at: Timestamp
  completed_at: Timestamp | null
}
```

### `messages/{id}`

```ts
{
  relationship_id: string
  sender_id: string
  text: string
  timestamp: Timestamp
  read: boolean
}
```

### `connection_requests/{id}`

```ts
{
  sender_id: string
  receiver_id: string
  status: "pending" | "approved" | "rejected"
  created_at: Timestamp
}
```

### `signals/{id}`

Append-only event log for health scoring.

```ts
{
  relationship_id: string
  signal_type: "message" | "milestone_complete"
  actor_id: string
  timestamp: Timestamp
  metadata: Record<string, unknown>
}
```

### `programme_registrations/{id}`

```ts
{
  programme_id: string
  user_id: string
  role: "startup" | "mentor"
  status: "pending" | "approved" | "rejected"
  created_at: Timestamp
}
```

---

## Shared Components

All Nexus UI components live under `src/components/nx/` and are exported from `src/components/nx/index.ts`.

### `NXSidebar`

Role-aware sidebar navigation. Derives the nav items automatically from `useAuth()` — no props needed beyond the current active key.

```tsx
<NXSidebar current="dashboard" />
```

### `NXTopbar`

Page header with eyebrow label, serif title, and an optional slot for search/actions.

```tsx
<NXTopbar eyebrow="Matches · AI-curated" title="Explore the network.">
  <NXSearch />
  <NXBtn kind="primary" size="sm">Connect</NXBtn>
</NXTopbar>
```

### `NXAvatar`

Initials-based avatar with deterministic warm tones seeded from the user ID.

```tsx
<NXAvatar id={uid} name="Aina Rashid" size="lg" />
// sizes: "sm" | "md" | "lg" | "xl"
```

### `NXPill`

Monospace badge. Variants map directly to health state colours.

```tsx
<NXPill kind="signal">● improving</NXPill>
<NXPill kind="amber">stable</NXPill>
<NXPill kind="crimson">decaying</NXPill>
<NXPill kind="ai">{Icon.spark} Gemini</NXPill>
<NXPill kind="ink">SELECTED</NXPill>
```

### `HealthBadge`

Combines a coloured dot, numeric health score, and trend arrow into a single pill.

```tsx
<HealthBadge score={87} trend="improving" />
<HealthBadge score={41} trend="decaying" compact />
```

### `QualityMeter`

Four vertical bar segments representing the quality breakdown dimensions.

```tsx
<QualityMeter breakdown={{ problem_clarity: 22, market_size: 19, team_strength: 21, mvp_readiness: 20 }} />
```

### `Sparkline`

Minimal inline SVG line chart for health trends.

```tsx
<Sparkline points={[50, 58, 65, 72, 80, 87]} width={150} height={42} />
<Sparkline points={decayingPoints} color="var(--crimson)" />
```

### `AICallout`

Styled block for Gemini-generated text. Uses the AI blue palette and italic serif body.

```tsx
<AICallout label="Health narration · Nexus AI" model="Gemini 2.0 Flash">
  Cadence is strong. Four milestones on schedule.
  The MARDI deadline is the next leverage point.
</AICallout>
```

### `NXBtn`

Button with four variants.

```tsx
<NXBtn kind="primary" onClick={handleSave}>Save changes</NXBtn>
<NXBtn kind="ghost" size="sm">Cancel</NXBtn>
<NXBtn kind="danger">Delete account</NXBtn>
```

### `Icon`

Inline SVG icon set. Used throughout by spreading into JSX.

```tsx
{Icon.spark}   // star/sparkle — AI indicator
{Icon.arrow}   // →
{Icon.check}   // ✓
{Icon.bolt}    // lightning — generate action
{Icon.graph}   // ecosystem graph
{Icon.qr}      // QR code
// ...and more
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- A Firebase project with Auth (Google provider), Firestore, and Storage enabled
- A Google AI API key with access to Gemini

### Install

```bash
npm install
```

### Environment Variables

Create a `.env.local` file in the project root:

```env
# Firebase client SDK (public — safe to expose)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Firebase Admin SDK (private — server-side only)
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

# Gemini API (private — server-side only)
GOOGLE_API_KEY=
```

The Admin SDK credentials come from a Firebase service account JSON. The `FIREBASE_PRIVATE_KEY` value must include the literal `\n` line breaks — wrap the whole value in double quotes in `.env.local`.

### Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Seed Demo Data

To populate the database with demo mentor, startup, and admin profiles for testing:

```bash
npx ts-node --project tsconfig.seed.json scripts/seed-data.ts
```

### Build

```bash
npm run build
```

---

## Role Switcher

A floating widget in the bottom-right corner lets you switch between the Startup, Mentor, and Programme Manager views without signing in separately. This is a demo convenience — it rewrites the `role` field on the active user's Firestore document.

To test the full flow from scratch: sign in, go through `/auth/role-select`, complete the profile form, and upload a real pitch deck PDF to trigger Gemini extraction.
