# NEXUS Embedding Intelligence — Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Gemini-powered profile embeddings and cosine similarity scoring to NEXUS, enabling semantic matching that improves with every milestone completed.

**Architecture:** Four new files (2 API routes + 2 lib modules). Embeddings stored in existing `users/{uid}` documents. No new collections, no Python sidecar, no PyTorch.

**Tech Stack:** TypeScript, Next.js 16 App Router, `@google/genai` (Gemini Embedding API), Firebase Admin SDK

---

## File Structure

```
Create:
  src/app/api/embed-profile/route.ts    — Gemini embedding generation endpoint
  src/app/api/graph-score/route.ts      — Cosine similarity scoring endpoint
  src/lib/embeddings.ts                 — cosineSimilarity() + buildEmbeddingText()
  src/lib/metadata-scorer.ts            — Cold-start fallback scorer (TypeScript)

Modify:
  src/lib/types.ts                      — Add embedding fields to UserProfile
  src/app/account/page.tsx              — Call embed-profile after deck extraction
  src/app/matches/[id]/page.tsx         — Call embed-profile after milestone completion
```

---

## Task 1: Add embedding types to UserProfile

**Files:**
- Modify: `src/lib/types.ts`

- [ ] **Step 1: Add embedding fields to UserProfile interface**

In `src/lib/types.ts`, after the `past_mentoring` field in the `UserProfile` interface, add:

```typescript
  // Embeddings (both roles)
  embedding?: number[];
  embedding_model?: string;
  embedding_updated_at?: Timestamp;
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /home/alex-lee/Desktop/hackathon/Nexus && npx tsc --noEmit --pretty 2>&1 | head -20
```

Expected: No errors related to types.ts

- [ ] **Step 3: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat: add embedding fields to UserProfile type"
```

---

## Task 2: Create embeddings utility module

**Files:**
- Create: `src/lib/embeddings.ts`

- [ ] **Step 1: Create embeddings.ts with cosineSimilarity and buildEmbeddingText**

```typescript
// src/lib/embeddings.ts

/**
 * Cosine similarity between two vectors.
 * Returns a value between -1 and 1 (1 = identical direction).
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  const dot = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const normA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const normB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  if (normA === 0 || normB === 0) return 0;
  return dot / (normA * normB);
}

interface MentorProfile {
  industry?: string;
  expertise_areas?: string[];
  years_experience?: number;
  past_mentoring?: string;
  completed_mentorships?: number;
  avg_health_score?: number;
  active_programmes?: number;
}

interface StartupProfile {
  tags?: {
    industry?: string;
    stage?: string;
    tech_stack?: string[];
    key_problem?: string;
    unique_value_prop?: string;
    team_size?: number;
  };
  industry?: string;
  completed_milestones?: number;
  active_relationships?: number;
}

/**
 * Build the text representation that gets embedded for a mentor.
 * Includes engagement stats so the vector captures outcomes, not just profile.
 */
export function buildMentorEmbeddingText(
  profile: MentorProfile
): string {
  const parts: string[] = [];

  parts.push(`Mentor specialising in ${profile.industry || "unknown"}.`);

  if (profile.expertise_areas?.length) {
    parts.push(`Expertise: ${profile.expertise_areas.join(", ")}.`);
  }

  if (profile.years_experience) {
    parts.push(`${profile.years_experience} years experience.`);
  }

  if (profile.past_mentoring) {
    parts.push(profile.past_mentoring);
  }

  // Outcome data — makes the embedding outcome-aware
  if (profile.completed_mentorships && profile.completed_mentorships > 0) {
    parts.push(`${profile.completed_mentorships} successful mentorships completed.`);
  }

  if (profile.avg_health_score && profile.avg_health_score > 0) {
    parts.push(`Average relationship health score: ${Math.round(profile.avg_health_score)}.`);
  }

  if (profile.active_programmes && profile.active_programmes > 0) {
    parts.push(`Active in ${profile.active_programmes} programmes.`);
  }

  return parts.join(" ");
}

/**
 * Build the text representation that gets embedded for a startup.
 */
export function buildStartupEmbeddingText(
  profile: StartupProfile
): string {
  const tags = profile.tags;
  const parts: string[] = [];

  parts.push(`Startup in ${tags?.industry || profile.industry || "unknown"}, stage: ${tags?.stage || "unknown"}.`);

  if (tags?.key_problem) {
    parts.push(`Problem: ${tags.key_problem}`);
  }

  if (tags?.unique_value_prop) {
    parts.push(`Solution: ${tags.unique_value_prop}`);
  }

  if (tags?.tech_stack?.length) {
    parts.push(`Tech: ${tags.tech_stack.join(", ")}.`);
  }

  if (tags?.team_size) {
    parts.push(`Team size: ${tags.team_size}.`);
  }

  // Outcome data
  if (profile.completed_milestones && profile.completed_milestones > 0) {
    parts.push(`${profile.completed_milestones} milestones completed across ${profile.active_relationships || 0} mentorships.`);
  }

  return parts.join(" ");
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /home/alex-lee/Desktop/hackathon/Nexus && npx tsc --noEmit --pretty 2>&1 | head -20
```

Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/lib/embeddings.ts
git commit -m "feat: add embeddings utility module (cosineSimilarity + text builders)"
```

---

## Task 3: Create metadata scorer (cold-start fallback)

**Files:**
- Create: `src/lib/metadata-scorer.ts`

- [ ] **Step 1: Create metadata-scorer.ts**

```typescript
// src/lib/metadata-scorer.ts

/**
 * Cold-start fallback scorer. Used when profiles don't have embeddings yet.
 * Compares fields using exact match, Jaccard similarity, and stage-vs-experience mapping.
 */

function exactMatch(a: unknown, b: unknown): number {
  if (a == null || b == null) return 0;
  return String(a).toLowerCase() === String(b).toLowerCase() ? 1 : 0;
}

function jaccardSimilarity(a: string[] | undefined, b: string[] | undefined): number {
  const setA = new Set(a || []);
  const setB = new Set(b || []);
  if (setA.size === 0 && setB.size === 0) return 0;
  const intersection = [...setA].filter((x) => setB.has(x)).length;
  const union = new Set([...setA, ...setB]).size;
  return intersection / union;
}

function stageVsExperienceFit(stage: string | undefined, years: number | undefined): number {
  if (!stage || years == null) return 0.5;
  if (years >= 10) {
    return ["growth", "scale"].includes(stage.toLowerCase()) ? 1 : 0.3;
  } else if (years >= 5) {
    return ["early-traction", "growth"].includes(stage.toLowerCase()) ? 1 : 0.3;
  } else {
    return ["ideation", "mvp", "early-traction"].includes(stage.toLowerCase()) ? 1 : 0.3;
  }
}

interface StartupData {
  industry?: string;
  tags?: {
    industry?: string;
    stage?: string;
    tech_stack?: string[];
  };
}

interface MentorData {
  industry?: string;
  expertise_areas?: string[];
  years_experience?: number;
}

export interface MetadataScoreResult {
  score: number;
  breakdown: Record<string, number>;
  reason: string;
}

/**
 * Score a startup against a mentor using metadata comparison.
 * Returns a score between 0 and 1.
 */
export function scoreStartupVsMentor(
  startup: StartupData,
  mentor: MentorData
): MetadataScoreResult {
  const industryMatch = exactMatch(
    startup.tags?.industry || startup.industry,
    mentor.industry
  );

  const techOverlap = jaccardSimilarity(
    startup.tags?.tech_stack,
    mentor.expertise_areas
  );

  const stageFit = stageVsExperienceFit(
    startup.tags?.stage,
    mentor.years_experience
  );

  const score = 0.4 * industryMatch + 0.3 * techOverlap + 0.3 * stageFit;

  const breakdown = {
    industry_match: Math.round(industryMatch * 100) / 100,
    tech_overlap: Math.round(techOverlap * 100) / 100,
    stage_fit: Math.round(stageFit * 100) / 100,
  };

  // Build reason from top-scoring dimensions
  const parts: string[] = [];
  if (industryMatch > 0.5) parts.push("strong industry match");
  if (techOverlap > 0.3) parts.push("good tech/expertise overlap");
  if (stageFit > 0.5) parts.push("good stage fit");
  const reason = parts.length > 0 ? parts.join("; ") : "baseline compatibility";

  return { score: Math.round(score * 10000) / 10000, breakdown, reason };
}

/**
 * Score a startup against all mentors, return top-k.
 */
export function scoreStartupAgainstMentors(
  startup: StartupData,
  mentors: Array<MentorData & { uid: string; name?: string }>,
  topK: number = 5
): Array<{ id: string; name: string; score: number; breakdown: Record<string, number>; reason: string }> {
  const results = mentors
    .filter((m) => m.uid !== (startup as Record<string, unknown>).uid)
    .map((mentor) => {
      const result = scoreStartupVsMentor(startup, mentor);
      return {
        id: mentor.uid,
        name: mentor.name || "Unknown",
        score: result.score,
        breakdown: result.breakdown,
        reason: result.reason,
      };
    });

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, topK);
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /home/alex-lee/Desktop/hackathon/Nexus && npx tsc --noEmit --pretty 2>&1 | head -20
```

Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/lib/metadata-scorer.ts
git commit -m "feat: add metadata scorer for cold-start fallback"
```

---

## Task 4: Create embed-profile API route

**Files:**
- Create: `src/app/api/embed-profile/route.ts`

- [ ] **Step 1: Create embed-profile route**

```typescript
// src/app/api/embed-profile/route.ts

import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { buildMentorEmbeddingText, buildStartupEmbeddingText } from "@/lib/embeddings";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export async function POST(req: NextRequest) {
  const { userId } = await req.json();

  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }

  try {
    // Init Firebase Admin
    const { initializeApp, cert, getApps } = await import("firebase-admin/app");
    const { getFirestore } = await import("firebase-admin/firestore");

    if (getApps().length === 0) {
      initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
        }),
      });
    }

    const adminDb = getFirestore();

    // Read user profile
    const userDoc = await adminDb.doc(`users/${userId}`).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userData = userDoc.data()!;

    // Read engagement stats
    const relationshipsSnap = await adminDb
      .collection("relationships")
      .where(userData.role === "mentor" ? "mentor_id" : "startup_id", "==", userId)
      .get();

    let completedMentorships = 0;
    let totalHealth = 0;
    let completedMilestones = 0;
    const programmeIds = new Set<string>();

    for (const relDoc of relationshipsSnap.docs) {
      const rel = relDoc.data();
      programmeIds.add(rel.programme_id);
      completedMilestones += rel.milestones_completed || 0;
      totalHealth += rel.health_score || 0;
      if (rel.outcome_status === "completed") completedMentorships++;
    }

    const activeRelationships = relationshipsSnap.size;
    const avgHealthScore = activeRelationships > 0 ? totalHealth / activeRelationships : 0;

    // Build text based on role
    let text: string;
    if (userData.role === "mentor") {
      text = buildMentorEmbeddingText({
        industry: userData.industry,
        expertise_areas: userData.expertise_areas,
        years_experience: userData.years_experience,
        past_mentoring: userData.past_mentoring,
        completed_mentorships: completedMentorships,
        avg_health_score: avgHealthScore,
        active_programmes: programmeIds.size,
      });
    } else {
      text = buildStartupEmbeddingText({
        tags: userData.tags,
        industry: userData.industry,
        completed_milestones: completedMilestones,
        active_relationships: activeRelationships,
      });
    }

    // Call Gemini Embedding API
    const result = await ai.models.embedContent({
      model: "text-embedding-004",
      contents: [{ role: "user", parts: [{ text }] }],
    });

    const embedding = result.embeddings?.[0]?.values;
    if (!embedding || embedding.length === 0) {
      return NextResponse.json({ error: "Embedding API returned empty result" }, { status: 500 });
    }

    // Store in Firestore
    await adminDb.doc(`users/${userId}`).update({
      embedding,
      embedding_model: "text-embedding-004",
      embedding_updated_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      embedding_dimensions: embedding.length,
      model: "text-embedding-004",
    });
  } catch (error) {
    console.error("Embed profile error:", error);
    return NextResponse.json({ error: "Failed to generate embedding" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /home/alex-lee/Desktop/hackathon/Nexus && npx tsc --noEmit --pretty 2>&1 | head -20
```

Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/app/api/embed-profile/route.ts
git commit -m "feat: add /api/embed-profile route (Gemini embedding generation)"
```

---

## Task 5: Create graph-score API route

**Files:**
- Create: `src/app/api/graph-score/route.ts`

- [ ] **Step 1: Create graph-score route**

```typescript
// src/app/api/graph-score/route.ts

import { NextRequest, NextResponse } from "next/server";
import { cosineSimilarity } from "@/lib/embeddings";
import { scoreStartupAgainstMentors } from "@/lib/metadata-scorer";

export async function POST(req: NextRequest) {
  const { startupId, targetType = "mentor", topK = 5 } = await req.json();

  if (!startupId) {
    return NextResponse.json({ error: "Missing startupId" }, { status: 400 });
  }

  try {
    // Init Firebase Admin
    const { initializeApp, cert, getApps } = await import("firebase-admin/app");
    const { getFirestore } = await import("firebase-admin/firestore");

    if (getApps().length === 0) {
      initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
        }),
      });
    }

    const adminDb = getFirestore();

    // Read startup profile
    const startupDoc = await adminDb.doc(`users/${startupId}`).get();
    if (!startupDoc.exists) {
      return NextResponse.json({ error: "Startup not found" }, { status: 404 });
    }
    const startupData = startupDoc.data()!;

    // Read all target-type profiles
    const targetRole = targetType === "programme" ? undefined : targetType;
    let targets: Array<Record<string, unknown>> = [];

    if (targetType === "programme") {
      const programmesSnap = await adminDb.collection("programmes").get();
      targets = programmesSnap.docs.map((d) => ({ uid: d.id, ...d.data() }));
    } else {
      const usersSnap = await adminDb
        .collection("users")
        .where("role", "==", targetRole)
        .get();
      targets = usersSnap.docs.map((d) => ({ uid: d.id, ...d.data() }));
    }

    if (targets.length === 0) {
      return NextResponse.json({
        source: { type: "startup", id: startupId },
        target_type: targetType,
        matches: [],
        scoring_method: "no_targets",
      });
    }

    // Check if startup has an embedding
    const startupEmbedding = startupData.embedding as number[] | undefined;

    if (startupEmbedding && startupEmbedding.length > 0) {
      // EMBEDDING-BASED SCORING
      const scored = targets
        .filter((t) => {
          const emb = t.embedding as number[] | undefined;
          return emb && emb.length > 0 && t.uid !== startupId;
        })
        .map((target) => {
          const targetEmbedding = target.embedding as number[];
          const sim = cosineSimilarity(startupEmbedding, targetEmbedding);
          return {
            id: target.uid as string,
            name: (target.name as string) || "Unknown",
            score: Math.round(sim * 10000) / 10000,
            reason: sim > 0.8 ? "strong semantic similarity" : sim > 0.5 ? "moderate similarity" : "baseline similarity",
          };
        });

      scored.sort((a, b) => b.score - a.score);

      // Check if we have any embedding-based results
      if (scored.length > 0) {
        return NextResponse.json({
          source: { type: "startup", id: startupId },
          target_type: targetType,
          matches: scored.slice(0, topK),
          scoring_method: "embedding_similarity",
        });
      }
    }

    // COLD START FALLBACK — metadata matching
    if (targetRole === "mentor") {
      const matches = scoreStartupAgainstMentors(
        startupData,
        targets as Array<Record<string, unknown> & { uid: string; name?: string }>,
        topK
      );
      return NextResponse.json({
        source: { type: "startup", id: startupId },
        target_type: targetType,
        matches,
        scoring_method: "metadata_matching",
      });
    }

    // For programme matching, return basic results
    return NextResponse.json({
      source: { type: "startup", id: startupId },
      target_type: targetType,
      matches: targets.slice(0, topK).map((t) => ({
        id: t.uid,
        name: (t.name as string) || "Unknown",
        score: 0.5,
        reason: "programme matching not yet implemented with embeddings",
      })),
      scoring_method: "metadata_matching",
    });
  } catch (error) {
    console.error("Graph score error:", error);
    return NextResponse.json({ error: "Failed to score matches" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /home/alex-lee/Desktop/hackathon/Nexus && npx tsc --noEmit --pretty 2>&1 | head -20
```

Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/app/api/graph-score/route.ts
git commit -m "feat: add /api/graph-score route (cosine similarity + metadata fallback)"
```

---

## Task 6: Wire embed-profile to account page (after deck extraction)

**Files:**
- Modify: `src/app/account/page.tsx`

- [ ] **Step 1: Find the extract-deck call in account/page.tsx**

Read `src/app/account/page.tsx` and find the section where `handleFileUpload` calls `/api/extract-deck`. After the successful response, add a fire-and-forget call to `/api/embed-profile`.

- [ ] **Step 2: Add embed-profile call after extract-deck succeeds**

In `src/app/account/page.tsx`, inside `handleFileUpload`, find the line after the Firestore profile update (after `await updateDoc(...)` for the tags/quality). Add:

```typescript
    // Fire and forget — generate embedding with updated tags
    fetch("/api/embed-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.uid }),
    }).catch((err) => console.error("Embed failed:", err));
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /home/alex-lee/Desktop/hackathon/Nexus && npx tsc --noEmit --pretty 2>&1 | head -20
```

Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/app/account/page.tsx
git commit -m "feat: trigger embed-profile after deck extraction"
```

---

## Task 7: Wire embed-profile to milestone completion

**Files:**
- Modify: `src/app/matches/[id]/page.tsx`

- [ ] **Step 1: Add embed-profile call after milestone completion**

In `src/app/matches/[id]/page.tsx`, inside `handleCompleteMilestone`, after the health narration fetch call (the `fetch("/api/health-narration", ...)` block), add:

```typescript
    // Re-embed startup with updated engagement stats (fire and forget)
    fetch("/api/embed-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.uid }),
    }).catch((err) => console.error("Re-embed failed:", err));
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /home/alex-lee/Desktop/hackathon/Nexus && npx tsc --noEmit --pretty 2>&1 | head -20
```

Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/app/matches/[id]/page.tsx
git commit -m "feat: trigger embed-profile after milestone completion (feedback loop)"
```

---

## Task 8: Manual verification

- [ ] **Step 1: Full build check**

```bash
cd /home/alex-lee/Desktop/hackathon/Nexus && pnpm build 2>&1 | tail -30
```

Expected: Build succeeds with no errors.

- [ ] **Step 2: Verify the demo flow works**

1. Start the app: `pnpm dev`
2. Sign in as a startup, upload a pitch deck
3. Check Firestore — `users/{uid}` should have `embedding` array populated
4. Sign in as admin, create a programme, add startups/mentors, click Generate Matches
5. Sign in as a startup, go to Matches, complete a milestone
6. Check Firestore — `users/{uid}.embedding` should be updated (different values than before)

---

## Spec Coverage Check

| Spec Requirement | Task |
|---|---|
| Embedding generation | Task 4 (embed-profile route) |
| Embedding text builders | Task 2 (embeddings.ts) |
| Cosine similarity scoring | Task 5 (graph-score route) |
| Cold-start metadata fallback | Task 3 (metadata-scorer.ts) + Task 5 |
| Outcome-aware embeddings | Task 4 (reads engagement stats) + Task 2 (includes stats in text) |
| Feedback loop (re-embed on milestone) | Task 7 |
| Re-embed after deck extraction | Task 6 |
| Type definitions | Task 1 |
