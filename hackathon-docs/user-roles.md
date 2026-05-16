# NEXUS — User Roles

Three roles, each with dedicated surfaces and goals.

---

## 1. Startup

**Primary surfaces:** `/dashboard`, `/profile`, `/matches`, `/qr`

**Goals:**
- Upload pitch deck (PDF)
- Get AI-scored on 4 dimensions: problem clarity, market size, team strength, MVP readiness
- Get matched with a relevant mentor
- Complete programme milestones

**Key interactions:**
- Upload deck on `/profile` -> triggers Gemini extraction of structured tags + quality score
- View matches on `/matches` with AI-generated compatibility narratives
- Track relationship health and complete milestones on `/matches/[id]`
- Generate QR badge on `/qr` for networking

**Data fields:** `pitch_deck_url`, `tags` (StartupTags), `quality_score`, `quality_breakdown`, `quality_summary`

---

## 2. Mentor

**Primary surfaces:** `/dashboard`, `/profile`, `/matches`, `/qr`

**Goals:**
- Be matched with startups where real expertise overlap exists
- Log mentoring activity and track relationship progress
- Monitor milestone completion across matched startups

**Key interactions:**
- Complete profile with expertise areas, years of experience, past mentoring history
- View matched startups on `/matches` with AI-generated match justification
- Track and complete milestones on `/matches/[id]`
- Generate QR badge on `/qr`

**Data fields:** `expertise_areas`, `years_experience`, `past_mentoring`

---

## 3. Programme Manager (Admin)

**Primary surfaces:** `/admin/dashboard`, `/admin/programme`

**Goals:**
- Create and manage innovation programmes
- Trigger AI matching between startups and mentors
- Monitor cohort health in real time via a live graph

**Key interactions:**
- Create programmes with match quality thresholds on `/admin/programme`
- Click "Generate Matches" to invoke Gemini 2.5 Pro for mentor-startup pairing
- View Cytoscape ecosystem graph on `/admin/dashboard` showing all relationships
- See at-risk relationships flagged automatically (decaying health scores)
- Review qualified startups (those above the programme's `match_threshold`)

**Data fields:** `programmes` collection (name, description, status, match_threshold, created_by)

---

## Role Access Summary

| Route | Startup | Mentor | Admin | Public |
|---|---|---|---|---|
| `/` | redirect | redirect | redirect | landing |
| `/auth/role-select` | one-time | one-time | one-time | — |
| `/dashboard` | ✅ | ✅ | redirect | — |
| `/matches` | ✅ | ✅ | — | — |
| `/matches/[id]` | ✅ | ✅ | — | — |
| `/profile` | ✅ | ✅ | — | — |
| `/qr` | ✅ | ✅ | — | — |
| `/view/[uid]` | — | — | — | ✅ |
| `/admin/dashboard` | — | — | ✅ | — |
| `/admin/programme` | — | — | ✅ | — |
