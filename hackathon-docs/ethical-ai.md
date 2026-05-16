# NEXUS — Ethical AI Framework

How NEXUS addresses bias, hallucination, privacy, and transparency — grounded in actual implementation.

---

## 1. Bias

### How Matching Works (and Why It's Less Biased)

NEXUS matching uses **industry, expertise, and problem alignment** — not subjective ratings or demographic data.

| What the AI Sees | What the AI Does NOT See |
|---|---|
| Industry (e.g., FinTech, HealthTech) | Founder name, gender, ethnicity |
| Stage (e.g., MVP, early-traction) | University attended, age |
| Key problem description | Country of origin |
| Tech stack | Investor background |
| Mentor expertise areas | Social connections |
| Years of experience | |

**Why this matters:** The matching prompt (`generate-matches/route.ts:196`) passes only professional attributes. There is no field for demographics in the `StartupTags` or `UserProfile` types (`types.ts:5-26`). The model literally cannot match on criteria it doesn't receive.

### Quality Scoring Is Dimensional, Not Holistic

Quality scoring (`extract-deck/route.ts:78-84`) evaluates four independent dimensions:

1. **Problem Clarity** (0-25) — Is the problem well-defined?
2. **Market Size** (0-25) — Is the addressable market large enough?
3. **Team Strength** (0-25) — Relevant experience and complementary skills
4. **MVP Readiness** (0-25) — How close to a working product?

Each is scored 0-25 with explicit rubric language in the prompt. The model evaluates the pitch deck content, not the founder's identity. A startup from any country, by any founder, gets the same rubric applied.

### Embedding-Based Matching Reduces Bias Further

Gemini embeddings convert profiles to vectors based on semantic meaning, not keyword overlap. This means a mentor from a non-traditional background who has relevant expertise will still score well — the embedding captures *what they know*, not *where they learned it*.

### Outcome-Aware Learning Avoids Amplifying Bias

The embedding text includes engagement stats (completed mentorships, average health score). This means matching improves based on **observable outcomes** — did the mentorship produce results? — not subjective ratings. A 5-star rating system would amplify grader bias. NEXUS tracks milestone completions and health scores derived from activity.

---

## 2. Hallucination Mitigation

### Structured Output Constraints

Every Gemini call is constrained to return valid JSON:

| API Route | Constraint | Fallback on Failure |
|---|---|---|
| `extract-deck` (tags) | "Return ONLY valid JSON, no markdown" | Default tags: `{industry: "Unknown", stage: "mvp"}` |
| `extract-deck` (quality) | JSON schema with 0-25 bounds per dimension | Default: all 15, total 60 |
| `generate-matches` | "Return ONLY valid JSON array" | Returns error, no matches written |
| `health-narration` | "Return ONLY valid JSON" | Fallback: "Unable to generate assessment", keeps existing trend |

**Why this works:** JSON schema constraints prevent the model from generating free-form hallucinated text. If the model can't produce valid JSON, the system uses a safe default rather than silently accepting garbage.

### Grounded Prompts

The match generation prompt (`generate-matches/route.ts:199-203`) includes **actual data** from Firestore:

```
STARTUPS:
[{id: "...", name: "...", industry: "FinTech", stage: "mvp", ...}]

MENTORS:
[{id: "...", name: "...", industry: "FinTech", expertise_areas: ["payments"], ...}]
```

The model can only reference startups and mentors that actually exist in the database. It cannot invent a mentor who doesn't exist or cite expertise that wasn't provided.

### Bounded Scoring

Quality scores are explicitly bounded in the prompt:

```
"Each criterion is scored 0-25, total 0-100."
```

The model cannot assign a score of 150 or -10. The bounds are stated in the prompt, and the JSON schema enforces numeric types. Combined with the fallback defaults, an AI output outside expected ranges is caught and corrected.

---

## 3. Privacy

### Data Access Model

| Data | Who Can Access | How |
|---|---|---|
| Own profile | The user | Firebase Auth — client reads own `users/{uid}` doc |
| Pitch deck PDF | The user + Admin SDK | Firebase Storage — per-user path; Admin SDK for AI processing |
| AI-extracted tags | The user + programme manager (admin) | Written to `users/{uid}`; admins can read for programme matching |
| Match narratives | Both matched parties + admin | Stored in `relationships/{id}` |
| Health narration | Both matched parties + admin | Stored in `relationships/{id}` |
| Profile embeddings | The user + system | Stored in `users/{uid}.embedding`; used only for similarity scoring |

### Pitch Deck Processing

- Uploaded as base64 in the request body
- Sent directly to Gemini API for extraction — **not stored in Firestore**
- The `pitch_deck_url` in the user doc points to Firebase Storage, but the AI processing pipeline uses the in-memory base64 copy
- Gemini processes the PDF and returns structured data; the raw deck content is not persisted in any AI-related collection

### What's Stored vs What's Processed

| Data | Stored in Firestore? | Sent to Gemini? | Persisted by AI? |
|---|---|---|---|
| Pitch deck PDF | Firebase Storage (user's file) | Yes (for extraction) | No — only tags/scores returned |
| Startup tags | Yes (`users/{uid}`) | Yes (for matching) | N/A — this IS the AI output |
| Mentor profile | Yes (`users/{uid}`) | Yes (for matching) | N/A — original data |
| Match narrative | Yes (`relationships/{id}`) | No | Yes — this IS the AI output |
| Health narration | Yes (`relationships/{id}`) | No | Yes — this IS the AI output |
| Profile embedding | Yes (`users/{uid}`) | Input to embedding call | Yes — this IS the AI output |

### Public Profiles

`/view/[uid]` is intentionally public (designed as a QR landing page). Only fields the user chose to populate are visible. No AI scores, health data, match details, or embeddings are exposed on public profiles.

---

## 4. Transparency

### Every AI Decision Is Explainable

| AI Output | Where It's Stored | What the User Sees |
|---|---|---|
| Quality score | `users/{uid}.quality_score` + `quality_breakdown` | 4 individual dimension scores + summary |
| Match | `relationships/{id}.match_narrative` | Plain-English explanation: "Matched because of overlapping FinTech expertise and complementary skills in..." |
| Health trend | `relationships/{id}.health_narration` | "This pair is stable. Milestone progress is on track. Recommendation: schedule next check-in within 2 weeks." |
| Similarity score | Returned by `/api/graph-score` | Numeric score (0-1) + reason: "Strong domain overlap in fintech + health-tech" |

**No black-box scores.** Every number has a narrative attached. Programme managers don't just see "match score: 87" — they see *why*.

### Match Justification Is Specific

The match generation prompt (`route.ts:211`) explicitly requires:

```
"match_narrative": "2-3 sentences explaining WHY this match works,
citing specific expertise overlaps and complementary strengths"
```

The model is instructed to cite concrete attributes (e.g., "Both specialize in B2B SaaS, mentor has 8 years in enterprise sales, startup is scaling their go-to-market"). Vague narratives like "good fit" are penalized by the prompt's specificity requirements.

### Admin Can Audit

Programme managers see:
- Which matches were AI-generated vs manually created
- The compatibility score (`edge_weight`) for each relationship
- Historical health trends showing how relationships evolved
- The Cytoscape graph showing the full ecosystem structure

---

## 5. Known Limitations (Honest Assessment)

| Limitation | Impact | Mitigation |
|---|---|---|
| API routes are unauthenticated | Anyone can trigger AI processing | Gate with Firebase ID tokens before production |
| No rate limiting | A single user can rack up Gemini costs | Add per-user rate limits on AI endpoints |
| Quality scoring has no human-in-the-loop | AI score could be wrong | Programme manager sees scores and can override; quality_summary is visible |
| Embedding quality depends on profile completeness | Sparse profiles produce weak embeddings | Encourage profile completion in UI; metadata fallback handles gaps |
| No demographic audit | Can't prove absence of bias statistically | Feature set excludes demographics by design (see §1); add demographic audit in production |

---

## Summary

| Ethical AI Concern | NEXUS Approach |
|---|---|
| **Bias** | Matching uses professional attributes only; no demographic data in the model's input; scoring is dimensional and rubric-based; outcome-aware embeddings learn from engagement results |
| **Hallucination** | Structured JSON output with schema constraints; safe defaults on parse failure; grounded prompts with real data only |
| **Privacy** | Per-user storage paths; pitch decks processed in-memory, not persisted by AI; public profiles show only user-populated fields |
| **Transparency** | Every AI output includes a plain-English justification; no black-box scores; admins can audit all AI decisions |
