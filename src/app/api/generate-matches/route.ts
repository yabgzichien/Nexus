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

    // Get approved registered startups for this programme
    const startupRegsSnap = await adminDb
      .collection("programme_registrations")
      .where("programme_id", "==", programmeId)
      .where("role", "==", "startup")
      .where("status", "==", "approved")
      .get();

    const startupIds = startupRegsSnap.docs.map((d) => d.data().user_id);

    // Get approved registered mentors for this programme
    const mentorRegsSnap = await adminDb
      .collection("programme_registrations")
      .where("programme_id", "==", programmeId)
      .where("role", "==", "mentor")
      .where("status", "==", "approved")
      .get();

    const mentorIds = mentorRegsSnap.docs.map((d) => d.data().user_id);

    if (startupIds.length === 0 || mentorIds.length === 0) {
      return NextResponse.json({
        error: "No approved startups or mentors registered for this programme",
        matchCount: 0,
      });
    }

    // Get startup profiles (filter by quality threshold)
    const startups: Record<string, unknown>[] = [];
    for (const startupId of startupIds) {
      const userDoc = await adminDb.doc(`users/${startupId}`).get();
      if (userDoc.exists) {
        const data = userDoc.data() as Record<string, unknown>;
        if ((data.quality_score as number) >= threshold) {
          startups.push({ uid: startupId, ...data });
        }
      }
    }

    // Get mentor profiles
    const mentors: Record<string, unknown>[] = [];
    for (const mentorId of mentorIds) {
      const userDoc = await adminDb.doc(`users/${mentorId}`).get();
      if (userDoc.exists) {
        mentors.push({ uid: mentorId, ...userDoc.data() });
      }
    }

    if (startups.length === 0 || mentors.length === 0) {
      return NextResponse.json({
        error: "No qualified startups or mentors available after filtering",
        matchCount: 0,
      });
    }

    // Fetch existing relationships to learn from health patterns
    const relationshipsSnap = await adminDb.collection("relationships").get();
    const relationships = relationshipsSnap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as Record<string, unknown>[];

    // Analyze successful vs unsuccessful matches
    const successfulMatches: Record<string, unknown>[] = [];
    const unsuccessfulMatches: Record<string, unknown>[] = [];

    for (const rel of relationships) {
      const healthScore = rel.health_score as number;
      const mentorId = rel.mentor_id as string;
      const startupId = rel.startup_id as string;

      // Get mentor and startup details for this relationship
      const [mentorDoc, startupDoc] = await Promise.all([
        adminDb.doc(`users/${mentorId}`).get(),
        adminDb.doc(`users/${startupId}`).get(),
      ]);

      if (!mentorDoc.exists || !startupDoc.exists) continue;

      const mentorData = mentorDoc.data();
      const startupData = startupDoc.data();

      const matchSummary = {
        mentor_industry: mentorData?.industry,
        mentor_expertise: mentorData?.expertise_areas || [],
        startup_industry: startupData?.tags?.industry || startupData?.industry,
        startup_stage: startupData?.tags?.stage,
        startup_problem: startupData?.tags?.key_problem,
        health_score: healthScore,
        health_trend: rel.health_trend,
        milestones_completed: rel.milestones_completed,
        edge_weight: rel.edge_weight,
      };

      if (healthScore >= 70) {
        successfulMatches.push(matchSummary);
      } else if (healthScore < 50) {
        unsuccessfulMatches.push(matchSummary);
      }
    }

    // Build profiles summary for Gemini
    const startupSummaries = startups.map((s) => ({
      id: s.uid,
      name: s.name,
      industry: (s.tags as Record<string, unknown>)?.industry || s.industry,
      stage: (s.tags as Record<string, unknown>)?.stage || "unknown",
      key_problem: (s.tags as Record<string, unknown>)?.key_problem || "",
      tech_stack: (s.tags as Record<string, unknown>)?.tech_stack || [],
      unique_value_prop: (s.tags as Record<string, unknown>)?.unique_value_prop || "",
    }));

    const mentorSummaries = mentors.map((m) => ({
      id: m.uid,
      name: m.name,
      industry: m.industry,
      expertise_areas: m.expertise_areas || [],
      years_experience: m.years_experience || 0,
      past_mentoring: m.past_mentoring || "",
    }));

    // Build learning context from historical data
    let learningContext = "";
    
    if (successfulMatches.length > 0) {
      learningContext += `
SUCCESSFUL MATCHES (Health Score >= 70):
${JSON.stringify(successfulMatches.slice(0, 10), null, 2)}

These matches worked well. Look for similar patterns:
- Industry alignment between mentor and startup
- Expertise areas matching the startup's key problems
- Complementary skills and experience
`;
    }

    if (unsuccessfulMatches.length > 0) {
      learningContext += `
UNSUCCESSFUL MATCHES (Health Score < 50):
${JSON.stringify(unsuccessfulMatches.slice(0, 10), null, 2)}

These matches didn't work well. Avoid similar patterns:
- Mismatched industries without transferable expertise
- Expertise not relevant to startup's challenges
- Poor communication or engagement patterns
`;
    }

    if (successfulMatches.length > 0 || unsuccessfulMatches.length > 0) {
      learningContext += `
Use these patterns to inform your matching decisions. Prioritize combinations similar to successful matches and avoid combinations similar to unsuccessful ones.
`;
    }

    // Integration 3: Gemini Match Generation with learning
    const matchResult = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `You are an AI matching engine for an innovation ecosystem. Match startups with mentors based on expertise alignment, industry fit, and complementary skills.

${learningContext ? `HISTORICAL MATCH DATA:\n${learningContext}\n` : ""}
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
${successfulMatches.length > 0 ? "- Learn from successful matches: prioritize similar industry/expertise combinations" : ""}
${unsuccessfulMatches.length > 0 ? "- Avoid patterns from unsuccessful matches: don't pair mismatched industries" : ""}

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

    return NextResponse.json({ 
      success: true, 
      matchCount,
      learning: {
        successfulMatchesUsed: successfulMatches.length,
        unsuccessfulMatchesUsed: unsuccessfulMatches.length,
      }
    });
  } catch (error) {
    console.error("Generate matches error:", error);
    return NextResponse.json({ error: "Failed to generate matches" }, { status: 500 });
  }
}
