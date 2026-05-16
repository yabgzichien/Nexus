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

interface MentorWithIdentity extends MentorData {
  uid: string;
  name?: string;
}

interface ScoreBreakdown {
  industry_match: number;
  tech_overlap: number;
  stage_fit: number;
}

interface ScoreResult {
  score: number;
  breakdown: ScoreBreakdown;
  reason: string;
}

function exactMatch(a: string | undefined, b: string | undefined): number {
  if (!a || !b) return 0.0;
  return a.toLowerCase().trim() === b.toLowerCase().trim() ? 1.0 : 0.0;
}

function jaccardSimilarity(a: string[], b: string[]): number {
  if (a.length === 0 && b.length === 0) return 0.0;
  const setA = new Set(a.map((s) => s.toLowerCase().trim()));
  const setB = new Set(b.map((s) => s.toLowerCase().trim()));
  let intersection = 0;
  for (const item of setA) {
    if (setB.has(item)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0.0 : intersection / union;
}

function stageVsExperienceFit(
  stage: string | undefined,
  years: number | undefined
): number {
  if (!stage || years === undefined) return 0.0;
  let affinity: Set<string>;
  if (years >= 10) {
    affinity = new Set(["growth", "scale"]);
  } else if (years >= 5) {
    affinity = new Set(["early-traction", "growth"]);
  } else {
    affinity = new Set(["ideation", "mvp", "early-traction"]);
  }
  return affinity.has(stage.toLowerCase().trim()) ? 1.0 : 0.3;
}

export function scoreStartupVsMentor(
  startup: StartupData,
  mentor: MentorData
): ScoreResult {
  const industry_match = exactMatch(
    startup.tags?.industry ?? startup.industry,
    mentor.industry
  );

  const tech_overlap = jaccardSimilarity(
    startup.tags?.tech_stack ?? [],
    mentor.expertise_areas ?? []
  );

  const stage_fit = stageVsExperienceFit(
    startup.tags?.stage,
    mentor.years_experience
  );

  const score =
    0.4 * industry_match + 0.3 * tech_overlap + 0.3 * stage_fit;

  const reasons: string[] = [];
  if (industry_match > 0.5) reasons.push("strong industry match");
  if (tech_overlap > 0.3) reasons.push("good tech/expertise overlap");
  if (stage_fit > 0.5) reasons.push("good stage fit");
  const reason = reasons.length > 0 ? reasons.join("; ") : "baseline compatibility";

  return {
    score: Math.round(score * 1000) / 1000,
    breakdown: { industry_match, tech_overlap, stage_fit },
    reason,
  };
}

export function scoreStartupAgainstMentors(
  startup: StartupData,
  mentors: MentorWithIdentity[],
  topK: number
): (ScoreResult & { uid: string; name?: string })[] {
  const results = mentors.map((mentor) => {
    const result = scoreStartupVsMentor(startup, mentor);
    return { ...result, uid: mentor.uid, name: mentor.name };
  });

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, topK);
}
