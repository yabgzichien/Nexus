import { NextRequest, NextResponse } from "next/server";
import { cosineSimilarity } from "@/lib/embeddings";
import { scoreStartupAgainstMentors } from "@/lib/metadata-scorer";

function getReason(score: number): string {
  if (score > 0.8) return "strong semantic similarity";
  if (score > 0.5) return "moderate similarity";
  return "baseline similarity";
}

interface FirestoreDoc {
  id: string;
  [key: string]: unknown;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const startupId = body.startupId as string;
  const targetType = (body.targetType as string) || "mentor";
  const topK = (body.topK as number) || 5;

  if (!startupId) {
    return NextResponse.json({ error: "Missing startupId" }, { status: 400 });
  }

  if (targetType !== "mentor" && targetType !== "programme") {
    return NextResponse.json(
      { error: "targetType must be 'mentor' or 'programme'" },
      { status: 400 }
    );
  }

  try {
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

    // 1. Read startup profile
    const startupDoc = await adminDb.doc(`users/${startupId}`).get();
    if (!startupDoc.exists) {
      return NextResponse.json({ error: "Startup not found" }, { status: 404 });
    }
    const startupData = startupDoc.data()!;

    // 2. Read targets
    let targets: FirestoreDoc[];

    if (targetType === "mentor") {
      const mentorsSnap = await adminDb
        .collection("users")
        .where("role", "==", "mentor")
        .get();
      targets = mentorsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    } else {
      const programmesSnap = await adminDb.collection("programmes").get();
      targets = programmesSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    }

    // 3. Check if embeddings are available
    const startupEmbedding = startupData.embedding as number[] | undefined;
    const hasStartupEmbedding = Array.isArray(startupEmbedding) && startupEmbedding.length > 0;
    const targetsWithEmbeddings = targets.filter(
      (t) => Array.isArray(t.embedding) && (t.embedding as number[]).length > 0
    );

    if (hasStartupEmbedding && targetsWithEmbeddings.length > 0) {
      // Embedding similarity path
      const scored = targetsWithEmbeddings.map((target) => {
        const score = cosineSimilarity(startupEmbedding, target.embedding as number[]);
        return {
          id: target.id,
          name: (target.name as string) || target.id,
          score: Math.round(score * 100) / 100,
          reason: getReason(score),
        };
      });

      scored.sort((a, b) => b.score - a.score);
      const matches = scored.slice(0, topK);

      return NextResponse.json({
        source: { type: "startup", id: startupId },
        target_type: targetType,
        matches,
        scoring_method: "embedding_similarity",
      });
    }

    // 4. Cold start fallback — metadata matching
    if (targetType === "mentor") {
      const mentors = targets.map((t) => ({
        uid: t.id,
        name: t.name as string | undefined,
        industry: t.industry as string | undefined,
        expertise_areas: t.expertise_areas as string[] | undefined,
        years_experience: t.years_experience as number | undefined,
      }));

      const results = scoreStartupAgainstMentors(
        startupData as Record<string, unknown>,
        mentors,
        topK
      );

      return NextResponse.json({
        source: { type: "startup", id: startupId },
        target_type: targetType,
        matches: results.map((r) => ({
          id: r.uid,
          name: r.name || r.uid,
          score: r.score,
          reason: r.reason,
        })),
        scoring_method: "metadata_matching",
      });
    }

    // Programme cold start fallback
    const programmeMatches = targets.slice(0, topK).map((t) => ({
      id: t.id,
      name: (t.name as string) || t.id,
      score: 0.5,
      reason: "programme matching not yet implemented with embeddings",
    }));

    return NextResponse.json({
      source: { type: "startup", id: startupId },
      target_type: targetType,
      matches: programmeMatches,
      scoring_method: "metadata_matching",
    });
  } catch (error) {
    console.error("Graph score error:", error);
    return NextResponse.json({ error: "Failed to compute graph scores" }, { status: 500 });
  }
}
