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

  if (profile.completed_milestones && profile.completed_milestones > 0) {
    parts.push(`${profile.completed_milestones} milestones completed across ${profile.active_relationships || 0} mentorships.`);
  }

  return parts.join(" ");
}
