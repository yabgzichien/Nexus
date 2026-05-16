# Chat Feature Design

## Overview

Replace the Dashboard page for startup/mentor roles with a real-time Chat system. Admin retains access to the existing dashboard at `/admin/dashboard`.

## Routing

| Route | Page | Access |
|-------|------|--------|
| `/chat` | Chat list (conversations) | startup, mentor |
| `/chat/[relationshipId]` | Chat detail + milestones | startup, mentor |
| `/admin/dashboard` | Ecosystem dashboard | admin (unchanged) |

NavBar: "Dashboard" link changes to "Chat" for startup/mentor roles.

## Chat List Page (`/chat`)

- Displays all relationships the authenticated user is part of
- Each list item shows:
  - Other person's name (mentor name for startups, startup name for mentors)
  - Last message preview (truncated)
  - Timestamp of last message
- **"+" button** (top right corner): Opens a dropdown/modal listing relationship contacts without existing chats. Clicking a name navigates to `/chat/[relationshipId]`
- Unread indicator (blue dot) for conversations with unread messages

## Chat Detail Page (`/chat/[relationshipId]`)

### Layout
- **Left panel (60%):** Full chat interface
  - Header: `←` back arrow + other person's name
  - Message list (scrollable, auto-scroll to bottom on new message)
  - Sent messages: blue bubbles, right-aligned
  - Received messages: gray bubbles, left-aligned
  - Input bar at bottom with text input + send button
- **Right panel (40%):** Milestones sidebar
  - Header: "Milestones"
  - List of milestones for this relationship
  - Each milestone: title, blueprint type, due date
  - **Toggle button**: "Complete" (green) ↔ "Revert" (yellow)
    - Clicking "Complete" marks milestone as completed, logs signal, updates relationship health
    - Clicking "Revert" reverts to pending, adjusts health score back

### Back Navigation
- Back arrow on top left navigates to `/chat`

## Data Model

### New Collection: `messages/{messageId}`

```typescript
interface Message {
  id: string;
  relationship_id: string;
  sender_id: string;
  text: string;
  timestamp: Timestamp;
  read: boolean;
}
```

### Updated Types (`src/lib/types.ts`)

Add `Message` interface.

## Firestore Security Rules

```
match /messages/{messageId} {
  allow read: if request.auth != null;
  allow write: if request.auth != null;
}
```

## Seed Data

Add sample messages to existing relationships for demo purposes. Each relationship gets 4-6 messages showing a realistic mentor-startup conversation.

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/app/chat/page.tsx` | Create - Chat list page |
| `src/app/chat/[relationshipId]/page.tsx` | Create - Chat detail page |
| `src/app/dashboard/page.tsx` | Modify - Redirect to `/chat` for non-admin |
| `src/components/NavBar.tsx` | Modify - "Dashboard" → "Chat" for startup/mentor |
| `src/lib/types.ts` | Modify - Add `Message` interface |
| `firestore.rules` | Modify - Add `messages` collection rules |
| `scripts/seed-data.ts` | Modify - Add sample messages |
