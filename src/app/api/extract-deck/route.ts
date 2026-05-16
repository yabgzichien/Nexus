import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export async function POST(req: NextRequest) {
  const { pitchDeckUrl, userId } = await req.json();

  if (!pitchDeckUrl || !userId) {
    return NextResponse.json({ error: "Missing pitchDeckUrl or userId" }, { status: 400 });
  }

  try {
    // Fetch the PDF from GCS
    const pdfResponse = await fetch(pitchDeckUrl);
    const pdfBuffer = await pdfResponse.arrayBuffer();
    const base64Pdf = Buffer.from(pdfBuffer).toString("base64");

    // Integration 1: Extract structured tags
    const extractionResult = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType: "application/pdf",
                data: base64Pdf,
              },
            },
            {
              text: `Analyze this pitch deck and extract the following information as JSON. Be concise and accurate:
{
  "industry": "primary industry (e.g., Fintech, HealthTech, EdTech)",
  "stage": "startup stage (ideation, mvp, early-traction, growth, scale)",
  "tech_stack": ["list of technologies mentioned"],
  "funding_ask": "funding amount if mentioned, otherwise 'Not specified'",
  "team_size": number or 0 if not mentioned,
  "key_problem": "one sentence describing the problem they solve",
  "unique_value_prop": "one sentence describing their unique approach"
}
Return ONLY valid JSON, no markdown.`,
            },
          ],
        },
      ],
    });

    let tags;
    try {
      const text = extractionResult.text?.replace(/```json\n?|\n?```/g, "").trim() || "{}";
      tags = JSON.parse(text);
    } catch {
      tags = {
        industry: "Unknown",
        stage: "mvp",
        tech_stack: [],
        funding_ask: "Not specified",
        team_size: 0,
        key_problem: "Unable to extract",
        unique_value_prop: "Unable to extract",
      };
    }

    // Integration 2: Quality Gate scoring
    const qualityResult = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType: "application/pdf",
                data: base64Pdf,
              },
            },
            {
              text: `Score this pitch deck across 4 criteria. Each criterion is scored 0-25, total 0-100.

Criteria:
1. Problem Clarity (0-25): How clearly is the problem defined? Is there evidence of real pain?
2. Market Size (0-25): Is the addressable market well-defined and large enough?
3. Team Strength (0-25): Does the team have relevant experience and complementary skills?
4. MVP Readiness (0-25): How close is this to a working product? Is there traction?

Return ONLY valid JSON:
{
  "problem_clarity": number,
  "market_size": number,
  "team_strength": number,
  "mvp_readiness": number,
  "total": number,
  "summary": "1-2 sentence assessment"
}`,
            },
          ],
        },
      ],
    });

    let quality;
    try {
      const text = qualityResult.text?.replace(/```json\n?|\n?```/g, "").trim() || "{}";
      quality = JSON.parse(text);
    } catch {
      quality = {
        problem_clarity: 15,
        market_size: 15,
        team_strength: 15,
        mvp_readiness: 15,
        total: 60,
        summary: "Analysis unavailable.",
      };
    }

    // Update Firestore with results
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
    await adminDb.doc(`users/${userId}`).update({
      tags,
      quality_score: quality.total,
      quality_breakdown: {
        problem_clarity: quality.problem_clarity,
        market_size: quality.market_size,
        team_strength: quality.team_strength,
        mvp_readiness: quality.mvp_readiness,
      },
      quality_summary: quality.summary,
    });

    return NextResponse.json({
      success: true,
      tags,
      quality_score: quality.total,
      quality_breakdown: quality,
    });
  } catch (error) {
    console.error("Extract deck error:", error);
    return NextResponse.json({ error: "Failed to process pitch deck" }, { status: 500 });
  }
}
