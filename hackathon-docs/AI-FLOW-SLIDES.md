# NEXUS AI Flow — 3-Minute Presentation Script

---

## Slide 1: Title
**NEXUS — AI Relationship Operating System**

- "No ratings. Only actions. NEXUS remembers."
- Built for Cradle Fund's CIP mentor-startup matching
- Powered by Gemini AI + Firebase + Next.js

---

## Slide 2: The Problem
**Why matching fails today**

- Programme managers manually pair mentors and startups
- No feedback loop — no one tracks if matches actually work
- Static ratings don't capture real relationship health
- Outcomes are invisible until it's too late

---

## Slide 3: How NEXUS Ingests — Deck Extraction
**Startup uploads a PDF pitch deck**

- Gemini 2.0 Flash reads the PDF (2 parallel calls)
- Call 1: Extracts structured tags — industry, stage, tech stack, funding ask, team size
- Call 2: Scores pitch quality (0-100) across problem clarity, market size, team strength, MVP readiness
- Everything stored in Firestore — no manual form filling

---

## Slide 4: How NEXUS Understands — Graph Embeddings
**Turning profiles into math**

- Startup profile text → Gemini Embedding API → 768-dimension vector
- Mentor profile text → same process
- Cosine similarity between vectors = compatibility score
- Fallback: metadata scorer (exact match + Jaccard similarity + stage-vs-experience fit) for cold start

---

## Slide 5: How NEXUS Matches — AI Ranking
**Startup sees ranked mentors**

- Cosine similarity scores every mentor against the startup
- Top candidates sent to Gemini 2.5 Pro
- Gemini generates a match narrative explaining WHY they're compatible
- Historical learning: past successful/failed matches inform new recommendations

---

## Slide 6: How NEXUS Measures Health — Live Scoring
**Every relationship gets a health score (0-100)**

- Signals tracked: messages sent, milestones completed, time since last activity, sentiment
- Gemini 2.0 Flash reads signals → produces health score, trend (improving/stable/decaying), and narration
- Programme managers see a real-time dashboard — red relationships need intervention

---

## Slide 7: The Feedback Loop — Outcome-Aware Embeddings
**NEXUS gets smarter over time**

- When a milestone completes → trigger re-embedding
- Engagement stats (completed mentorships, avg health score, milestones done) appended to profile text
- New vector reflects real outcomes, not just profile keywords
- Future matches improve as the system learns what works

---

## Slide 8: The Graph — Visual Intelligence
**Admin dashboard shows the relationship network**

- Cytoscape.js renders mentors, startups, and relationships as an interactive graph
- Edge thickness = relationship strength (health score + milestone progress)
- Programme managers spot isolated nodes, weak connections, and cluster patterns
- Click any node to see full relationship details

---

## Slide 9: Summary — 4 AI Calls, 1 Outcome
| Stage | Model | What it does |
|---|---|---|
| Deck Extraction | Gemini 2.0 Flash | PDF → tags + quality score |
| Matching | Gemini 2.5 Pro | Rank + explain compatibility |
| Health Scoring | Gemini 2.0 Flash | Signals → health score + narration |
| Embedding | Gemini Embedding API | Profile text → 768-dim vector |

"Static matching is dead. NEXUS remembers every action and adapts."
