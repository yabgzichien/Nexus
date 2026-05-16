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
    {
      id: "mentor-kevin",
      data: {
        role: "mentor",
        name: "Kevin Wong",
        email: "kevin.w@example.com",
        bio: "EdTech entrepreneur. Founded LearnLab (Series B). Expert in education technology, gamification, and user engagement strategies.",
        industry: "EdTech",
        expertise_areas: ["EdTech", "Gamification", "User Engagement", "Product Strategy"],
        years_experience: 9,
        past_mentoring: "Mentored 6 edtech startups. 2 successfully raised Series A.",
        created_at: daysAgo(85),
      },
    },
    {
      id: "mentor-mei",
      data: {
        role: "mentor",
        name: "Mei Lin Tan",
        email: "meilin.t@example.com",
        bio: "Supply chain expert. Former VP at DHL Malaysia. Specializes in logistics optimization, warehouse automation, and last-mile delivery solutions.",
        industry: "Logistics",
        expertise_areas: ["Supply Chain", "Logistics Optimization", "Warehouse Automation", "Last-Mile Delivery"],
        years_experience: 14,
        past_mentoring: "Advisor to 4 logistics startups. Helped 1 secure enterprise contracts.",
        created_at: daysAgo(80),
      },
    },
    {
      id: "mentor-ahmad",
      data: {
        role: "mentor",
        name: "Ahmad Ibrahim",
        email: "ahmad.i@example.com",
        bio: "FoodTech innovator. Co-founded FoodChain (acquired 2023). Expert in food delivery platforms, restaurant tech, and supply chain management.",
        industry: "FoodTech",
        expertise_areas: ["FoodTech", "Restaurant Tech", "Delivery Platforms", "Supply Chain"],
        years_experience: 11,
        past_mentoring: "Mentored 5 foodtech startups across SEA.",
        created_at: daysAgo(75),
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
    {
      id: "startup-edulearn",
      data: {
        role: "startup",
        name: "EduLearn",
        email: "team@edulearn.my",
        bio: "Personalized learning platform using AI to adapt content difficulty based on student performance. Used by 50+ schools in Klang Valley.",
        industry: "EdTech",
        created_at: daysAgo(50),
        tags: {
          industry: "EdTech",
          stage: "early-traction",
          tech_stack: ["React", "Python", "TensorFlow", "AWS"],
          funding_ask: "RM 1M Seed",
          team_size: 4,
          key_problem: "One-size-fits-all education fails students with different learning speeds, causing disengagement and poor outcomes",
          unique_value_prop: "AI-powered adaptive learning that personalizes content difficulty in real-time, improving student engagement by 40%",
        },
        quality_score: 75,
        quality_breakdown: { problem_clarity: 21, market_size: 18, team_strength: 17, mvp_readiness: 19 },
        quality_summary: "Strong traction with 50+ schools. EdTech market growing rapidly. Team has solid technical background.",
      },
    },
    {
      id: "startup-logishub",
      data: {
        role: "startup",
        name: "LogisHub",
        email: "hello@logishub.com",
        bio: "AI-powered logistics optimization platform for SMEs. Reduces delivery costs by 30% through smart route planning and warehouse allocation.",
        industry: "Logistics",
        created_at: daysAgo(40),
        tags: {
          industry: "Logistics",
          stage: "mvp",
          tech_stack: ["Python", "React", "Google Maps API", "PostgreSQL"],
          funding_ask: "RM 800K Pre-Seed",
          team_size: 3,
          key_problem: "SME logistics costs are 40% higher than enterprise due to inefficient routing and manual processes",
          unique_value_prop: "AI route optimization that reduces delivery costs by 30% with zero hardware investment required",
        },
        quality_score: 68,
        quality_breakdown: { problem_clarity: 19, market_size: 17, team_strength: 15, mvp_readiness: 17 },
        quality_summary: "Clear cost-saving value proposition. Logistics market is competitive but SME segment is underserved. Team needs more industry experience.",
      },
    },
    {
      id: "startup-foodchain",
      data: {
        role: "startup",
        name: "FoodChain",
        email: "team@foodchain.my",
        bio: "Farm-to-table marketplace connecting local farmers directly with restaurants. Fresh produce delivered within 24 hours of harvest.",
        industry: "FoodTech",
        created_at: daysAgo(35),
        tags: {
          industry: "FoodTech",
          stage: "ideation",
          tech_stack: ["React Native", "Node.js", "MongoDB"],
          funding_ask: "RM 300K Pre-Seed",
          team_size: 2,
          key_problem: "Local farmers lose 40% of revenue to middlemen while restaurants pay premium prices for fresh produce",
          unique_value_prop: "Direct farm-to-restaurant marketplace with 24-hour delivery, increasing farmer revenue by 60% and reducing restaurant costs by 25%",
        },
        quality_score: 55,
        quality_breakdown: { problem_clarity: 16, market_size: 15, team_strength: 12, mvp_readiness: 12 },
        quality_summary: "Interesting marketplace concept but team is small and MVP is early. Needs more traction and team expansion.",
      },
    },
    {
      id: "startup-healthai",
      data: {
        role: "startup",
        name: "HealthAI Solutions",
        email: "info@healthai.my",
        bio: "AI-powered patient triage system for emergency departments. Reduces wait times by 45% and improves diagnosis accuracy.",
        industry: "HealthTech",
        created_at: daysAgo(25),
        tags: {
          industry: "HealthTech",
          stage: "early-traction",
          tech_stack: ["Python", "TensorFlow", "React", "HL7 FHIR"],
          funding_ask: "RM 2.5M Seed",
          team_size: 6,
          key_problem: "Emergency departments face 4-hour average wait times due to manual triage processes and staff shortages",
          unique_value_prop: "AI triage that reduces wait times by 45% while improving diagnosis accuracy by 30%, deployed in 3 hospitals",
        },
        quality_score: 85,
        quality_breakdown: { problem_clarity: 24, market_size: 20, team_strength: 22, mvp_readiness: 19 },
        quality_summary: "Strong traction with 3 hospitals. Healthcare AI market is booming. Team has deep medical and technical expertise.",
      },
    },
    {
      id: "startup-greenenergy",
      data: {
        role: "startup",
        name: "GreenEnergy MY",
        email: "team@greenenergy.my",
        bio: "Solar panel installation and management platform for residential properties. AI-powered energy optimization reduces bills by 50%.",
        industry: "CleanTech",
        created_at: daysAgo(20),
        tags: {
          industry: "CleanTech",
          stage: "mvp",
          tech_stack: ["React", "Python", "IoT", "AWS"],
          funding_ask: "RM 1.2M Pre-Seed",
          team_size: 4,
          key_problem: "Homeowners want solar panels but face complex installation processes and unclear ROI calculations",
          unique_value_prop: "End-to-end solar installation platform with AI energy optimization, guaranteed 50% reduction in electricity bills",
        },
        quality_score: 62,
        quality_breakdown: { problem_clarity: 18, market_size: 16, team_strength: 14, mvp_readiness: 14 },
        quality_summary: "Growing market with government incentives. Team has technical skills but lacks business development experience.",
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

  // ===== PROGRAMMES =====
  console.log("📋 Creating programmes...");

  // Programme 1: Main programme (existing)
  const programmeRef = db.collection("programmes").doc("prog-cradle-2026");
  await programmeRef.set({
    name: "Cradle CIP Cohort 2026",
    description: "Coach & Grow Programme — AI & Deep Tech vertical. 6-month mentor-startup matching programme.",
    status: "active",
    match_threshold: 60,
    created_by: admin.id,
    created_at: daysAgo(60),
    start_date: daysAgo(-30),
    end_date: daysAgo(-180),
    venue: "Cradle Fund HQ, KL Sentral",
    registration_deadline: daysAgo(-14),
    capacity: 10,
    prerequisites: "Must have MVP or working prototype. Quality score >= 60.",
    contact_email: "programmes@cradle.my",
  });

  // Programme 2: New programme (registration open)
  const programme2Ref = db.collection("programmes").doc("prog-fintech-accelerator");
  await programme2Ref.set({
    name: "FinTech Accelerator 2026",
    description: "Intensive 3-month accelerator for fintech startups. Focus on regulatory compliance, payment infrastructure, and Series A readiness.",
    status: "active",
    match_threshold: 70,
    created_by: admin.id,
    created_at: daysAgo(15),
    start_date: daysAgo(-60),
    end_date: daysAgo(-150),
    venue: "Bank Negara Malaysia, Sasana Kijang",
    registration_deadline: daysAgo(-30),
    capacity: 5,
    prerequisites: "Fintech startups only. Must have working prototype. Quality score >= 70.",
    contact_email: "fintech@accelerator.my",
  });

  // Programme 3: Low threshold programme (most startups eligible)
  const programme3Ref = db.collection("programmes").doc("prog-startup-bootcamp");
  await programme3Ref.set({
    name: "Startup Bootcamp",
    description: "2-week intensive bootcamp for early-stage startups. Learn from industry experts, build your pitch, and connect with mentors.",
    status: "active",
    match_threshold: 40,
    created_by: admin.id,
    created_at: daysAgo(5),
    start_date: daysAgo(-90),
    end_date: daysAgo(-104),
    venue: "MaGIC Cyberjaya",
    registration_deadline: daysAgo(-7),
    capacity: 20,
    prerequisites: "Open to all early-stage startups. No minimum quality score.",
    contact_email: "bootcamp@magic.my",
  });

  // Programme 4: High threshold programme (only top startups)
  const programme4Ref = db.collection("programmes").doc("prog-series-a-readiness");
  await programme4Ref.set({
    name: "Series A Readiness Programme",
    description: "Exclusive programme for high-growth startups preparing for Series A. Access to investors, financial modeling workshops, and investor pitch practice.",
    status: "active",
    match_threshold: 80,
    created_by: admin.id,
    created_at: daysAgo(10),
    start_date: daysAgo(-45),
    end_date: daysAgo(-135),
    venue: "KL Convention Centre",
    registration_deadline: daysAgo(-21),
    capacity: 3,
    prerequisites: "Quality score >= 80. Must have traction metrics.",
    contact_email: "seriesa@investors.my",
  });

  // ===== PROGRAMME REGISTRATIONS =====
  console.log("📝 Creating programme registrations...");

  const registrations = [
    // ===== CRADLE CIP (threshold: 60) =====
    // Only some startups registered and approved
    { programme_id: "prog-cradle-2026", user_id: "startup-payflow", role: "startup", status: "approved" },
    { programme_id: "prog-cradle-2026", user_id: "startup-mediscan", role: "startup", status: "approved" },
    { programme_id: "prog-cradle-2026", user_id: "startup-carbonledger", role: "startup", status: "approved" },
    { programme_id: "prog-cradle-2026", user_id: "startup-edulearn", role: "startup", status: "approved" },
    { programme_id: "prog-cradle-2026", user_id: "startup-logishub", role: "startup", status: "pending" },
    // FoodChain not registered (score 55 < 60, would be ineligible)
    // GreenEnergy not registered
    // HealthAI not registered (but would qualify with score 85)
    
    // Only some mentors registered
    { programme_id: "prog-cradle-2026", user_id: "mentor-sarah", role: "mentor", status: "approved" },
    { programme_id: "prog-cradle-2026", user_id: "mentor-raj", role: "mentor", status: "approved" },
    { programme_id: "prog-cradle-2026", user_id: "mentor-priya", role: "mentor", status: "approved" },
    { programme_id: "prog-cradle-2026", user_id: "mentor-david", role: "mentor", status: "approved" },
    { programme_id: "prog-cradle-2026", user_id: "mentor-aminah", role: "mentor", status: "approved" },
    // Kevin, Mei Lin, Ahmad not registered for Cradle CIP

    // ===== FINTECH ACCELERATOR (threshold: 70) =====
    // Only fintech-focused startups
    { programme_id: "prog-fintech-accelerator", user_id: "startup-payflow", role: "startup", status: "approved" },
    { programme_id: "prog-fintech-accelerator", user_id: "startup-mediscan", role: "startup", status: "pending" },
    // Other startups not registered (not fintech focused)
    
    // Only fintech mentors
    { programme_id: "prog-fintech-accelerator", user_id: "mentor-sarah", role: "mentor", status: "approved" },
    { programme_id: "prog-fintech-accelerator", user_id: "mentor-david", role: "mentor", status: "approved" },
    // Other mentors not registered

    // ===== STARTUP BOOTCAMP (threshold: 40) =====
    // Most startups registered (low threshold)
    { programme_id: "prog-startup-bootcamp", user_id: "startup-payflow", role: "startup", status: "approved" },
    { programme_id: "prog-startup-bootcamp", user_id: "startup-mediscan", role: "startup", status: "approved" },
    { programme_id: "prog-startup-bootcamp", user_id: "startup-carbonledger", role: "startup", status: "approved" },
    { programme_id: "prog-startup-bootcamp", user_id: "startup-edulearn", role: "startup", status: "approved" },
    { programme_id: "prog-startup-bootcamp", user_id: "startup-logishub", role: "startup", status: "approved" },
    { programme_id: "prog-startup-bootcamp", user_id: "startup-foodchain", role: "startup", status: "approved" },
    { programme_id: "prog-startup-bootcamp", user_id: "startup-greenenergy", role: "startup", status: "pending" },
    // HealthAI not registered
    
    // Some mentors
    { programme_id: "prog-startup-bootcamp", user_id: "mentor-aminah", role: "mentor", status: "approved" },
    { programme_id: "prog-startup-bootcamp", user_id: "mentor-kevin", role: "mentor", status: "approved" },
    { programme_id: "prog-startup-bootcamp", user_id: "mentor-priya", role: "mentor", status: "pending" },

    // ===== SERIES A READINESS (threshold: 80) =====
    // Only top startups
    { programme_id: "prog-series-a-readiness", user_id: "startup-payflow", role: "startup", status: "approved" },
    { programme_id: "prog-series-a-readiness", user_id: "startup-healthai", role: "startup", status: "approved" },
    // Other startups not eligible (score < 80) or not registered
    
    // Only experienced mentors
    { programme_id: "prog-series-a-readiness", user_id: "mentor-david", role: "mentor", status: "approved" },
    { programme_id: "prog-series-a-readiness", user_id: "mentor-sarah", role: "mentor", status: "approved" },
  ];

  for (const reg of registrations) {
    await db.collection("programme_registrations").add({
      ...reg,
      created_at: daysAgo(Math.floor(Math.random() * 30)),
    });
  }

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

  // Clear existing milestones
  const existingMilestones = await db.collection("milestones").get();
  const milestoneBatch = db.batch();
  existingMilestones.docs.forEach((doc) => milestoneBatch.delete(doc.ref));
  await milestoneBatch.commit();
  console.log(`   Cleared ${existingMilestones.docs.length} existing milestones`);

  const milestones = [
    // Sarah-PayFlow — Tech (3 completed, 1 pending)
    { relationship_id: "rel-sarah-payflow", blueprint_type: "Tech", title: "API architecture review & optimization plan", status: "completed", due_at: daysAgo(30), completed_at: daysAgo(32) },
    { relationship_id: "rel-sarah-payflow", blueprint_type: "Tech", title: "Payment routing layer refactor", status: "completed", due_at: daysAgo(20), completed_at: daysAgo(22) },
    { relationship_id: "rel-sarah-payflow", blueprint_type: "Tech", title: "Settlement retry logic implementation", status: "completed", due_at: daysAgo(10), completed_at: daysAgo(8) },
    { relationship_id: "rel-sarah-payflow", blueprint_type: "Tech", title: "PCI DSS technical audit preparation", status: "pending", due_at: daysAgo(-14), completed_at: null },

    // Raj-MediScan — Certification (1 completed, 3 pending — stalled)
    { relationship_id: "rel-raj-mediscan", blueprint_type: "Certification", title: "Model validation with Malaysian radiology dataset", status: "completed", due_at: daysAgo(25), completed_at: daysAgo(23) },
    { relationship_id: "rel-raj-mediscan", blueprint_type: "Certification", title: "MOH Medical Device Act submission", status: "pending", due_at: daysAgo(-5), completed_at: null },
    { relationship_id: "rel-raj-mediscan", blueprint_type: "Certification", title: "Clinical evidence documentation", status: "pending", due_at: daysAgo(-20), completed_at: null },
    { relationship_id: "rel-raj-mediscan", blueprint_type: "Certification", title: "Medical device classification approval", status: "pending", due_at: daysAgo(-30), completed_at: null },

    // Priya-CarbonLedger — Certification (1 completed, 3 pending)
    { relationship_id: "rel-priya-carbon", blueprint_type: "Certification", title: "Carbon credit methodology validation", status: "completed", due_at: daysAgo(15), completed_at: daysAgo(12) },
    { relationship_id: "rel-priya-carbon", blueprint_type: "Certification", title: "Verra/Gold Standard credit certification", status: "pending", due_at: daysAgo(-10), completed_at: null },
    { relationship_id: "rel-priya-carbon", blueprint_type: "Certification", title: "Bursa Malaysia ESG compliance audit", status: "pending", due_at: daysAgo(-45), completed_at: null },
    { relationship_id: "rel-priya-carbon", blueprint_type: "Certification", title: "Third-party emissions verification", status: "pending", due_at: daysAgo(-60), completed_at: null },

    // David-PayFlow — Business (2 completed, 2 pending)
    { relationship_id: "rel-david-payflow", blueprint_type: "Business", title: "Financial model with 3-year projections", status: "completed", due_at: daysAgo(20), completed_at: daysAgo(18) },
    { relationship_id: "rel-david-payflow", blueprint_type: "Business", title: "Investor deck reviewed and refined", status: "completed", due_at: daysAgo(10), completed_at: daysAgo(9) },
    { relationship_id: "rel-david-payflow", blueprint_type: "Business", title: "Series A pitch preparation", status: "pending", due_at: daysAgo(-15), completed_at: null },
    { relationship_id: "rel-david-payflow", blueprint_type: "Business", title: "Warm introductions to 3 Series A investors", status: "pending", due_at: daysAgo(-30), completed_at: null },

    // Aminah-MediScan — Business (1 completed, 3 pending)
    { relationship_id: "rel-aminah-mediscan", blueprint_type: "Business", title: "Go-to-market strategy document", status: "completed", due_at: daysAgo(20), completed_at: daysAgo(19) },
    { relationship_id: "rel-aminah-mediscan", blueprint_type: "Business", title: "Hospital sales playbook", status: "pending", due_at: daysAgo(-10), completed_at: null },
    { relationship_id: "rel-aminah-mediscan", blueprint_type: "Business", title: "Pricing model for public vs private hospitals", status: "pending", due_at: daysAgo(-25), completed_at: null },
    { relationship_id: "rel-aminah-mediscan", blueprint_type: "Business", title: "Distribution partnership strategy", status: "pending", due_at: daysAgo(-40), completed_at: null },
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

  // Clear existing signals
  const existingSignals = await db.collection("signals").get();
  const signalBatch = db.batch();
  existingSignals.docs.forEach((doc) => signalBatch.delete(doc.ref));
  await signalBatch.commit();
  console.log(`   Cleared ${existingSignals.docs.length} existing signals`);

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

  // ===== MESSAGES (sample chat history) =====
  console.log("💬 Creating message history...");

  // Clear existing messages
  const existingMessages = await db.collection("messages").get();
  const messageBatch = db.batch();
  existingMessages.docs.forEach((doc) => messageBatch.delete(doc.ref));
  await messageBatch.commit();
  console.log(`   Cleared ${existingMessages.docs.length} existing messages`);

  const messages = [
    // Sarah-PayFlow conversation
    { relationship_id: "rel-sarah-payflow", sender_id: "mentor-sarah", text: "Hi PayFlow team! I've reviewed your API architecture doc. The overall design is solid, but I have some suggestions for the payment routing layer.", timestamp: daysAgo(40), read: true },
    { relationship_id: "rel-sarah-payflow", sender_id: "startup-payflow", text: "Thanks Sarah! We'd love to hear your thoughts. The routing layer has been tricky to optimize for cross-border settlements.", timestamp: daysAgo(40), read: true },
    { relationship_id: "rel-sarah-payflow", sender_id: "mentor-sarah", text: "I'll send over a detailed review by EOD. Main concern is the retry logic for failed settlements — GrabPay had similar issues early on.", timestamp: daysAgo(40), read: true },
    { relationship_id: "rel-sarah-payflow", sender_id: "startup-payflow", text: "That would be incredibly helpful. We've been hitting edge cases with ASEAN bank cutoff times.", timestamp: daysAgo(39), read: true },
    { relationship_id: "rel-sarah-payflow", sender_id: "mentor-sarah", text: "Great progress on the BNM submission! I've attached some notes on common regulatory questions they typically ask.", timestamp: daysAgo(20), read: true },
    { relationship_id: "rel-sarah-payflow", sender_id: "startup-payflow", text: "Your notes were spot on. We've addressed all the compliance questions. PCI DSS audit is next!", timestamp: daysAgo(18), read: true },

    // Raj-MediScan conversation (stalled)
    { relationship_id: "rel-raj-mediscan", sender_id: "startup-mediscan", text: "Hi Raj, we just submitted the model validation report to the radiology panel. Fingers crossed!", timestamp: daysAgo(30), read: true },
    { relationship_id: "rel-raj-mediscan", sender_id: "mentor-raj", text: "Excellent! The validation methodology looks rigorous. Let me know how the panel responds — I can help navigate any pushback.", timestamp: daysAgo(30), read: true },
    { relationship_id: "rel-raj-mediscan", sender_id: "startup-mediscan", text: "Will do. We're also starting to prep the MOH Medical Device Act submission. Any tips?", timestamp: daysAgo(28), read: true },
    { relationship_id: "rel-raj-mediscan", sender_id: "mentor-raj", text: "I'll share the MedikAI submission template — it saved us weeks. Let's schedule a call to walk through it.", timestamp: daysAgo(28), read: true },
    { relationship_id: "rel-raj-mediscan", sender_id: "startup-mediscan", text: "That would be amazing. We're a bit stuck on the clinical evidence requirements.", timestamp: daysAgo(25), read: true },

    // Priya-CarbonLedger conversation
    { relationship_id: "rel-priya-carbon", sender_id: "mentor-priya", text: "Welcome to the programme, CarbonLedger! I'm excited to help with your carbon credit methodology.", timestamp: daysAgo(24), read: true },
    { relationship_id: "rel-priya-carbon", sender_id: "startup-carbonledger", text: "Thanks Priya! We're really excited to work with you. Your GreenChain experience is exactly what we need.", timestamp: daysAgo(24), read: true },
    { relationship_id: "rel-priya-carbon", sender_id: "mentor-priya", text: "Let's start with the Verra certification requirements. I've mapped out the key milestones we need to hit before the Bursa deadline.", timestamp: daysAgo(22), read: true },
    { relationship_id: "rel-priya-carbon", sender_id: "startup-carbonledger", text: "Perfect. We've been looking at IoT sensor integration for auto-calculating emissions. Any recommendations for hardware partners?", timestamp: daysAgo(20), read: true },
    { relationship_id: "rel-priya-carbon", sender_id: "mentor-priya", text: "I have contacts at two Malaysian IoT manufacturers. I'll make introductions this week.", timestamp: daysAgo(19), read: true },

    // David-PayFlow conversation
    { relationship_id: "rel-david-payflow", sender_id: "startup-payflow", text: "Hi David, we've updated the financial model with the 3-year projections you suggested. Can you take a look?", timestamp: daysAgo(22), read: true },
    { relationship_id: "rel-david-payflow", sender_id: "mentor-david", text: "Looking at it now. Revenue projections are aggressive but achievable if you hit the SME onboarding targets. Let's discuss the assumptions.", timestamp: daysAgo(22), read: true },
    { relationship_id: "rel-david-payflow", sender_id: "startup-payflow", text: "We're targeting 500 SMEs by end of year. Current pipeline shows strong interest from export associations.", timestamp: daysAgo(21), read: true },
    { relationship_id: "rel-david-payflow", sender_id: "mentor-david", text: "Good. I've refined the investor deck — the narrative is much tighter now. Ready for Series A conversations when you are.", timestamp: daysAgo(10), read: true },

    // Aminah-MediScan conversation
    { relationship_id: "rel-aminah-mediscan", sender_id: "mentor-aminah", text: "Hi MediScan! Let's work on your go-to-market strategy for hospital adoption.", timestamp: daysAgo(35), read: true },
    { relationship_id: "rel-aminah-mediscan", sender_id: "startup-mediscan", text: "Thanks Aminah! We're struggling with the sales cycle length for hospitals. Any advice?", timestamp: daysAgo(35), read: true },
    { relationship_id: "rel-aminah-mediscan", sender_id: "mentor-aminah", text: "Hospital sales are relationship-driven. Let's build a playbook focusing on clinical champions rather than top-down procurement.", timestamp: daysAgo(33), read: true },
    { relationship_id: "rel-aminah-mediscan", sender_id: "startup-mediscan", text: "That makes sense. We've identified 3 potential pilot clinics. Should we start there?", timestamp: daysAgo(30), read: true },
  ];

  for (const message of messages) {
    await db.collection("messages").add({
      ...message,
      read: message.read,
    });
  }

  console.log("\n✅ Seed data complete!");
  console.log("   • 8 mentors");
  console.log("   • 8 startups");
  console.log("   • 1 admin");
  console.log("   • 4 programmes (Cradle CIP, FinTech Accelerator, Startup Bootcamp, Series A Readiness)");
  console.log("   • 35 programme registrations");
  console.log("   • 5 relationships (health: 87, 72, 58, 45, 32)");
  console.log("   • 20 milestones");
  console.log("   • 8 signals");
  console.log("   • 25 messages");
  console.log("\n🎬 Ready for demo recording!");
}

seed().catch(console.error);
