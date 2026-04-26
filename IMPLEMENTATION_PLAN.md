# Implementation Plan — Family Storytelling Features

> Generated: 2026-04-22  
> Features: Reactions & Comments · Photo Following & Notifications · On This Day · People & Places Tagging · Timeline View  
> Audio Narration: postponed (separate spec)

---

## Confirmed Decisions

| Question | Decision |
|---|---|
| Users notified for own actions | No — actor is excluded from notifications they trigger |
| Max people tags per photo | No limit |
| "On This Day" dismissal | Persists for the calendar day (stored per-user in DB) |
| Location field | Free text stored in DB only (not XMP); map view is P1 |
| Notification persistence | DB rows with `read`/`unread` flag per user |
| Reactions | Attributed — show who reacted with which emoji |

---

## Architecture Overview

The app is a monorepo: `packages/shared` (types) → `server` (Fastify + SQLite/Drizzle) → `client` (React 19 + TanStack Query). All new features follow the existing pattern:

1. Add Drizzle schema → 2. Add shared types → 3. Add server routes → 4. Add client hooks + components

Social data (reactions, comments, tags, follows, notifications) lives in the DB only — not in XMP sidecar files. XMP remains the source of truth for photo metadata (title, caption, date).

---

## Phase 1 — Database Schema

**File: `server/src/db/schema.ts`**

### New column on `photos` table
```
location  text  nullable
```

### New tables

#### `people_tags`
| Column | Type | Notes |
|---|---|---|
| id | text | PK, nanoid |
| name | text | UNIQUE, stored lowercase-normalised for dedup |

#### `photo_people_tags`
| Column | Type | Notes |
|---|---|---|
| photoId | text | FK → photos.id |
| tagId | text | FK → people_tags.id |
| createdAt | text | ISO timestamp |

Composite PK: (photoId, tagId). Index on tagId for reverse lookup.

#### `reactions`
| Column | Type | Notes |
|---|---|---|
| id | text | PK, nanoid |
| photoId | text | FK → photos.id |
| userId | text | FK → users.id |
| emoji | text | One of: ❤️ 😂 😢 😮 🙏 👏 |
| createdAt | text | ISO timestamp |

UNIQUE constraint on (photoId, userId, emoji) — one of each emoji per user per photo.  
Index on photoId.

#### `comments`
| Column | Type | Notes |
|---|---|---|
| id | text | PK, nanoid |
| photoId | text | FK → photos.id |
| userId | text | FK → users.id |
| parentCommentId | text | Nullable — null = top-level, non-null = reply |
| body | text | Max 500 chars, enforced server-side |
| createdAt | text | ISO timestamp |

Index on (photoId, createdAt). Max one level of threading — replies cannot have replies.

#### `photo_follows`
| Column | Type | Notes |
|---|---|---|
| photoId | text | FK → photos.id |
| userId | text | FK → users.id |
| createdAt | text | ISO timestamp |

Composite PK: (photoId, userId). Index on userId for "all my followed photos".

#### `notifications`
| Column | Type | Notes |
|---|---|---|
| id | text | PK, nanoid |
| userId | text | Recipient — FK → users.id |
| photoId | text | FK → photos.id |
| actorId | text | Who triggered it — FK → users.id |
| actionType | text | See NotificationActionType below |
| detail | text | Nullable, e.g. emoji or tag name |
| read | integer | Boolean — 0 = unread, 1 = read |
| createdAt | text | ISO timestamp |

Index on (userId, read) for fast unread count. Index on (userId, createdAt) for list.

**NotificationActionType values:** `reaction | comment | reply | people_tag | set_title | set_caption | add_story | edit_story | set_location`

#### `dismissed_on_this_day`
| Column | Type | Notes |
|---|---|---|
| userId | text | FK → users.id |
| dismissedDate | text | ISO date `YYYY-MM-DD` |

Composite PK: (userId, dismissedDate). One row per user per calendar day they dismissed.

### Migration strategy
Drizzle doesn't auto-migrate in this project. Use `db.run(sql\`ALTER TABLE...\`)` statements in a migration script run at server startup (guarded by checking if column/table exists first). New tables use `CREATE TABLE IF NOT EXISTS`.

---

## Phase 2 — Shared Types

**File: `packages/shared/src/types.ts`** — additions:

```typescript
// Add to Photo interface:
location: string | null

// Add to ActivityAction:
| 'add_reaction' | 'remove_reaction' | 'add_comment' | 'delete_comment'
| 'add_people_tag' | 'remove_people_tag' | 'set_location'

// New interfaces:
export interface PeopleTag {
  id: string;
  name: string;
}

export interface Reaction {
  id: string;
  photoId: string;
  userId: string;
  userDisplayName: string;
  emoji: string;
  createdAt: string;
}

export interface Comment {
  id: string;
  photoId: string;
  userId: string;
  userDisplayName: string;
  parentCommentId: string | null;
  body: string;
  createdAt: string;
  replies: Comment[];  // populated server-side, always [] for replies themselves
}

export interface Notification {
  id: string;
  userId: string;
  photoId: string;
  photoFilename: string;
  photoFolderPath: string;
  actorId: string;
  actorDisplayName: string;
  actionType: NotificationActionType;
  detail: string | null;
  read: boolean;
  createdAt: string;
}

export type NotificationActionType =
  | 'reaction' | 'comment' | 'reply' | 'people_tag'
  | 'set_title' | 'set_caption' | 'add_story' | 'edit_story' | 'set_location';

export interface OnThisDayPhoto extends Photo {
  year: number;
}
```

**File: `packages/shared/src/api-types.ts`** — additions:

```typescript
// Reactions
export interface AddReactionRequest { emoji: string }
export interface ReactionsResponse { reactions: Reaction[] }

// Comments
export interface AddCommentRequest { body: string; parentCommentId?: string }
export interface CommentsResponse { comments: Comment[] }

// Tags
export interface AddPeopleTagRequest { name: string }
export interface PeopleTagsResponse { tags: PeopleTag[] }
export interface AllPeopleTagsResponse { tags: PeopleTag[] }

// Location
export interface UpdateLocationRequest { location: string }

// Follows
export interface FollowStatusResponse { following: boolean }

// Notifications
export interface NotificationsResponse {
  notifications: Notification[];
  unreadCount: number;
  total: number;
}

// On This Day
export interface OnThisDayResponse {
  photos: OnThisDayPhoto[];
  dismissed: boolean;
}
```

---

## Phase 3 — Server Routes & Services

### 3a. Notification Service
**New file: `server/src/notifications/service.ts`**

```typescript
export function createNotifications(
  photoId: string,
  actorId: string,
  actionType: NotificationActionType,
  detail?: string
): void
```

- Looks up all followers of the photo from `photo_follows`
- Excludes the actor (actorId)
- Inserts one notification row per follower
- Called from every route that modifies a photo

### 3b. Auto-follow Service
**New file: `server/src/follows/service.ts`**

```typescript
export function ensureFollowing(userId: string, photoId: string): void
```

- Upsert (INSERT OR IGNORE) into `photo_follows`
- Called from every route where a user adds content to a photo

### 3c. New Route Files

#### `server/src/reactions/routes.ts`
| Method | Path | Description |
|---|---|---|
| GET | `/api/photos/:id/reactions` | Returns all reactions for photo, attributed |
| POST | `/api/photos/:id/reactions` | Add reaction `{ emoji }`. Auto-follows photo. Creates notifications. |
| DELETE | `/api/photos/:id/reactions/:emoji` | Remove own reaction |

#### `server/src/comments/routes.ts`
| Method | Path | Description |
|---|---|---|
| GET | `/api/photos/:id/comments` | Returns threaded comments (top-level + their replies) |
| POST | `/api/photos/:id/comments` | Add comment `{ body, parentCommentId? }`. Auto-follows. Creates notifications. |
| DELETE | `/api/comments/:id` | Delete own comment (or admin deletes any) |

#### `server/src/tags/routes.ts`
| Method | Path | Description |
|---|---|---|
| GET | `/api/people-tags` | All people tags in system (for autocomplete) |
| GET | `/api/photos/:id/people-tags` | People tags on a specific photo |
| POST | `/api/photos/:id/people-tags` | Add tag `{ name }`. Creates tag if not exists. Auto-follows. Creates notifications. |
| DELETE | `/api/photos/:id/people-tags/:tagId` | Remove tag from photo |
| GET | `/api/gallery?personTag=X` | Filter gallery by person tag (extend existing folder contents route) |

#### `server/src/follows/routes.ts`
| Method | Path | Description |
|---|---|---|
| GET | `/api/photos/:id/follow` | Returns `{ following: boolean }` |
| POST | `/api/photos/:id/follow` | Follow photo |
| DELETE | `/api/photos/:id/follow` | Unfollow photo |

#### `server/src/notifications/routes.ts`
| Method | Path | Description |
|---|---|---|
| GET | `/api/notifications` | Returns notifications for current user, newest first, with unreadCount |
| PATCH | `/api/notifications/:id/read` | Mark single notification read |
| POST | `/api/notifications/read-all` | Mark all as read |

#### `server/src/on-this-day/routes.ts`
| Method | Path | Description |
|---|---|---|
| GET | `/api/on-this-day` | Photos whose date matches today's MM-DD. Date source: `dateTaken` (user-set) falling back to EXIF. Returns `{ photos, dismissed }`. |
| POST | `/api/on-this-day/dismiss` | Upsert row in `dismissed_on_this_day` for today |

### 3d. Updates to Existing Routes

**`server/src/metadata/routes.ts`**
- Add `PATCH /api/photos/:id/location` — saves to `photos.location`, logs activity, triggers notifications, auto-follows
- After each existing mutation (title, caption, date, story add/edit), call `ensureFollowing(userId, photoId)` then `createNotifications(photoId, userId, actionType)`

**`server/src/photos/routes.ts`** (folder contents)
- Add `personTag` query param to filter photos where that tag is applied
- Add `'timeline'` as a valid sort value: `ORDER BY date_taken ASC NULLS LAST, filename ASC`
- Include `reactionCount` and `commentCount` in photo list response (for gallery badges)

**`server/src/app.ts`**
- Register: reactionsRoutes, commentsRoutes, tagsRoutes, followsRoutes, notificationsRoutes, onThisDayRoutes

---

## Phase 4 — Client

### 4a. API Client
**File: `client/src/api/client.ts`** — new methods:

```typescript
// Reactions
getReactions(photoId: string): Promise<ReactionsResponse>
addReaction(photoId: string, emoji: string): Promise<void>
removeReaction(photoId: string, emoji: string): Promise<void>

// Comments
getComments(photoId: string): Promise<CommentsResponse>
addComment(photoId: string, body: string, parentCommentId?: string): Promise<Comment>
deleteComment(commentId: string): Promise<void>

// People tags
getAllPeopleTags(): Promise<AllPeopleTagsResponse>
getPhotoTags(photoId: string): Promise<PeopleTagsResponse>
addPeopleTag(photoId: string, name: string): Promise<PeopleTag>
removePeopleTag(photoId: string, tagId: string): Promise<void>

// Location
updateLocation(photoId: string, location: string): Promise<void>

// Follows
getFollowStatus(photoId: string): Promise<FollowStatusResponse>
followPhoto(photoId: string): Promise<void>
unfollowPhoto(photoId: string): Promise<void>

// Notifications
getNotifications(): Promise<NotificationsResponse>
markNotificationRead(id: string): Promise<void>
markAllNotificationsRead(): Promise<void>

// On This Day
getOnThisDay(): Promise<OnThisDayResponse>
dismissOnThisDay(): Promise<void>
```

### 4b. New Hooks
**Directory: `client/src/hooks/`**

- `useReactions(photoId)` — TanStack Query, invalidates on add/remove
- `useComments(photoId)` — TanStack Query, invalidates on add/delete
- `usePeopleTags(photoId)` — photo-specific tags; `useAllPeopleTags()` — system-wide for autocomplete
- `usePhotoFollow(photoId)` — follow status + toggle mutation
- `useNotifications()` — list + unread count; poll every 30s while app is open
- `useOnThisDay()` — fetch + dismiss mutation

### 4c. New Components

#### `client/src/components/photos/ReactionBar.tsx`
- Row of emoji buttons; counts shown below each
- Tapping an emoji you've already used removes it; tapping one you haven't adds it
- Tap the count to open an attribution popover (list of names who reacted)
- Props: `photoId`, `reactions: Reaction[]`, `currentUserId`

#### `client/src/components/photos/CommentThread.tsx`
- List of top-level comments, each with a reply button that opens an inline reply input
- One level of threading only — replies are indented under their parent
- Delete button on own comments (and admin)
- Empty state: "Be the first to add a comment"
- Props: `photoId`, `comments: Comment[]`, `currentUser`

#### `client/src/components/photos/PeopleTagInput.tsx`
- Text input with dropdown autocomplete from `useAllPeopleTags()`
- Filters suggestions on keystroke (case-insensitive contains match)
- "Create [name]" option if no match
- Shows existing tags as removable chips above the input
- Props: `photoId`, `tags: PeopleTag[]`

#### `client/src/components/shared/NotificationBell.tsx`
- Bell icon in nav bar
- Red badge showing unread count (hidden when 0)
- Click opens a dropdown list of notifications
- Each notification: photo thumbnail + plain-English sentence + timestamp + unread dot
- Click a notification: marks it read, navigates to the photo's Viewer page
- "Mark all as read" button at top of list
- Props: none (uses `useNotifications()` internally)

#### `client/src/components/shared/OnThisDayBanner.tsx`
- Appears at top of BrowsePage root (Library view) when photos exist for today's date
- Horizontal scrollable strip of photo cards (thumbnail + year + title)
- Click a photo: navigates to Viewer
- Dismiss (×) button: calls dismiss API; hides for rest of calendar day
- Does not render if `dismissed === true` or `photos.length === 0`

### 4d. Updates to Existing Components

#### `client/src/components/viewer/InfoPanel.tsx`
- Add **People tags** section: `<PeopleTagInput>`
- Add **Location** text field (inline edit, same pattern as title/caption)
- Add **Reactions** section: `<ReactionBar>`
- Add **Comments** section: `<CommentThread>`
- Add **Follow** toggle button (bell icon, active/inactive state)

#### `client/src/components/photos/PhotoCard.tsx`
- Add small reaction count + comment count badges to bottom of card
- Only shown when count > 0
- Match existing no-line, tonal design language

#### `client/src/pages/BrowsePage.tsx`
- Add `<OnThisDayBanner>` at root level (only when `folderPath` is null — Library view)
- Add **Timeline** sort option alongside existing Date/Filename/Annotation sorts
- Timeline sort: date ASC, undated at end, with decade/year section headers inserted as the virtual list renders

#### `client/src/pages/ViewerPage.tsx`
- Add **Follow** button to toolbar (bell icon, toggles follow state)
- NotificationBell is in the nav — wired from here or from App.tsx nav

#### `client/src/App.tsx` (nav bar)
- Add `<NotificationBell>` to the nav bar, visible on all authenticated pages

---

## Phase 5 — Timeline View: Year/Decade Markers

The ThumbnailGrid is virtualized with `@tanstack/react-virtual`. Timeline sort inserts virtual "marker" rows between photo groups:

- Server returns photos sorted by `dateTaken ASC NULLS LAST`
- Client post-processes the list: inserts `{ type: 'year-marker', year: number }` items where the year changes
- Decade markers inserted where the decade changes (e.g. entering the 1990s)
- Virtual list renders marker rows as full-width styled headings (no border — tonal background)
- "Undated" section marker at end if undated photos exist

---

## Phase 6 — Integration & Polish

- **PhotoCard badges**: reaction + comment count fetched as part of folder contents response (server joins, not separate client calls — avoids N+1)
- **Activity log**: new action types logged for reactions, comments, tags, location
- **Auto-follow on all mutations**: title, caption, date, story, location, tag, reaction, comment all call `ensureFollowing` + `createNotifications`
- **ReadmePage**: update to document all new features
- **Build verification**: `npm run build` must pass cleanly

---

## Implementation Order (respects dependencies)

```
Phase 1: DB schema + migration script
Phase 2: Shared types (packages/shared)
Phase 3a: Notification service + auto-follow service
Phase 3b: Reactions routes + Comments routes
Phase 3c: Follows routes + Notifications routes
Phase 3d: On This Day routes
Phase 3e: People Tags routes
Phase 3f: Update metadata routes (location + notification triggers)
Phase 3g: Update folder contents routes (timeline sort, person tag filter, counts)
Phase 3h: Register all new routes in app.ts
Phase 4a: API client methods
Phase 4b: Hooks
Phase 4c: ReactionBar + CommentThread components
Phase 4d: PeopleTagInput component
Phase 4e: NotificationBell component
Phase 4f: OnThisDayBanner component
Phase 4g: InfoPanel updates (tags, location, reactions, comments, follow)
Phase 4h: PhotoCard badges
Phase 4i: BrowsePage (OnThisDayBanner, Timeline sort, year markers)
Phase 4j: ViewerPage + App nav (follow button, NotificationBell)
Phase 5: Build verification + ReadmePage update
```

---

## Files That Will Change

| File | Change |
|---|---|
| `server/src/db/schema.ts` | Add 6 new tables + `location` column |
| `server/src/db/connection.ts` | Add migration runner for new schema |
| `server/src/app.ts` | Register 6 new route modules |
| `server/src/metadata/routes.ts` | Add location endpoint; add notification + auto-follow calls |
| `server/src/photos/routes.ts` | Timeline sort, personTag filter, reaction/comment counts |
| `packages/shared/src/types.ts` | New interfaces, extend existing |
| `packages/shared/src/api-types.ts` | New request/response types |
| `client/src/api/client.ts` | ~12 new methods |
| `client/src/hooks/` | 5 new hook files |
| `client/src/components/photos/PhotoCard.tsx` | Reaction + comment count badges |
| `client/src/components/photos/ThumbnailGrid.tsx` | Timeline year/decade markers |
| `client/src/components/viewer/InfoPanel.tsx` | Tags, location, reactions, comments, follow |
| `client/src/pages/BrowsePage.tsx` | OnThisDayBanner, Timeline sort |
| `client/src/pages/ViewerPage.tsx` | Follow button |
| `client/src/App.tsx` | NotificationBell in nav |
| `client/src/pages/ReadmePage.tsx` | Document new features |

**New files:**
- `server/src/reactions/routes.ts`
- `server/src/comments/routes.ts`
- `server/src/tags/routes.ts`
- `server/src/follows/routes.ts` + `service.ts`
- `server/src/notifications/routes.ts` + `service.ts`
- `server/src/on-this-day/routes.ts`
- `client/src/components/photos/ReactionBar.tsx`
- `client/src/components/photos/CommentThread.tsx`
- `client/src/components/photos/PeopleTagInput.tsx`
- `client/src/components/shared/NotificationBell.tsx`
- `client/src/components/shared/OnThisDayBanner.tsx`
- `client/src/hooks/useReactions.ts`
- `client/src/hooks/useComments.ts`
- `client/src/hooks/usePeopleTags.ts`
- `client/src/hooks/usePhotoFollow.ts`
- `client/src/hooks/useNotifications.ts`
- `client/src/hooks/useOnThisDay.ts`

---

## Risk & Constraints

| Risk | Mitigation |
|---|---|
| FTS5 contentless table — existing constraint | New features don't touch `photos_fts`; only title/caption/story changes do |
| N+1 for reaction/comment counts on gallery | Fetch counts server-side as part of folder contents response via JOIN |
| Timeline sort with NULLS LAST | SQLite doesn't support `NULLS LAST` natively — use `ORDER BY CASE WHEN date_taken IS NULL THEN 1 ELSE 0 END, date_taken ASC` |
| Drizzle schema doesn't auto-migrate | Write `CREATE TABLE IF NOT EXISTS` migration SQL run at startup |
| Notification fan-out for large families | Fine at family scale; not a concern for v1 |
| Polling for notifications | 30s interval with `refetchInterval` in TanStack Query; stops when window is hidden |
