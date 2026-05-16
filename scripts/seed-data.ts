/**
 * Seed Data Script for NEXUS Demo
 *
 * Run: npx ts-node --project tsconfig.seed.json scripts/seed-data.ts
 *
 * Creates: 3 startups, 5 mentors, 1 programme, relationships at different
 * health stages, and milestones — demonstrating the full system.
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  }),
});

const db = getFirestore();

const daysAgo = (days: number) => Timestamp.fromDate(new Date(Date.now() - days * 86400000));

async function seed() {
  console.log("🌱 Seeding NEXUS demo data...\n");

  // ===== MENTORS =====
  const mentors = [
    {
      id: "mentor-sarah",
      data: {
        role: "mentor",
        name: "Sarah Chen",
        email: "sarah.chen@example.com",
        bio: "Former CTO of GrabPay. 12 years building payment infrastructure across Southeast Asia. Passionate about helping fintech startups navigate regulatory complexity.",
        industry: "Fintech",
        expertise_areas: ["Payment Infrastructure", "Regulatory Compliance", "Fintech Scaling", "API Architecture"],
        years_experience: 12,
        past_mentoring: "Mentored 8 startups through Cradle's CIP programme. 3 achieved Series A funding.",
        created_at: daysAgo(90),
      },
    },
    {
      id: "mentor-raj",
      data: {
        role: "mentor",
        name: "Raj Krishnan",
        email: "raj.k@example.com",
        bio: "Serial healthtech entrepreneur. Founded MedikAI (acquired 2022). Deep expertise in AI/ML for healthcare and navigating PDPA/health data regulations.",
        industry: "HealthTech",
        expertise_areas: ["Healthcare AI", "Data Privacy", "Product-Market Fit", "Fundraising"],
        years_experience: 15,
        past_mentoring: "Advisor to 5 health-tech startups. Helped 2 secure MOH pilot programmes.",
        created_at: daysAgo(90),
      },
    },
    {
      id: "mentor-aminah",
      data: {
        role: "mentor",
        name: "Aminah Yusof",
        email: "aminah.y@example.com",
        bio: "VP Product at Carsome. Expert in marketplace dynamics, growth hacking, and Southeast Asian consumer behaviour. MBA from INSEAD.",
        industry: "Marketplace",
        expertise_areas: ["Growth Strategy", "Marketplace Dynamics", "Consumer Behaviour", "Go-to-Market"],
        years_experience: 10,
        past_mentoring: "MaGIC accelerator mentor for 3 cohorts. Focus on early-stage go-to-market.",
        created_at: daysAgo(90),
      },
    },
    {
      id: "mentor-david",
      data: {
        role: "mentor",
        name: "David Lim",
        email: "david.lim@example.com",
        bio: "Angel investor and former Sequoia scout for SEA. Invested in 20+ startups. Specialises in deep tech and B2B SaaS business models.",
        industry: "Deep Tech",
        expertise_areas: ["B2B SaaS", "Fundraising", "Business Model Design", "Investor Relations"],
        years_experience: 18,
        past_mentoring: "Lead mentor at 500 Startups SEA batch. Focus on investment readiness.",
        created_at: daysAgo(90),
      },
    },
    {
      id: "mentor-priya",
      data: {
        role: "mentor",
        name: "Priya Nair",
        email: "priya.n@example.com",
        bio: "Sustainability tech pioneer. Co-founded GreenChain (carbon marketplace). Expert in ESG compliance, climate tech, and impact measurement.",
        industry: "CleanTech",
        expertise_areas: ["Sustainability", "ESG Compliance", "Impact Measurement", "Carbon Markets"],
        years_experience: 8,
        past_mentoring: "UNDP climate innovation mentor. Guided 4 startups through impact certification.",
        created_at: daysAgo(90),
      },
    },
  ];

  // ===== STARTUPS =====
  const startups = [
    {
      id: "startup-payflow",
      data: {
        role: "startup",
        name: "PayFlow",
        email: "team@payflow.my",
        bio: "Building instant cross-border payment rails for SME exporters in ASEAN. Currently processing RM 2M monthly in pilot.",
        industry: "Fintech",
        created_at: daysAgo(60),
        tags: {
          industry: "Fintech",
          stage: "early-traction",
          tech_stack: ["Node.js", "PostgreSQL", "Stripe Connect", "Kubernetes"],
          funding_ask: "RM 2M Seed",
          team_size: 5,
          key_problem: "SME exporters lose 3-5% on cross-border payments due to multiple intermediaries and slow settlement times",
          unique_value_prop: "Direct bank-to-bank rails using existing ASEAN banking corridors, settling in <4 hours vs 3-5 days",
        },
        quality_score: 82,
        quality_breakdown: { problem_clarity: 22, market_size: 20, team_strength: 20, mvp_readiness: 20 },
        quality_summary: "Strong problem-solution fit with clear traction. Market is large and growing with RCEP trade expansion. Team has relevant fintech experience.",
      },
    },
    {
      id: "startup-mediscan",
      data: {
        role: "startup",
        name: "MediScan AI",
        email: "hello@mediscan.ai",
        bio: "AI-powered diagnostic imaging for rural clinics. Our model detects 12 conditions from chest X-rays with 94% accuracy, deployable on edge devices.",
        industry: "HealthTech",
        created_at: daysAgo(45),
        tags: {
          industry: "HealthTech",
          stage: "mvp",
          tech_stack: ["Python", "TensorFlow", "Flutter", "Google Cloud", "Edge TPU"],
          funding_ask: "RM 1.5M Pre-Seed",
          team_size: 4,
          key_problem: "Rural clinics in Malaysia lack specialist radiologists, causing delayed diagnoses and patient transfers that cost lives",
          unique_value_prop: "Edge-deployable AI that works offline, requires no specialist hardware, and integrates with existing PACS systems",
        },
        quality_score: 78,
        quality_breakdown: { problem_clarity: 23, market_size: 18, team_strength: 19, mvp_readiness: 18 },
        quality_summary: "Compelling problem with social impact. Technical approach is differentiated (edge deployment). Needs stronger go-to-market strategy for hospital adoption.",
      },
    },
    {
      id: "startup-carbonledger",
      data: {
        role: "startup",
        name: "CarbonLedger",
        email: "team@carbonledger.co",
        bio: "Automated ESG reporting and carbon credit marketplace for Malaysian manufacturers. Making compliance simple and turning sustainability into revenue.",
        industry: "CleanTech",
        created_at: daysAgo(30),
        tags: {
          industry: "CleanTech",
          stage: "ideation",
          tech_stack: ["React", "Python", "Blockchain", "IoT Sensors"],
          funding_ask: "RM 500K Pre-Seed",
          team_size: 3,
          key_problem: "Malaysian manufacturers face mandatory ESG reporting (Bursa Malaysia 2025) but lack affordable tools to measure and report emissions",
          unique_value_prop: "IoT sensor + AI pipeline that auto-calculates emissions from production data, generating audit-ready ESG reports and tradeable carbon credits",
        },
        quality_score: 71,
        quality_breakdown: { problem_clarity: 20, market_size: 19, team_strength: 14, mvp_readiness: 18 },
        quality_summary: "Timely problem with regulatory tailwind. Market size is strong given Bursa ESG mandate. Team needs more domain expertise in carbon markets.",
      },
    },
  ];

  // ===== ADMIN =====
  const admin = {
    id: "admin-nexus",
    data: {
      role: "admin",
      name: "NEXUS Programme Manager",
      email: "admin@nexus.my",
      bio: "Cradle Fund programme administrator",
      industry: "Innovation Ecosystem",
      created_at: daysAgo(120),
    },
  };

  // Write users
  console.log("👤 Writing user profiles...");
  for (const mentor of mentors) {
    await db.doc(`users/${mentor.id}`).set(mentor.data);
  }
  for (const startup of startups) {
    await db.doc(`users/${startup.id}`).set(startup.data);
  }
  await db.doc(`users/${admin.id}`).set(admin.data);

  // ===== PROGRAMME =====
  console.log("📋 Creating programme...");
  const programmeRef = db.collection("programmes").doc("prog-cradle-2026");
  await programmeRef.set({
    name: "Cradle CIP Cohort 2026",
    description: "Coach & Grow Programme — AI & Deep Tech vertical. 6-month mentor-startup matching programme.",
    status: "active",
    match_threshold: 60,
    created_by: admin.id,
    created_at: daysAgo(60),
  });

  // ===== RELATIONSHIPS =====
  console.log("🔗 Creating relationships...");

  const relationships = [
    {
      id: "rel-sarah-payflow",
      data: {
        mentor_id: "mentor-sarah",
        startup_id: "startup-payflow",
        programme_id: "prog-cradle-2026",
        created_at: daysAgo(45),
        last_active_at: daysAgo(2),
        health_score: 87,
        health_trend: "improving",
        health_narration: "This relationship is thriving. 3 milestones completed ahead of schedule with consistent weekly engagement. Sarah's regulatory expertise is directly accelerating PayFlow's compliance certification. Recommend maintaining current cadence and planning Series A readiness discussions.",
        last_health_update: daysAgo(2),
        platform_messages_sent: 24,
        milestones_total: 4,
        milestones_completed: 3,
        edge_weight: 92,
        match_narrative: "Matched because Sarah has 12 years building payment infrastructure across SEA and deep regulatory expertise — directly relevant to PayFlow's cross-border payment rails and BNM compliance needs. Her experience scaling GrabPay's merchant onboarding mirrors PayFlow's SME growth challenge.",
        outcome_status: "active",
      },
    },
    {
      id: "rel-raj-mediscan",
      data: {
        mentor_id: "mentor-raj",
        startup_id: "startup-mediscan",
        programme_id: "prog-cradle-2026",
        created_at: daysAgo(40),
        last_active_at: daysAgo(18),
        health_score: 32,
        health_trend: "decaying",
        health_narration: "This relationship has stalled. No milestone progress in 3 weeks despite a pending MOH pilot application deadline. The initial strong engagement has dropped off — last platform interaction was 18 days ago. Recommend a facilitated check-in to identify blockers before the relationship deteriorates further.",
        last_health_update: daysAgo(1),
        platform_messages_sent: 8,
        milestones_total: 4,
        milestones_completed: 1,
        edge_weight: 85,
        match_narrative: "Matched because Raj's experience founding MedikAI and navigating health data regulations maps directly to MediScan's need for MOH approval pathways. His fundraising expertise (led to acquisition) can guide their pre-seed strategy.",
        outcome_status: "active",
      },
    },
    {
      id: "rel-priya-carbon",
      data: {
        mentor_id: "mentor-priya",
        startup_id: "startup-carbonledger",
        programme_id: "prog-cradle-2026",
        created_at: daysAgo(25),
        last_active_at: daysAgo(5),
        health_score: 58,
        health_trend: "stable",
        health_narration: "Relationship is progressing steadily. First milestone completed on time. Priya's carbon market expertise is filling CarbonLedger's domain knowledge gap identified in the quality assessment. Communication cadence is adequate but could benefit from more frequent touchpoints as the Bursa deadline approaches.",
        last_health_update: daysAgo(3),
        platform_messages_sent: 12,
        milestones_total: 4,
        milestones_completed: 1,
        edge_weight: 88,
        match_narrative: "Matched because Priya co-founded a carbon marketplace and has direct expertise in the ESG compliance space CarbonLedger is entering. Her UNDP impact certification experience is exactly what CarbonLedger needs to validate their carbon credit methodology.",
        outcome_status: "active",
      },
    },
    {
      id: "rel-david-payflow",
      data: {
        mentor_id: "mentor-david",
        startup_id: "startup-payflow",
        programme_id: "prog-cradle-2026",
        created_at: daysAgo(45),
        last_active_at: daysAgo(7),
        health_score: 72,
        health_trend: "improving",
        health_narration: "Strong secondary mentorship. David's investor lens is helping PayFlow prepare for Series A. Two milestones completed focused on financial modeling and investor deck. Engagement is consistent with bi-weekly sessions.",
        last_health_update: daysAgo(5),
        platform_messages_sent: 15,
        milestones_total: 4,
        milestones_completed: 2,
        edge_weight: 78,
        match_narrative: "Matched as secondary mentor for investment readiness. David's angel investing experience and Sequoia scout background provides PayFlow with direct fundraising guidance and potential warm introductions to Series A investors.",
        outcome_status: "active",
      },
    },
    {
      id: "rel-aminah-mediscan",
      data: {
        mentor_id: "mentor-aminah",
        startup_id: "startup-mediscan",
        programme_id: "prog-cradle-2026",
        created_at: daysAgo(40),
        last_active_at: daysAgo(10),
        health_score: 45,
        health_trend: "stable",
        health_narration: "Moderate engagement. Aminah's go-to-market expertise is relevant but the healthtech domain is outside her core experience. One milestone on GTM strategy completed. May benefit from refocusing sessions on distribution strategy rather than product.",
        last_health_update: daysAgo(8),
        platform_messages_sent: 6,
        milestones_total: 4,
        milestones_completed: 1,
        edge_weight: 65,
        match_narrative: "Matched for go-to-market expertise. While not healthcare-specific, Aminah's marketplace and consumer behaviour knowledge can help MediScan design their hospital adoption strategy and build the supply-side of their diagnostic network.",
        outcome_status: "active",
      },
    },
  ];

  for (const rel of relationships) {
    await db.doc(`relationships/${rel.id}`).set(rel.data);
  }

  // ===== MILESTONES =====
  console.log("🎯 Creating milestones...");

  const milestones = [
    // Sarah-PayFlow (3 completed, 1 pending)
    { relationship_id: "rel-sarah-payflow", blueprint_type: "Tech", title: "API architecture review & optimization plan", status: "completed", due_at: daysAgo(30), completed_at: daysAgo(32) },
    { relationship_id: "rel-sarah-payflow", blueprint_type: "Business", title: "BNM regulatory submission preparation", status: "completed", due_at: daysAgo(20), completed_at: daysAgo(22) },
    { relationship_id: "rel-sarah-payflow", blueprint_type: "Certification", title: "PCI DSS compliance audit initiation", status: "completed", due_at: daysAgo(10), completed_at: daysAgo(8) },
    { relationship_id: "rel-sarah-payflow", blueprint_type: "Business", title: "Series A pitch deck and financial model", status: "pending", due_at: daysAgo(-14), completed_at: null },

    // Raj-MediScan (1 completed, 3 pending — stalled)
    { relationship_id: "rel-raj-mediscan", blueprint_type: "Tech", title: "Model validation with Malaysian radiology dataset", status: "completed", due_at: daysAgo(25), completed_at: daysAgo(23) },
    { relationship_id: "rel-raj-mediscan", blueprint_type: "Certification", title: "MOH Medical Device Act submission", status: "pending", due_at: daysAgo(-5), completed_at: null },
    { relationship_id: "rel-raj-mediscan", blueprint_type: "Business", title: "Hospital pilot partnership (3 clinics)", status: "pending", due_at: daysAgo(-20), completed_at: null },
    { relationship_id: "rel-raj-mediscan", blueprint_type: "Management", title: "Hire clinical advisory board member", status: "pending", due_at: daysAgo(-30), completed_at: null },

    // Priya-CarbonLedger (1 completed, 3 pending)
    { relationship_id: "rel-priya-carbon", blueprint_type: "Business", title: "Carbon credit methodology validation", status: "completed", due_at: daysAgo(15), completed_at: daysAgo(12) },
    { relationship_id: "rel-priya-carbon", blueprint_type: "Tech", title: "IoT sensor integration pilot (1 factory)", status: "pending", due_at: daysAgo(-10), completed_at: null },
    { relationship_id: "rel-priya-carbon", blueprint_type: "Certification", title: "Verra/Gold Standard credit certification", status: "pending", due_at: daysAgo(-45), completed_at: null },
    { relationship_id: "rel-priya-carbon", blueprint_type: "Business", title: "First 5 manufacturer customers onboarded", status: "pending", due_at: daysAgo(-60), completed_at: null },

    // David-PayFlow (2 completed, 2 pending)
    { relationship_id: "rel-david-payflow", blueprint_type: "Business", title: "Financial model with 3-year projections", status: "completed", due_at: daysAgo(20), completed_at: daysAgo(18) },
    { relationship_id: "rel-david-payflow", blueprint_type: "Business", title: "Investor deck reviewed and refined", status: "completed", due_at: daysAgo(10), completed_at: daysAgo(9) },
    { relationship_id: "rel-david-payflow", blueprint_type: "Management", title: "Board advisory structure proposal", status: "pending", due_at: daysAgo(-15), completed_at: null },
    { relationship_id: "rel-david-payflow", blueprint_type: "Business", title: "Warm introductions to 3 Series A investors", status: "pending", due_at: daysAgo(-30), completed_at: null },

    // Aminah-MediScan (1 completed, 3 pending)
    { relationship_id: "rel-aminah-mediscan", blueprint_type: "Business", title: "Go-to-market strategy document", status: "completed", due_at: daysAgo(20), completed_at: daysAgo(19) },
    { relationship_id: "rel-aminah-mediscan", blueprint_type: "Business", title: "Hospital sales playbook", status: "pending", due_at: daysAgo(-10), completed_at: null },
    { relationship_id: "rel-aminah-mediscan", blueprint_type: "Management", title: "Sales hire job description & pipeline", status: "pending", due_at: daysAgo(-25), completed_at: null },
    { relationship_id: "rel-aminah-mediscan", blueprint_type: "Business", title: "Pricing model for public vs private hospitals", status: "pending", due_at: daysAgo(-40), completed_at: null },
  ];

  for (const milestone of milestones) {
    await db.collection("milestones").add({
      ...milestone,
      description: "",
      due_at: milestone.due_at,
      completed_at: milestone.completed_at,
    });
  }

  // ===== SIGNALS (sample event log) =====
  console.log("📡 Creating signal history...");

  const signals = [
    { relationship_id: "rel-sarah-payflow", signal_type: "milestone_complete", actor_id: "startup-payflow", timestamp: daysAgo(32) },
    { relationship_id: "rel-sarah-payflow", signal_type: "milestone_complete", actor_id: "startup-payflow", timestamp: daysAgo(22) },
    { relationship_id: "rel-sarah-payflow", signal_type: "milestone_complete", actor_id: "mentor-sarah", timestamp: daysAgo(8) },
    { relationship_id: "rel-raj-mediscan", signal_type: "milestone_complete", actor_id: "startup-mediscan", timestamp: daysAgo(23) },
    { relationship_id: "rel-priya-carbon", signal_type: "milestone_complete", actor_id: "startup-carbonledger", timestamp: daysAgo(12) },
    { relationship_id: "rel-david-payflow", signal_type: "milestone_complete", actor_id: "startup-payflow", timestamp: daysAgo(18) },
    { relationship_id: "rel-david-payflow", signal_type: "milestone_complete", actor_id: "startup-payflow", timestamp: daysAgo(9) },
    { relationship_id: "rel-aminah-mediscan", signal_type: "milestone_complete", actor_id: "startup-mediscan", timestamp: daysAgo(19) },
  ];

  for (const signal of signals) {
    await db.collection("signals").add({ ...signal, metadata: {} });
  }

  console.log("\n✅ Seed data complete!");
  console.log("   • 5 mentors");
  console.log("   • 3 startups");
  console.log("   • 1 admin");
  console.log("   • 1 programme (Cradle CIP Cohort 2026)");
  console.log("   • 5 relationships (health: 87, 72, 58, 45, 32)");
  console.log("   • 20 milestones");
  console.log("   • 8 signals");
  console.log("\n🎬 Ready for demo recording!");
}

seed().catch(console.error);
