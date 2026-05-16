import { Timestamp } from "firebase/firestore";

export interface DemoSeed {
  role: "startup" | "mentor" | "admin";
  profile: {
    role: "startup" | "mentor" | "admin";
    name: string;
    email: string;
    description: string;
    industry: string;
    [key: string]: unknown;
  };
}

export const DEMO_SEEDS: Record<string, DemoSeed["profile"]> = {
  startup: {
    role: "startup",
    name: "Finova (Demo)",
    email: "demo-startup@nexus.com",
    description:
      "AI-powered personal finance platform helping Malaysians track spending, build savings, and invest smartly.",
    industry: "Fintech",
    stage: "mvp",
    tags: {
      industry: "Fintech",
      stage: "mvp",
      tech_stack: ["React Native", "Node.js", "PostgreSQL"],
      funding_ask: "RM 500K",
      team_size: 4,
      key_problem: "Young Malaysians lack accessible personal finance tools",
      unique_value_prop: "AI-driven financial coaching embedded in daily banking",
    },
    quality_score: 78,
    quality_breakdown: {
      problem_clarity: 82,
      market_size: 75,
      team_strength: 80,
      mvp_readiness: 74,
    },
    quality_summary:
      "Strong team with clear problem definition. MVP is functional but needs regulatory compliance work.",
  },
  mentor: {
    role: "mentor",
    name: "Datuk Sarah (Demo)",
    email: "demo-mentor@nexus.com",
    description:
      "Former VC partner with 15 years in Southeast Asian tech investing. Now focused on mentoring early-stage founders.",
    industry: "Venture Capital",
    expertise_areas: [
      "Fundraising",
      "Product-Market Fit",
      "Go-to-Market Strategy",
      "Scaling Teams",
    ],
    years_experience: 15,
    past_mentoring:
      "Mentored 30+ startups across MaGIC, Endeavour, and national accelerator programmes.",
  },
  admin: {
    role: "admin",
    name: "CIP Programme Manager (Demo)",
    email: "demo-admin@nexus.com",
    description:
      "Managing the innovation accelerator programme. Oversees mentor-startup matching and programme health.",
    industry: "Programme Management",
  },
};
