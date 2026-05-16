# NEXUS — Embedding-Based Graph Intelligence Engine

## What This Is

A graph intelligence layer that treats every ecosystem relationship as a first-class, configurable entity. Uses Gemini embeddings for similarity scoring and Cytoscape for visualisation. Not a "mentor matcher" — a **relationship intelligence layer** that scores any entity against any target type.

---

## The Problem It Solves

The problem statement asks for a platform that treats ecosystem relationships as **first-class, programmable entities** that can be created, managed, reused, and improved automatically across programmes, countries, and ecosystem actors.

Most solutions hard-code one relationship type (e.g., mentor -> startup). This engine handles **all of them** through a config-driven registry with embedding-based scoring.

---

## Core Concept — Profile Embeddings

Every profile (mentor, startup, programme) is converted to a natural-language text description, then embedded by Gemini into a 768-dimensional vector. Similar profiles have similar vectors. Cosine similarity ranks matches in O(1).

**Why embeddings over rules:** Rule-based matching (tag overlap, exact industry match) can't capture nuance. "FinTech payments specialist" and "B2B SaaS with Stripe integration" share no tags but describe related expertise. Embeddings capture this semantic similarity because Gemini was trained on the entire web.

**Outcome-aware embeddings:** The embedding text includes engagement stats (completed mentorships, average health score, active programmes). A mentor who completes 5 successful mentorships gets a different vector than one with zero. This means past engagement directly improves future matching — the core ask of the problem statement.

---

## Architecture

```
┌──────────────────────────────────────────────────────┐
│                                                      │
│                   Next.js (Full Stack)               │
│   Auth · UI · Firestore · Gemini · Embeddings        │
│                                                      │
└──────────────────────┬───────────────────────────────┘
                       │ HTTP
                       ▼
┌──────────────────────────────────────────────────────┐
│                                                      │
│              Graph Intelligence Engine                │
│                 (Inside Next.js)                      │
│                                                      │
│  ┌────────────────┐  ┌─────────────────────────────┐ │
│  │ Entity Registry│  │  Relationship Registry      │ │
│  │                │  │                             │ │
│  │ mentor         │  │  mentor <-> startup         │ │
│  │ startup        │  │  startup <-> programme      │ │
│  │ programme      │  │  mentor <-> programme       │ │
│  └────────────────┘  └─────────────────────────────┘ │
│                                                      │
│  ┌─────────────────────────────────────────────────┐ │
│  │           Gemini Embedding Engine               │ │
│  │                                                 │ │
│  │  Profile text + outcomes -> 768-dim vector      │ │
│  │  Cosine similarity for ranking                  │ │
│  │  Metadata fallback for cold start               │ │
│  └─────────────────────────────────────────────────┘ │
│                                                      │
│  ┌──────────────┐  ┌──────────────┐                  │
│  │  Firestore   │  │  Cytoscape   │                  │
│  │  (data +     │  │  (graph viz) │                  │
│  │  embeddings) │  │              │                  │
│  └──────────────┘  └──────────────┘                  │
│                                                      │
└──────────────────────────────────────────────────────┘

Sidecar (graph-service/) — only for Cytoscape graph visualisation:
┌──────────────────────────────────────────────────────┐
│  FastAPI — /build-graph, /graph-data, /registry      │
│  Reads Firestore -> builds in-memory graph -> returns │
│  Cytoscape-compatible JSON for the admin dashboard    │
└──────────────────────────────────────────────────────┘
```

**Two processes for demo:**
- `pnpm dev` — Next.js (auth, UI, AI, embeddings, scoring)
- `python graph-service/main.py` — FastAPI (Cytoscape graph data only)

The FastAPI sidecar exists **only** for graph visualisation. All intelligence (matching, scoring, embeddings) lives in Next.js.

---

## Entity Registry

Each entity type maps to a Firestore collection with a configurable feature schema. Used by both the Cytoscape graph builder and the metadata-based cold-start scorer.

```python
ENTITY_TYPES = {
    "mentor": {
        "collection": "users",
        "filter": {"role": "mentor"},
        "features": {
            "industry": "exact",
            "expertise_areas": "jaccard",
            "years_experience": "numeric",
        },
    },
    "startup": {
        "collection": "users",
        "filter": {"role": "startup"},
        "features": {
            "industry": "exact",
            "stage": "exact",
            "tech_stack": "jaccard",
        },
    },
    "programme": {
        "collection": "programmes",
        "features": {
            "name": "exact",
            "status": "exact",
        },
    },
}
```

Adding a new entity type = add one dict entry.

---

## Relationship Registry

Each relationship type maps to a Firestore collection that links two entity types.

```python
EDGE_TYPES = {
    "mentor_startup": {
        "collection": "relationships",
        "source": {"field": "mentor_id", "type": "mentor"},
        "target": {"field": "startup_id", "type": "startup"},
        "weight_field": "health_score",
        "bidirectional": True,
    },
    "startup_programme": {
        "collection": "programme_registrations",
        "source": {"field": "user_id", "type": "startup"},
        "target": {"field": "programme_id", "type": "programme"},
        "weight_field": None,
        "bidirectional": True,
    },
    "mentor_programme": {
        "collection": "programme_registrations",
        "source": {"field": "user_id", "type": "mentor"},
        "target": {"field": "programme_id", "type": "programme"},
        "weight_field": None,
        "bidirectional": True,
    },
}
```

---

## How It Works — Data Flow

```
1. EMBED (on profile save or milestone completion)
   Profile fields + engagement stats -> text description -> Gemini embedding API
       -> 768-dim vector -> stored in users/{uid}.embedding

2. SCORE (on match request)
   startup.embedding + all mentor embeddings
       -> cosine similarity -> rank top-k
       -> enrich with mentor profiles -> return matches

3. FALLBACK (cold start — no embeddings)
   startup fields vs mentor fields
       -> metadata comparison (exact, jaccard, numeric)
       -> weighted score -> rank top-k

4. VISUALISE (admin dashboard)
   Firestore -> FastAPI /build-graph -> /graph-data
       -> Cytoscape-compatible JSON -> live graph

5. FEEDBACK LOOP (outcome learning)
   milestone complete -> re-embed with updated stats
       -> vector changes -> future matches improve
```

---

## API Endpoints

### `POST /api/embed-profile` (Next.js)

Generates a Gemini embedding for a user profile + engagement stats and stores it in Firestore.

```json
// Request
{ "userId": "abc123" }

// Response
{
  "success": true,
  "embedding_dimensions": 768,
  "model": "text-embedding-004"
}
```

### `POST /api/graph-score` (Next.js)

Scores a startup against all mentors (or programmes) using cosine similarity on embeddings. Falls back to metadata matching when embeddings are unavailable.

```
POST /api/graph-score
Body: { "startupId": "abc123", "targetType": "mentor", "topK": 5 }
```

```json
// Response
{
  "source": {"type": "startup", "id": "abc123"},
  "target_type": "mentor",
  "matches": [
    {"id": "mentor_001", "name": "Jane Doe", "score": 0.94, "reason": "Strong domain overlap in fintech + health-tech"},
    {"id": "mentor_002", "name": "John Smith", "score": 0.87, "reason": "High programme co-engagement"},
    {"id": "mentor_003", "name": "Alice Wong", "score": 0.81, "reason": "Stage-fit: Series A specialisation"}
  ],
  "scoring_method": "embedding_similarity"
}
```

This single endpoint handles ALL relationship types:
- `targetType: "mentor"` -> find best mentors
- `targetType: "programme"` -> find best programmes

### FastAPI Endpoints (Cytoscape only)

| Endpoint | Purpose |
|----------|---------|
| `POST /build-graph` | Read Firestore, build in-memory graph, return stats |
| `POST /graph-data` | Return Cytoscape-compatible graph visualization |
| `GET /registry` | Return entity and relationship registries |
| `GET /health` | Liveness check |

---

## Cosine Similarity (TypeScript)

```typescript
function cosineSimilarity(a: number[], b: number[]): number {
  const dot = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const normA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const normB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dot / (normA * normB);
}
```

768 multiplications per comparison. On 50 mentors = 38,400 multiplications. Runs in <1ms.

---

## Cold Start Strategy

When a profile has no embedding (not yet generated or newly created):

1. Fall back to metadata-based scoring
2. Compare fields using configured rules:
   ```
   score = 0.4 * industry_match (exact)
         + 0.3 * tech_overlap (Jaccard)
         + 0.3 * stage_fit (configurable mapping)
   ```
3. Gemini embeddings activate automatically once the profile is saved
4. The `/api/graph-score` endpoint checks for `users/{uid}.embedding` and picks the right method

This applies **per profile**, not globally. You could have embeddings for 30 mentors while the remaining 20 still use metadata matching.

---

## Firestore Schema

### `users/{uid}` — new fields

```json
{
  "embedding": [0.012, -0.034, 0.056, ...],
  "embedding_model": "text-embedding-004",
  "embedding_updated_at": "2026-05-17T12:00:00Z"
}
```

No separate `graph_state` collection. Embeddings live alongside the profiles they describe.

---

## File Structure

```
src/
  app/
    api/
      embed-profile/route.ts    # Gemini embedding generation
      graph-score/route.ts      # Cosine similarity scoring
  lib/
    embeddings.ts               # cosineSimilarity() + helpers
    metadata-scorer.ts          # Cold-start fallback (port of scorer.py logic)

graph-service/                  # Cytoscape graph viz only
  main.py                       # FastAPI — /build-graph, /graph-data, /registry
  config.py                     # Entity + relationship registries
  scorer.py                     # Metadata matching (deprecated once all profiles have embeddings)
```

---

## Rubric Alignment

| Criterion | How This Scores |
|-----------|-----------------|
| **Google Tech Integration (15)** | Firebase (Auth, Firestore, Storage) + Gemini (Flash, Pro, Embeddings) — 4 technologies, each on the critical path |
| **AI Implementation Quality (10)** | Three distinct Gemini uses: extraction, reasoning, vectorisation. Cold-start fallback shows production thinking. Outcome-aware embeddings address the problem statement's feedback loop requirement. |
| **Originality (10)** | Embedding-based relationship matching with narrative justification + outcome-aware vectors — novel vs. simple tag matching. Semantic similarity captures nuance rules can't. |
| **Problem-Solution Fit (15)** | Directly addresses "relationships as first-class, programmable entities" — configurable, scored, explainable, and self-improving through outcome feedback |
| **Scalability (10)** | Cosine similarity is O(1) per query. Embeddings stored in Firestore scale automatically. Cost per user drops as cohort grows |

---

## Demo Script

1. **Show the registry** — entity types and edge types in config, explain it's fully configurable
2. **Show existing data** — startups, mentors, relationships in Firestore
3. **Generate embeddings** — save a profile, show embedding field populated in Firestore
4. **Score — mentor match** — pick a startup, call `/api/graph-score`, show ranked mentors with similarity scores
5. **Score — programme match** — same startup, change `targetType`, show ranked programmes
6. **Show on graph viz** — Cytoscape highlights top matches
7. **Show cold start** — profile without embedding falls back to metadata matching
8. **Show feedback loop** — complete a milestone, show embedding re-generated with updated outcome stats
