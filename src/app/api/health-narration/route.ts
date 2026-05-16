import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export async function POST(req: NextRequest) {
  const { relationshipId } = await req.json();

  if (!relationshipId) {
    return NextResponse.json({ error: "Missing relationshipId" }, { status: 400 });
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

    // Get relationship data
    const relDoc = await adminDb.doc(`relationships/${relationshipId}`).get();
    if (!relDoc.exists) {
      return NextResponse.json({ error: "Relationship not found" }, { status: 404 });
    }
    const rel = relDoc.data()!;

    // Get milestone data
    const milestonesSnap = await adminDb
      .collection("milestones")
      .where("relationship_id", "==", relationshipId)
      .get();

    const milestones = milestonesSnap.docs.map((d) => d.data());

    // Calculate days since last interaction
    const lastActive = rel.last_active_at?.toDate?.() || new Date();
    const daysSinceInteraction = Math.floor(
      (Date.now() - lastActive.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Integration 4: Gemini Health Narration
    const narrationResult = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `You are an AI relationship health analyst for an innovation ecosystem. Analyze this mentor-startup relationship and provide a brief health assessment.

RELATIONSHIP DATA:
- Health Score: ${rel.health_score}/100
- Current Trend: ${rel.health_trend}
- Days Since Last Interaction: ${daysSinceInteraction}
- Platform Messages Sent: ${rel.platform_messages_sent}
- Milestones Completed: ${rel.milestones_completed}/${rel.milestones_total}
- Match Compatibility Score: ${rel.edge_weight}%
- Outcome Status: ${rel.outcome_status}

MILESTONES:
${JSON.stringify(milestones.map((m) => ({ title: m.title, status: m.status, type: m.blueprint_type })), null, 2)}

Write a 2-3 sentence plain-English health assessment. Include:
1. Current state assessment
2. Key observation (positive or concerning)
3. One specific recommendation

Also determine the health trend: "improving", "stable", or "decaying"

Return JSON:
{
  "narration": "your 2-3 sentence assessment",
  "trend": "improving" | "stable" | "decaying"
}

Return ONLY valid JSON, no markdown.`,
            },
          ],
        },
      ],
    });

    let result;
    try {
      const text = narrationResult.text?.replace(/```json\n?|\n?```/g, "").trim() || "{}";
      result = JSON.parse(text);
    } catch {
      result = {
        narration: "Unable to generate health assessment at this time.",
        trend: rel.health_trend || "stable",
      };
    }

    // Update relationship with new narration
    await adminDb.doc(`relationships/${relationshipId}`).update({
      health_narration: result.narration,
      health_trend: result.trend,
      last_health_update: Timestamp.now(),
    });

    return NextResponse.json({
      success: true,
      narration: result.narration,
      trend: result.trend,
    });
  } catch (error) {
    console.error("Health narration error:", error);
    return NextResponse.json({ error: "Failed to generate health narration" }, { status: 500 });
  }
}
