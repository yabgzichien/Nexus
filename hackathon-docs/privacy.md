# NEXUS — Privacy

How NEXUS handles data privacy — grounded in the actual system architecture.

---

## Data Access Model

| Data | Who Can Access | How |
|---|---|---|
| Own profile | The user | Firebase Auth — client reads own `users/{uid}` doc |
| Pitch deck PDF | The user + Admin SDK | Firebase Storage — per-user path; Admin SDK for AI processing |
| AI-extracted tags | The user + programme manager (admin) | Written to `users/{uid}`; admins can read for programme matching |
| Match narratives | Both matched parties + admin | Stored in `relationships/{id}` |
| Health narration | Both matched parties + admin | Stored in `relationships/{id}` |
| Profile embeddings | The user + system | Stored in `users/{uid}.embedding`; used only for similarity scoring |

---

## Pitch Deck Processing

The pitch deck never persists in the AI pipeline.

- User uploads PDF -> converted to base64 in the browser
- Base64 sent directly to `/api/extract-deck` in the request body
- Gemini processes the PDF in-memory and returns structured tags + quality scores
- Only the extracted data (tags, scores, summary) is written to Firestore
- The raw deck content is not stored in any AI-related collection

**What Gemini sees:** The PDF bytes for one API call.
**What Gemini stores:** Nothing. The structured output is the only thing that persists.

---

## What's Stored vs What's Processed

| Data | Stored in Firestore? | Sent to Gemini? | Persisted by AI? |
|---|---|---|---|
| Pitch deck PDF | Firebase Storage (user's file) | Yes (for extraction) | No — only tags/scores returned |
| Startup tags | Yes (`users/{uid}`) | Yes (for matching) | N/A — this IS the AI output |
| Mentor profile | Yes (`users/{uid}`) | Yes (for matching) | N/A — original data |
| Match narrative | Yes (`relationships/{id}`) | No | Yes — this IS the AI output |
| Health narration | Yes (`relationships/{id}`) | No | Yes — this IS the AI output |
| Profile embedding | Yes (`users/{uid}`) | Input to embedding | Yes — this IS the AI output |

---

## Demographic Data

The matching system does not collect or use demographic data.

| Field in `UserProfile` | Used for Matching? |
|---|---|
| `name` | Display only |
| `email` | Auth only |
| `industry` | Yes |
| `description` | No |
| `tags.industry` | Yes |
| `tags.stage` | Yes |
| `tags.tech_stack` | Yes |
| `tags.key_problem` | Yes |
| `tags.unique_value_prop` | Yes |
| `expertise_areas` | Yes |
| `years_experience` | Yes |
| Gender, ethnicity, age | **Not a field — does not exist** |
| University, country of origin | **Not a field — does not exist** |

The model cannot match on criteria it doesn't receive.

---

## Public Profiles

`/view/[uid]` is intentionally public (QR landing page). Only fields the user chose to populate are visible. No AI scores, health data, match details, or embeddings are exposed on public profiles.

---

## Known Limitations

| Limitation | Impact | Mitigation Before Production |
|---|---|---|
| API routes are unauthenticated | Anyone can trigger AI processing | Gate with Firebase ID tokens |
| No rate limiting | A single user can rack up Gemini costs | Add per-user rate limits |
| Pitch deck `getDownloadURL` yields a tokenised public URL | Anyone with the link can read the PDF | Use signed URLs with expiry |
| No Firestore security rules in repo | Rules presumed deployed out-of-band | Version-control security rules |
| Embeddings stored in plain Firestore doc | Vector data readable by anyone with Firestore access | Restrict with security rules; embeddings contain no PII |
