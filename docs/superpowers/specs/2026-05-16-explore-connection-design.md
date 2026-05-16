# Explore & Connection Requests Design

## Overview

Transform the Matches page into an Explore page for discovering mentors/startups. Add a connection request system for users to connect with each other.

## New Collection: `connection_requests/{requestId}`

```typescript
interface ConnectionRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: "pending" | "approved" | "rejected";
  created_at: Timestamp;
}
```

## Explore Page (`/matches`)

### Recommended Section
- Shows 5 users of opposite role (startup sees mentors, mentor sees startups)
- Matching logic: Filter by same industry first, then fill remaining slots
- Display: Name, Industry, Quality Score (startups), Expertise Areas (mentors)

### Search Section
- Real-time search by name
- Searches all users with complete profiles
- Replaces recommended section when typing

### Card Actions
- Click card → Navigate to `/view/[uid]`
- "Connect" button → Sends connection request

### Requests Link
- Button/link to navigate to `/requests`

## Requests Page (`/requests`)

### Incoming Requests
- Lists pending requests where current user is receiver
- Shows sender name, industry, role

### Card Actions
- Click card → Navigate to `/view/[uid]`
- "Approve" button → Updates request status, enables chat
- "Reject" button → Updates request status

## Profile View (`/view/[uid]`)

### Existing Features
- Shows user profile (name, bio, industry, etc.)

### New Features
- Context-aware action buttons:
  - "Connect" button (when coming from Explore)
  - "Approve"/"Reject" buttons (when coming from Requests)
- Back button to return to previous page

## Data Flow

1. User visits Explore → Sees 5 recommendations based on industry
2. User searches → Real-time results replace recommendations
3. User clicks "Connect" → Creates `connection_requests` document with status "pending"
4. Receiver visits Requests → Sees pending requests
5. Receiver approves → Updates status to "approved"
6. Both users can now start chatting

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/lib/types.ts` | Add `ConnectionRequest` interface |
| `src/app/matches/page.tsx` | Rewrite as Explore page |
| `src/app/requests/page.tsx` | Create Requests page |
| `src/app/view/[uid]/page.tsx` | Add action buttons |
| `firestore.rules` | Add `connection_requests` rules |
