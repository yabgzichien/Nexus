# AI Flow — Ecosystem Relationship Intelligence Platform

## MVP Scope

**What we ship in the hackathon:**
- Gemini extraction of pitch deck data (tags + quality scoring)
- Gemini generation of match narratives
- Gemini health narration for relationship tracking
- Gemini-powered profile embeddings (mentor + startup)
- Cosine similarity scoring for match ranking
- Metadata-based cold-start fallback
- Auto-embed on profile save and milestone completion

**What we defer:**
- A/B testing and drift detection
- Programme-level embeddings
- Multi-model embedding approaches
- Batch re-embedding jobs

---

## AI Flow 1: Pitch Deck Extraction

**Route:** `POST /api/extract-deck`
**Input:** `{ pitchDeckUrl, userId }`
**Model:** Gemini 2.0 Flash (two sequential calls)

### Step 1: Tag Extraction

```
PDF (base64) -> Gemini Flash
    -> structured JSON:
       { industry, stage, tech_stack[], funding_ask,
         team_size, key_problem, unique_value_prop }
    -> written to users/{userId}.tags
```

The prompt constrains output to a fixed JSON schema. If parsing fails, default tags are used (`{industry: "Unknown", stage: "mvp"}`).

### Step 2: Quality Scoring

```
Same PDF (base64) -> Gemini Flash (second call)
    -> structured JSON:
       { problem_clarity: 0-25, market_size: 0-25,
         team_strength: 0-25, mvp_readiness: 0-25 }
    -> written to users/{userId}.quality_score,
                    users/{userId}.quality_breakdown,
                    users/{userId}.quality_summary
```

Each dimension is scored 0-25 with explicit rubric language in the prompt. The total is 0-100. If parsing fails, default scores of 15 per dimension (total 60) are used.

### Trigger

Called automatically after pitch deck upload on `/profile` page. After extraction completes, triggers `/api/embed-profile` to regenerate the startup's embedding with updated tags.

---

## AI Flow 2: Match Generation

**Route:** `POST /api/generate-matches`
**Input:** `{ programmeId }`
**Model:** Gemini 2.5 Pro

```
Read qualified startups (quality_score >= threshold) from Firestore
Read all mentors from Firestore
    |
    v
Build compact JSON payload with actual profile data
    |
    v
Gemini 2.5 Pro
    -> returns array: [{ startup_id, mentor_id, edge_weight, match_narrative }]
    |
    v
Each match written as a relationships doc (batched)
    -> initial health_score: 50, milestones_total: 4
```

**Constraints (in prompt):** 1 mentor per startup, mentors capped at 3 matches.

**Match narrative:** 2-3 sentences explaining WHY the match works, citing specific expertise overlaps and complementary strengths. Grounded in actual profile data — the model cannot invent a mentor who doesn't exist.

---

## AI Flow 3: Health Narration

**Route:** `POST /api/health-narration`
**Input:** `{ relationshipId }`
**Model:** Gemini 2.0 Flash

```
User completes a milestone (/matches/[id])
    |
    v
Client updates milestones.{status, completed_at}
Client writes a signals doc
Client increments milestones_completed
Client bumps health_score by +8 (capped at 100)
    |
    v
Fire-and-forget POST to /api/health-narration
    |
    v
Server reads:
  - relationship doc (health_score, milestones, last_active_at)
  - milestones for this relationship
  - computes days-since-interaction
    |
    v
Gemini 2.0 Flash
    -> returns { narration, trend }
       narration: plain-English assessment of relationship health
       trend: "improving" | "stable" | "decaying"
    |
    v
Admin SDK updates relationship doc:
  - health_narration
  - health_trend
  - last_health_update
```

**Key detail:** Health score arithmetic is client-side (+8 per milestone, capped at 100). Gemini narrates the trend and provides a human-readable explanation, but does not compute the score. Decay is narrated by Gemini, not computed — if days-since-interaction is high, Gemini will note the inactivity in the narration.

---

## AI Flow 4: Profile Embedding

**Route:** `POST /api/embed-profile`
**Input:** `{ userId }`
**Model:** Gemini Embedding API (`text-embedding-004`)

```
Profile saved, milestone completed, or deck extracted
    |
    v
Read user doc from Firestore (users/{userId})
Read engagement stats:
  - completed mentorships count
  - average health score across relationships
  - total milestones completed
  - active programme count
    |
    v
Build text description:

  Mentor:
    "Mentor specialising in {industry}. Expertise: {expertise_areas}.
     {years_experience} years experience. {past_mentoring}.
     {completed_mentorships} successful mentorships completed.
     Average relationship health score: {avg_health_score}.
     Active in {active_programmes} programmes."

  Startup:
    "Startup in {tags.industry}, stage: {tags.stage}.
     Problem: {tags.key_problem}. Solution: {tags.unique_value_prop}.
     Tech: {tags.tech_stack}. Team size: {tags.team_size}.
     {completed_milestones} milestones completed across
     {active_relationships} mentorships."
    |
    v
Gemini Embedding API -> 768-dim vector
    |
    v
Store in users/{userId}.embedding
Store metadata: embedding_model, embedding_updated_at
```

**Why include engagement stats:** The problem statement asks "how past engagement data can improve future matching." By appending outcome data to the embedding text, a mentor who completes 5 successful mentorships gets a different vector than one with zero. The embedding captures not just *who they are* but *what they've achieved*.

**When to call:**
- On profile save (name, bio, expertise, tags change)
- After deck extraction completes (tags updated)
- After milestone completion (engagement stats change)
- Manual re-embed via admin panel

---

## AI Flow 5: Similarity Scoring

**Route:** `POST /api/graph-score`
**Input:** `{ startupId, targetType?: "mentor" | "programme", topK?: 5 }`
**Method:** Cosine similarity (TypeScript, no AI call)

```
Read startup embedding from Firestore
Read all target-type embeddings from Firestore
    |
    v
For each target:
  score = dot(startup_emb, target_emb)
        / (norm(startup_emb) * norm(target_emb))
    |
    v
Rank top-k
Enrich with target profiles (name, industry, etc.)
    |
    v
Return: [{ id, name, score, reason }]
```

**Cold start fallback:** When a profile has no embedding, fall back to metadata matching:
```
score = 0.4 * industry_match (exact)
      + 0.3 * tech_overlap (Jaccard)
      + 0.3 * stage_fit (configurable mapping)
```

**Scoring method in response:**
- `"embedding_similarity"` — when embeddings exist for both source and targets
- `"metadata_matching"` — when any profile lacks an embedding

---

## Flow Summary

```
Upload deck
    |
    v
AI Flow 1: Extract tags + quality score (Gemini Flash x2)
    |
    v
AI Flow 4: Generate profile embedding (Gemini Embedding)
    |
    v
AI Flow 5: Score matches (Cosine similarity)
    |
    v
AI Flow 2: Generate match narratives (Gemini Pro)
    |
    v
User completes milestones
    |
    v
AI Flow 3: Health narration (Gemini Flash)
    |
    v
AI Flow 4: Re-embed with updated engagement stats
    |
    v
AI Flow 5: Future matches improve (feedback loop complete)
```
