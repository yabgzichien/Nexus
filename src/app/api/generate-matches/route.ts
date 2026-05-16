import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export async function POST(req: NextRequest) {
  const { programmeId } = await req.json();

  if (!programmeId) {
    return NextResponse.json({ error: "Missing programmeId" }, { status: 400 });
  }

  try {
    const { initializeApp, cert, getApps } = await import("firebase-admin/app");
    const { getFirestore, Timestamp } = await import("firebase-admin/firestore");

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

    // Get programme threshold
    const progDoc = await adminDb.doc(`programmes/${programmeId}`).get();
    const programme = progDoc.data();
    const threshold = programme?.match_threshold || 60;

    // Get qualified startups
    const startupsSnap = await adminDb
      .collection("users")
      .where("role", "==", "startup")
      .where("quality_score", ">=", threshold)
      .get();

    const startups = startupsSnap.docs.map((d) => ({ uid: d.id, ...d.data() }));

    // Get all mentors
    const mentorsSnap = await adminDb
      .collection("users")
      .where("role", "==", "mentor")
      .get();

    const mentors = mentorsSnap.docs.map((d) => ({ uid: d.id, ...d.data() }));

    if (startups.length === 0 || mentors.length === 0) {
      return NextResponse.json({ error: "No startups or mentors available", matchCount: 0 });
    }

    // Build profiles summary for Gemini
    const startupSummaries = startups.map((s: Record<string, unknown>) => ({
      id: s.uid,
      name: s.name,
      industry: (s.tags as Record<string, unknown>)?.industry || s.industry,
      stage: (s.tags as Record<string, unknown>)?.stage || "unknown",
      key_problem: (s.tags as Record<string, unknown>)?.key_problem || "",
      tech_stack: (s.tags as Record<string, unknown>)?.tech_stack || [],
      unique_value_prop: (s.tags as Record<string, unknown>)?.unique_value_prop || "",
    }));

    const mentorSummaries = mentors.map((m: Record<string, unknown>) => ({
      id: m.uid,
      name: m.name,
      industry: m.industry,
      expertise_areas: m.expertise_areas || [],
      years_experience: m.years_experience || 0,
      past_mentoring: m.past_mentoring || "",
    }));

    // Integration 3: Gemini Match Generation
    const matchResult = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `You are an AI matching engine for an innovation ecosystem. Match startups with mentors based on expertise alignment, industry fit, and complementary skills.

STARTUPS:
${JSON.stringify(startupSummaries, null, 2)}

MENTORS:
${JSON.stringify(mentorSummaries, null, 2)}

For each startup, select the best mentor match. Return a JSON array:
[
  {
    "startup_id": "id",
    "mentor_id": "id",
    "edge_weight": number (0-100, compatibility score),
    "match_narrative": "2-3 sentences explaining WHY this match works, citing specific expertise overlaps and complementary strengths"
  }
]

Rules:
- Each startup gets exactly one mentor match
- A mentor can be matched with multiple startups (up to 3)
- Prioritize expertise alignment with the startup's key problem
- Score should reflect genuine compatibility, not just any match
- Narratives should be specific and cite concrete overlaps

Return ONLY valid JSON array, no markdown.`,
            },
          ],
        },
      ],
    });

    let matches;
    try {
      const text = matchResult.text?.replace(/```json\n?|\n?```/g, "").trim() || "[]";
      matches = JSON.parse(text);
    } catch {
      return NextResponse.json({ error: "Failed to parse match results", matchCount: 0 });
    }

    // Write matches to Firestore as relationship entities
    const batch = adminDb.batch();
    let matchCount = 0;

    for (const match of matches) {
      const relRef = adminDb.collection("relationships").doc();
      batch.set(relRef, {
        mentor_id: match.mentor_id,
        startup_id: match.startup_id,
        programme_id: programmeId,
        created_at: Timestamp.now(),
        last_active_at: Timestamp.now(),
        health_score: 50,
        health_trend: "stable",
        health_narration: "New match — relationship initiated. First milestone pending.",
        last_health_update: Timestamp.now(),
        platform_messages_sent: 0,
        milestones_total: 4,
        milestones_completed: 0,
        edge_weight: match.edge_weight,
        match_narrative: match.match_narrative,
        outcome_status: "active",
      });
      matchCount++;
    }

    await batch.commit();

    return NextResponse.json({ success: true, matchCount });
  } catch (error) {
    console.error("Generate matches error:", error);
    return NextResponse.json({ error: "Failed to generate matches" }, { status: 500 });
  }
}
