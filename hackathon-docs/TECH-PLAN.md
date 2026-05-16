# TECH PLAN — NEXUS Embedding Intelligence Layer

## Overview

Adding Gemini-powered profile embeddings on top of the existing NEXUS platform (Next.js + Firebase + Gemini). Embeddings live entirely inside Next.js — no sidecar, no Python, no PyTorch. Gemini reads profiles, produces vectors, cosine similarity ranks matches.

---

## Architecture

```
┌──────────────┐       HTTP        ┌──────────────────────┐
│   Browser    │ ────────────────► │   Next.js            │
│   (UI)       │ ◄──────────────── │   (Face + Brain)     │
└──────────────┘                   └──────────┬───────────┘
                                              │
                               ┌───────────────┼───────────────┐
                               ▼               ▼               ▼
                        ┌────────────┐  ┌────────────┐  ┌───────────┐
                        │  Firestore │  │  Gemini    │  │  Firebase │
                        │  (Data)    │  │  (AI +     │  │  Auth +   │
                        │            │  │  Embed)    │  │  Storage  │
                        └────────────┘  └────────────┘  └───────────┘
```

**One process, one codebase.** Next.js owns everything: auth, UI, Firestore reads/writes, Gemini API calls, embedding generation, and cosine similarity scoring.

**Why no sidecar:** The original plan used a FastAPI sidecar for PyTorch Geometric. Without PyTorch, there's nothing that needs Python. Gemini embedding calls are just HTTP requests from TypeScript. Cosine similarity on 768-dim vectors is a dot product — 5 lines of code.

---

## Full Tech Stack

### Frontend
| Tech | Why It Impresses |
|------|------------------|
| **Next.js 16** (App Router) | Cutting-edge React framework, server components |
| **Tailwind CSS v4** | Latest version, dark-first design system |
| **Cytoscape.js** | Interactive graph visualization — live ecosystem map |
| **TypeScript** | Type safety across the whole frontend |

### Backend — Next.js (Full Stack)
| Tech | Why It Impresses |
|------|------------------|
| **Firebase Auth** (Google OAuth) | One-click sign-in, production-grade |
| **Firebase Firestore** | Real-time NoSQL, scales automatically |
| **Firebase Storage** | Pitch deck PDF storage |
| **Next.js Route Handlers** | Full-stack in one codebase |

### AI Layer
| Tech | Why It Impresses |
|------|------------------|
| **Gemini 2.0 Flash** | Fast extraction + health narration |
| **Gemini 2.5 Pro** | Deep reasoning for match narratives |
| **Gemini Embedding API** | Profile vectorisation for similarity scoring |

### The Stack Story (Pitch Line)

> "We use **Gemini** for three distinct AI tasks: it reads pitch decks to extract structured data, generates match narratives with reasoning, and produces profile embeddings that power similarity-based matching. One API, three paradigms — extraction, reasoning, and vectorisation."

**Key differentiator:** Most hackathon projects use AI as a chatbot wrapper. NEXUS uses Gemini for three specific, non-overlapping tasks with different latency and capability requirements:
1. **Extraction** (Flash) — reads PDFs, returns structured tags
2. **Reasoning** (Pro) — generates match narratives with justification
3. **Embeddings** — converts profiles to vectors for O(1) similarity scoring

---

## Implementation Plan

### Phase 1: Profile Embedding Generation

**New route:** `POST /api/embed-profile`

```typescript
// src/app/api/embed-profile/route.ts

In:  { userId }
Out: { success, embedding: number[] }

Flow:
  1. Read user profile from Firestore (users/{userId})
  2. Read engagement stats (completed mentorships, avg health, milestones)
  3. Build text representation of the profile + outcomes
  4. Call Gemini embedding API -> 768-dim vector
  5. Store embedding in users/{userId}.embedding
  6. Return success
```

**Text representation (what gets embedded):**

For mentors:
```
"Mentor specialising in {industry}. Expertise: {expertise_areas}.
{years_experience} years experience. {past_mentoring}.
{completed_mentorships} successful mentorships completed.
Average relationship health score: {avg_health_score}.
Active in {active_programmes} programmes."
```

For startups:
```
"Startup in {tags.industry}, stage: {tags.stage}.
Problem: {tags.key_problem}. Solution: {tags.unique_value_prop}.
Tech: {tags.tech_stack}. Team size: {tags.team_size}.
{completed_milestones} milestones completed across {active_relationships} mentorships."
```

**Why include engagement stats:** The problem statement asks "how past engagement data can improve future matching." By appending outcome data to the embedding text, a mentor who completes 5 successful mentorships gets a different vector than one with zero. The embedding captures not just *who they are* but *what they've achieved*.

**When to call:**
- On profile save (`/profile` page)
- After deck extraction completes (`/api/extract-deck` side effect)
- After milestone completion (engagement stats change)
- Manual re-embed via admin panel (for batch backfill)

### Phase 2: Similarity Scoring

**New route:** `POST /api/graph-score`

```typescript
// src/app/api/graph-score/route.ts

In:  { startupId, targetType?: "mentor" | "programme", topK?: 5 }
Out: { matches: [{ id, name, score, reason }] }

Flow:
  1. Read startup embedding from Firestore
  2. Read all target-type embeddings from Firestore
  3. Cosine similarity: dot(a, b) / (norm(a) * norm(b))
  4. Rank top-k
  5. Enrich with target profiles (name, industry, etc.)
  6. Generate reason from highest-scoring dimensions
```

**Cosine similarity (TypeScript):**
```typescript
function cosineSimilarity(a: number[], b: number[]): number {
  const dot = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const normA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const normB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dot / (normA * normB);
}
```

**Fallback (cold start):** When a profile has no embedding (not yet generated), fall back to metadata matching from the existing `scorer.py` logic, ported to TypeScript:
- Industry exact match
- Tech stack / expertise Jaccard similarity
- Stage vs experience fit

### Phase 3: Integration Points

**Embed on profile save:**
```typescript
// In /profile page save handler — fire and forget
fetch('/api/embed-profile', {
  method: 'POST',
  body: JSON.stringify({ userId: user.uid })
});
```

**Embed after deck extraction:**
```typescript
// In /api/extract-deck/route.ts — after writing tags to Firestore
await fetch('/api/embed-profile', {
  method: 'POST',
  body: JSON.stringify({ userId })
});
```

**Embed after milestone completion:**
```typescript
// In /matches/[id] milestone handler — after updating health_score
fetch('/api/embed-profile', {
  method: 'POST',
  body: JSON.stringify({ userId })
});
```

**Score on match request:**
```typescript
// In /matches page or /admin/programme — replace Gemini-only matching
// with embedding-first, Gemini narrative second
const { matches } = await fetch('/api/graph-score', {
  method: 'POST',
  body: JSON.stringify({ startupId, targetType: 'mentor', topK: 3 })
});
// Optionally: pass top-3 matches to Gemini 2.5 Pro for narrative generation
```

---

## Data in Firestore (Changes)

### `users/{uid}` — new field

```json
{
  "embedding": [0.012, -0.034, 0.056, ...],  // 768-dim Gemini embedding
  "embedding_model": "text-embedding-004",
  "embedding_updated_at": "2026-05-17T12:00:00Z"
}
```

No separate `graph_state` collection needed. Embeddings live alongside the profiles they describe.

---

## Cold Start Strategy

| Data Available | Matching Method |
|---|---|
| No embeddings yet | Metadata matching (industry, tech stack, stage vs experience) |
| Embeddings exist | Cosine similarity on Gemini vectors |

Metadata matching is already implemented in the existing graph scorer. Gemini embeddings activate automatically once profiles are saved with embeddings.

---

## Files to Create / Modify

```
src/app/api/embed-profile/route.ts    # NEW — Gemini embedding generation
src/app/api/graph-score/route.ts      # NEW — Cosine similarity scoring
src/lib/embeddings.ts                 # NEW — cosineSimilarity() + helpers
src/lib/metadata-scorer.ts            # NEW — TypeScript port of scorer.py logic
```

```
graph-service/                        # KEEP for /build-graph, /graph-data, /registry
  main.py                             # — Cytoscape graph viz still uses this
  config.py                           # — Entity/relationship registries
  scorer.py                          # — Metadata matching (can be deprecated once
                                     #   all profiles have embeddings)
```

---

## What This Buys You (Rubric Alignment)

| Rubric Criterion | How This Scores |
|------------------|-----------------|
| Google Tech Integration (15) | Firebase + Gemini (3 APIs: Flash, Pro, Embeddings) — deep integration |
| AI Implementation Quality (10) | Three distinct Gemini uses: extraction, reasoning, vectorisation. Cold-start fallback shows production thinking. Outcome-based embedding shows feedback loop. |
| Originality (10) | Embedding-based relationship matching with narrative justification + outcome-aware vectors — novel vs. simple tag matching |
| Problem-Solution Fit (15) | Directly addresses "relationships as first-class entities" with AI-scored compatibility and outcome learning |
| Scalability (10) | Cosine similarity is O(1) per query. Embeddings stored in Firestore scale automatically |

---

## Demo Script

1. **Show existing data** — startups, mentors, relationships in Firestore
2. **Generate embeddings** — save a profile, show embedding field populated
3. **Score** — pick a startup, call `/api/graph-score`, show ranked mentors with scores
4. **Show on graph viz** — Cytoscape graph highlights the top match
5. **Show cold start** — profile without embedding falls back to metadata matching
6. **Show feedback loop** — complete a milestone, show embedding re-generated with updated stats
