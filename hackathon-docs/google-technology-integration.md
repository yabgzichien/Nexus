# Google Technology Integration

## Overview

NEXUS uses **four Google technologies** as foundational infrastructure — not as add-ons. Firebase owns all data, auth, and storage. Gemini powers every AI feature (extraction, reasoning, embeddings). Removing any one of them breaks the product.

---

## 1. Firebase Authentication (Google OAuth)

**What it does:** One-click sign-in via Google account. No passwords, no email verification flows.

**Why Firebase Auth:**
- Zero-friction onboarding — mentors and startups sign in with their existing Google account
- Production-grade security out of the box (token rotation, session management)
- Integrates directly with Firestore security rules for per-user data access

**Where it lives:** `src/lib/auth-context.tsx`, `src/lib/firebase.ts`

**How it's integral:** Every page in the app checks auth state before rendering. Firestore rules enforce that users can only read/write their own data using `request.auth.uid`. Without Firebase Auth, there is no access control.

---

## 2. Firebase Firestore

**What it does:** Primary database for all application data — user profiles, relationships, matches, health scores, milestones, messages, graph embeddings.

**Why Firestore:**
- Real-time sync via snapshot listeners — dashboards update live when mentors submit health reports
- Auto-scaling with zero config — no capacity planning or instance sizing
- Offline persistence built-in — works on flaky hackathon WiFi
- Sub-collection model maps naturally to our data (e.g., `relationships/{id}/messages`)

**Where it lives:** Every page and API route. Imported in 13+ files across `src/app/` and `src/lib/`.

**Collections:**
| Collection | Purpose |
|-----------|---------|
| `users` | Mentor and startup profiles + embeddings |
| `relationships` | Mentor-startup pairings with health scores |
| `programmes` | Accelerator/cohort definitions |
| `milestones` | Per-relationship milestone tracking |
| `signals` | Event log (milestone completions) |

**How it's integral:** Firestore is not a cache or secondary store — it is the single source of truth. Gemini API routes write extracted data back to Firestore. Embeddings are stored alongside profile documents. The entire data lifecycle is Firestore-native.

---

## 3. Firebase Storage

**What it does:** Stores pitch deck PDFs uploaded by startups.

**Why Firebase Storage:**
- Same auth model as Firestore — one permission system for both
- Direct upload from the browser via the Firebase SDK
- Generates download URLs for Gemini to process the PDF

**Where it lives:** `src/lib/firebase.ts` (exported `storage` instance)

**How it's integral:** The pitch deck extraction pipeline depends on Firebase Storage: upload PDF -> get download URL -> pass URL to Gemini -> write extracted data to Firestore. Without storage, the deck analysis feature has no input.

---

## 4. Gemini API

**What it does:** Powers four distinct AI features, each using the `@google/genai` SDK.

### 4a. Pitch Deck Extraction (`/api/extract-deck`)
- Reads a startup's uploaded PDF
- Extracts: problem statement, solution, market size, team, traction, funding ask
- Scores quality across 4 dimensions (0-25 each)
- Writes structured data to Firestore

### 4b. Match Generation (`/api/generate-matches`)
- Takes a startup profile and available mentors/programmes
- Scores compatibility based on domain, stage, and experience
- Returns ranked matches with reasoning

### 4c. Health Narration (`/api/health-narration`)
- Takes raw health metrics (milestones, engagement, feedback)
- Generates a narrative summary explaining relationship health
- Writes back to the relationship document

### 4d. Profile Embedding (`/api/embed-profile`)
- Converts mentor and startup profiles into 768-dimensional vectors
- Enables semantic similarity scoring — captures relationships that tag overlap misses
- Outcome-aware: includes engagement stats in the embedding text
- Stores vectors in `users/{uid}.embedding` for O(1) cosine similarity queries

**Why Gemini over alternatives:**
- Same Google ecosystem as Firebase — one `GOOGLE_API_KEY` covers everything
- Gemini 2.5 Flash is fast enough for real-time API calls (sub-second for most prompts)
- Native PDF understanding — no need for a separate OCR or document parsing service
- Structured output with JSON mode — no regex extraction from free-text responses
- Embedding API produces high-quality vectors that capture semantic meaning

**Where it lives:**
- `src/app/api/extract-deck/route.ts`
- `src/app/api/generate-matches/route.ts`
- `src/app/api/health-narration/route.ts`
- `src/app/api/embed-profile/route.ts`
- `src/app/api/graph-score/route.ts` (cosine similarity on embeddings)

**How it's integral:** Gemini is not a chatbot wrapper. Each API route uses it for a specific task — extraction, reasoning, or vectorisation — with tightly scoped prompts. The AI output feeds directly into Firestore documents that the UI reads — it's part of the data pipeline, not a feature on top.

---

## How They Work Together

```
User signs in -> Firebase Auth
     |
     v
Uploads pitch deck -> Firebase Storage
     |
     v
Extract deck data -> Gemini API (Flash) -> writes to Firestore
     |
     v
Generate profile embedding -> Gemini Embedding API -> stores vector in Firestore
     |
     v
Score matches -> Cosine similarity on vectors -> returns ranked matches
     |
     v
Generate match narrative -> Gemini API (Pro) -> writes to Firestore
     |
     v
Complete milestones -> Health narration (Gemini Flash) -> updates relationship
     |
     v
Re-embed with updated stats -> Gemini Embedding API -> future matches improve
     |
     v
UI updates live -> Firestore snapshot listeners
```

Every Google technology sits on the critical path. Firebase Auth gates Firestore access, Firestore feeds Gemini, Gemini writes back to Firestore, and the UI subscribes to Firestore for real-time updates. The embedding pipeline adds semantic matching on top of the existing data flow, and the feedback loop ensures past engagement improves future matching.

---

## Integration Depth (Rubric Alignment)

| Criterion | Evidence |
|-----------|----------|
| **Meaningful use** | 4 Google technologies + Gemini Embedding API, each on the critical path — not decorative |
| **Why chosen** | Firebase for unified auth+data+storage; Gemini for native PDF understanding, fast structured extraction, and semantic embeddings |
| **Enhances solution** | Real-time sync enables live dashboards; Gemini's PDF capability eliminates a separate OCR pipeline; Google OAuth removes onboarding friction; embeddings enable semantic matching beyond tag overlap |
| **Understanding demonstrated** | Correct use of client SDK + Admin SDK; Firestore security rules; Gemini structured output + embedding API; snapshot listeners for reactivity; outcome-aware embedding design |
