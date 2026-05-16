import { Timestamp } from "firebase/firestore";

export type UserRole = "startup" | "mentor" | "admin";

export interface UserProfile {
  uid: string;
  role: UserRole;
  name: string;
  email: string;
  bio: string;
  industry: string;
  created_at: Timestamp;

  // Startup-specific
  stage?: string;
  pitch_deck_url?: string;
  tags?: StartupTags;
  quality_score?: number;
  quality_breakdown?: QualityBreakdown;
  quality_summary?: string;

  // Mentor-specific
  expertise_areas?: string[];
  years_experience?: number;
  past_mentoring?: string;
}

export interface StartupTags {
  industry: string;
  stage: string;
  tech_stack: string[];
  funding_ask: string;
  team_size: number;
  key_problem: string;
  unique_value_prop: string;
}

export interface QualityBreakdown {
  problem_clarity: number;
  market_size: number;
  team_strength: number;
  mvp_readiness: number;
}

export interface Programme {
  id: string;
  name: string;
  description: string;
  status: "active" | "completed";
  match_threshold: number;
  created_by: string;
  created_at: Timestamp;
  start_date?: Timestamp;
  end_date?: Timestamp;
  venue?: string;
  registration_deadline?: Timestamp;
  capacity?: number;
  prerequisites?: string;
  contact_email?: string;
}

export interface ProgrammeRegistration {
  id: string;
  programme_id: string;
  user_id: string;
  role: "startup" | "mentor";
  status: "pending" | "approved" | "rejected";
  created_at: Timestamp;
}

export type HealthTrend = "improving" | "stable" | "decaying";

export interface Relationship {
  id: string;
  mentor_id: string;
  startup_id: string;
  programme_id: string;
  created_at: Timestamp;
  last_active_at: Timestamp;

  health_score: number;
  health_trend: HealthTrend;
  health_narration: string;
  last_health_update: Timestamp;

  platform_messages_sent: number;
  milestones_total: number;
  milestones_completed: number;

  edge_weight: number;
  match_narrative: string;

  outcome_status: "active" | "completed" | "terminated";
}

export type BlueprintType = "Business" | "Tech" | "Management" | "Certification";

export interface Milestone {
  id: string;
  relationship_id: string;
  blueprint_type: BlueprintType;
  title: string;
  description: string;
  status: "pending" | "completed";
  due_at: Timestamp;
  completed_at: Timestamp | null;
}

export interface Signal {
  id: string;
  relationship_id: string;
  signal_type: "message" | "milestone_complete";
  actor_id: string;
  timestamp: Timestamp;
  metadata: Record<string, unknown>;
}

export interface Message {
  id: string;
  relationship_id: string;
  sender_id: string;
  text: string;
  timestamp: Timestamp;
  read: boolean;
}

export interface ConnectionRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: "pending" | "approved" | "rejected";
  created_at: Timestamp;
}
