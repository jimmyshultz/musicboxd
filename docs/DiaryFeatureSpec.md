# Musicboxd Diary Feature Specification

## Overview
The Diary feature lets users log album listens over time, similar to Letterboxd’s film diary. Each diary entry captures the date of the listen and an optional rating snapshot for that specific listen. The diary is viewable from a user’s profile via a Profile/Diary segmented toggle, grouped by month with reverse chronological ordering, and supports infinite scroll by month.

## Goals
- Allow users to add listens to a diary with an explicit date and optional per-entry rating snapshot
- Present a reverse-chronological, month-grouped diary list (Month YYYY headers)
- Respect user privacy settings (public, friends/mutual only, private)
- Support editing and deletion of diary entries
- Performant loading via infinite scroll by month

## Non-Goals (MVP)
- Diary notes/comments per entry (future)
- Adding diary entries directly from the diary screen (addions happen from Album Details)
- Bulk imports/backfill flows

---

## Data Model
Introduce a new entity `DiaryEntry` to reflect Letterboxd-like behavior.

Proposed TypeScript interface (for future implementation):

```ts
export interface DiaryEntry {
  id: string;
  userId: string;
  albumId: string;
  diaryDate: string; // date-only in ISO format (e.g., '2025-08-11'), user’s local date
  ratingAtTime?: number; // 1-5; optional
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}
```

Constraints and rules:
- One entry per user+album+diaryDate (enforce uniqueness)
- A DiaryEntry is a subset of listens; creating a DiaryEntry must also ensure the album is marked as listened (but deleting an entry does not unset listened)
- `diaryDate` is separate from any listen timestamp (do not overwrite listen data)
- Ratings on entries are snapshots (do not update the user’s overall album rating)

Storage/Services:
- Add a dedicated `DiaryService` with methods:
  - `getDiaryEntriesByUser(userId, { startMonth, pageSize })` returns entries grouped/paginated by month
  - `createDiaryEntry(userId, albumId, diaryDate, ratingAtTime?)`
  - `updateDiaryEntry(entryId, { diaryDate?, ratingAtTime? })`
  - `deleteDiaryEntry(entryId)`
  - Helper: `getDiaryEntryById(entryId)`
- Keep existing `AlbumService` for “listened” status and overall reviews/ratings (no coupling of diary rating to overall rating)

---

## Privacy
Respect `UserPreferences.activityVisibility`:
- Public: visible to everyone
- Friends: visible to mutual follows only (A follows B and B follows A)
- Private: visible only to the owner

If access is denied, show an appropriate privacy message instead of the diary list.

---

## UX Flows

### 1) Add via Album Details
- User taps “Mark as Listened” on Album Details
- Show modal with:
  - Toggle: “Add to diary?” (default ON)
  - Date picker (date-only), default to today; restrict to today/past (no future)
  - Optional rating input (1–5) for the diary entry snapshot
- Behaviors:
  - If toggle ON: create `DiaryEntry` with given date and optional rating; ensure album is marked as listened
  - If toggle OFF: only mark as listened; no diary entry
  - If user previously marked as listened without a diary entry, show an “Add to Diary” action on Album Details that opens the same modal

Validation:
- Enforce one entry per user+album+diaryDate; show a friendly error if duplicate

### 2) Diary List Access
- On a user’s profile page, show a segmented control at the top to toggle between Profile and Diary
- Default segment: Profile
- Remember last selected segment per session (persist lightweight preference locally)

### 3) Diary List Presentation
- Group entries by Month YYYY header
- Under each month, show rows in reverse chronological order (newest first by date; within same day, order by `createdAt` desc)
- Row content:
  - Far left: day number (1–31)
  - Small album cover (approx 32–40 px)
  - Title block: `Album Title (Year)`; below or inline show rating snapshot if present
  - If no ratingAtTime, hide the rating UI for a cleaner row
- Tap row -> navigate to Diary Entry Details screen

### 4) Diary Entry Details Screen
- Display: user’s name, album cover, album title (year), the diary date, and `ratingAtTime` if present
- Actions: Edit date, Edit rating snapshot, Delete entry
- Deleting an entry does NOT unset listened status

### 5) Empty States
- Own profile: “No diary entries yet. Mark albums as listened and add them to your diary.”
- Other user: “No diary entries to show.”

---

## Pagination & Performance
- Infinite scroll by month
- Initial load: most recent 3 months
- On scroll, load older months batch-by-batch
- Consider virtualized lists where appropriate

---

## Time Handling
- `diaryDate` captured as date-only in the user’s local time; stored as an ISO date string (YYYY-MM-DD)
- No future dates allowed
- Past dates allowed without lower bound (can be before joinedDate)
- Sorting within the same day uses `createdAt` desc

---

## Navigation
New screens/routes to add:
- `DiaryScreen` (user’s diary list view, reachable via Profile/Diary segmented control)
- `DiaryEntryDetailsScreen` (details for a specific entry)

Updates:
- Add segmented control to `ProfileScreen` and `UserProfileScreen`; persist last selected segment per session

---

## State Management (High-Level)
- Add `DiaryEntry` type to shared types
- Add a `diarySlice` (Redux) to store:
  - `entriesByUser` keyed by userId with month-bucketed pages
  - loading/error states
  - optionally `lastSelectedProfileTab` per user or stored via AsyncStorage
- Derive month groupings in selectors for UI

---

## Error Handling
- Duplicate entry (same user+album+date): show a clear message (e.g., “You already logged this album for that date.”)
- Privacy blocked: show message instead of list
- Network/API failures: show retry affordances

---

## Future Enhancements (post-MVP)
- Notes/comments per diary entry
- Add entry from diary screen
- Multi-select backfill tools
- Filters (by rating, artist, year)
- Export diary

---

## QA Acceptance Criteria
- Creating an entry with toggle ON, a past date, and optional rating appears in the correct month/day group and order
- Multiple entries for the same album across different days are supported; same-day duplicates are rejected
- Hiding rating when `ratingAtTime` is absent
- Deleting an entry removes it from the diary list but keeps album “listened” state
- Privacy enforcement works for public, friends (mutual), and private
- Infinite scroll loads older months; initial view contains recent 3 months
- Profile/Diary segmented control defaults to Profile and remembers last selection per session