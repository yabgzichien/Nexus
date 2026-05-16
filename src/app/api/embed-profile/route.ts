import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { buildMentorEmbeddingText, buildStartupEmbeddingText } from "@/lib/embeddings";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    // Dynamic import of firebase-admin (same pattern as extract-deck)
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

    // 1. Read user profile
    const userDoc = await adminDb.doc(`users/${userId}`).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userData = userDoc.data()!;
    const role = userData.role as string;

    // 2. Read engagement stats from relationships collection
    const relationshipField = role === "mentor" ? "mentor_id" : "startup_id";
    const relationshipsSnap = await adminDb
      .collection("relationships")
      .where(relationshipField, "==", userId)
      .get();

    let completedMentorships = 0;
    let totalHealth = 0;
    let completedMilestones = 0;
    const programmeIds = new Set<string>();

    for (const doc of relationshipsSnap.docs) {
      const rel = doc.data();
      if (rel.outcome_status === "completed") completedMentorships++;
      totalHealth += rel.health_score || 0;
      completedMilestones += rel.milestones_completed || 0;
      if (rel.programme_id) programmeIds.add(rel.programme_id);
    }

    const activeRelationships = relationshipsSnap.size;
    const avgHealthScore = activeRelationships > 0 ? totalHealth / activeRelationships : 0;

    // 3. Build text representation
    let text: string;
    if (role === "mentor") {
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

    // 4. Call Gemini Embedding API
    const result = await ai.models.embedContent({
      model: "text-embedding-004",
      contents: [{ role: "user", parts: [{ text }] }],
    });
    const embedding = result.embeddings?.[0]?.values;

    if (!embedding) {
      return NextResponse.json({ error: "Embedding API returned empty result" }, { status: 500 });
    }

    // 5. Store embedding in Firestore
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
