## Civic Match — Architecture

### Product overview

Civic Match helps changemakers find the right co‑founders and collaborators for impact projects.

- **Explore (default)**: Search and filter people by values, skills, and causes in a masonry grid
- **Connect**: Built‑in messaging to start conversations quickly
- **Showcase**: Personal profile highlighting mission, skills, and projects
- **Manage**: Focused dashboard for connections and conversations
- **Access anywhere**: Fully responsive for desktop and mobile with dark mode

### Objectives and principles

- **Responsiveness**: Mobile‑first, great on large screens
- **Clarity**: Clean UI with accessible, consistent components
- **Server‑first**: Use Server Components where possible; hydrate sparingly
- **Privacy‑aware**: Minimal data collection, clear ownership controls
- **Speed & reliability**: Fast initial load, resilient realtime messaging
- **Modularity**: Feature modules with clear boundaries

## Technical stack

- **Framework**: Next.js (App Router, React 18, TypeScript)
- **UI system**: Tailwind CSS + shadcn/ui (Radix primitives)
- **Dark mode**: `next-themes` with `class` strategy (`dark` on `html`)
- **Forms & validation**: React Hook Form + Zod (zodResolver)
- **Data fetching**: RSC for server data; TanStack Query on the client for mutations/live data
- **Icons**: Lucide
- **Dates**: date-fns
- **Messaging realtime**: Supabase Realtime (primary) or Pusher (fallback)
- **Auth & DB (default path)**: Supabase (Postgres + Auth + Storage + Realtime)
  - Alt path: Prisma + Postgres (Neon/PlanetScale equivalent) + NextAuth

Notes
- We will start with Supabase for speed and integrated Realtime. The Prisma path remains viable if needs change.
- No vendor lock at the UI level; swapping data providers is isolated in the data layer.

## High‑level architecture

```
Client (RSC + selective CSR)
   │
   ├─ Next.js App Router (route handlers, server actions)
   │     ├─ Auth (Supabase) + RLS policies
   │     ├─ Domain services (profiles, matching, messaging, connections)
   │     └─ Validation (Zod)
   │
   ├─ Database (Postgres / Supabase)
   ├─ Realtime (Supabase Realtime) for conversations & presence
   └─ Storage (avatars, images) via Supabase Storage
```

## Domain model (MVP)

- **User**: id, email, createdAt, onboarded
- **Profile**: userId, displayName, username, bio, location, availability, avatarUrl, values[], skills[], causes[]
- **Connection**: id, requesterId, addresseeId, status(pending|accepted|declined|blocked), createdAt
- **Conversation**: id, participantIds[], createdAt, updatedAt
- **Message**: id, conversationId, senderId, text, attachments[], createdAt, readAt?
- **SavedSearch** (optional later): id, userId, filters, createdAt

Indexes focus on username, search facets (skills/causes), and conversationId for fast messaging.

## Feature modules

- **Auth & onboarding**: email magic link, optional social; guided setup of profile facets
- **Profiles**: view/edit profile; public profile at `/profile/[username]`
- **Matching & search**: filter by values, skills, causes; sort by a rule‑based score
- **Messaging**: 1:1 conversations; realtime updates; optimistic send
- **Connections**: request/accept/block; dashboard overview
- **Notifications**: in‑app (toast/badge); email later

## Matching approach (rule‑based MVP)

Score candidate C for seeker S by weighted overlap of values, skills, and causes:

\[ score(C,S) = w_v · overlap(values) + w_s · overlap(skills) + w_c · overlap(causes) + w_l · geoAffinity \]

- Start with equal weights: `w_v = w_s = w_c = 1.0`, `w_l = 0.5` (if location provided)
- Overlap is Jaccard similarity for each facet
- Future: learning‑to‑rank from connection accept rates

## UI/UX architecture

- **Design tokens**: Tailwind theme extended in `tailwind.config` (colors, spacing, radii)
- **Components**: shadcn/ui primitives composed into Civic Match components (e.g., `Logo`, `ProfileCard`, Filters UI)
  - Foundations: `Button`, `Input`, `Textarea`, `Select`, `Badge`, `Avatar`, `Dialog`, `Sheet`, `Tabs`
  - Domain: `ProfileCard`, `FacetChips`, `MatchList`, `ConversationList`, `MessageBubble`, `ConnectionCard`
- **Dark mode**: `next-themes` with `ThemeProvider`; store preference in `localStorage`
- **Responsiveness**: mobile‑first; critical layouts use `grid`/`flex` with safe fallbacks
- **A11y**: keyboard focus states, Radix primitives, color contrast ≥ 4.5:1

### Button & pill system
- Unified pill styling across the app (TopBar, Explore, Profiles, Messages, My Profile):
  - Base: `h-10 inline-flex items-center justify-center rounded-full`
  - Primary: `border-transparent bg-[color:var(--accent)] text-[color:var(--background)]`
  - Muted: `border border-divider bg-[color:var(--muted)]/20 hover:bg-[color:var(--muted)]/30`
  - Mobile emphasis: larger variants (e.g., `h-12`) where tap targets need to be bigger
- Icon-only pills on mobile where space is constrained (e.g., Send in chat)

### Global layout
- No sidebar anywhere in the app
- Sticky global top bar provided by `TopBar` and rendered from `app/layout.tsx` (single source of truth)
- Left: `Logo` + app title. Right: pill actions `Explore`, `Profiles`, `Messages` (active with orange fill), `Logout`, and user chip (avatar + name on desktop)
- Mobile: icons‑only for the same actions; on `/messages/[id]` a back arrow appears in the global top bar
- Top bar remains visible while scrolling (backdrop blur), keeps actions accessible

Auth context: the app tree is wrapped by a lightweight client `AuthProvider` in `app/layout.tsx`. It exposes `status` (loading/authenticated/unauthenticated), `session`, and `user` via `useAuth()`. Components like `TopBar`, Explore, and Profiles read auth from this context (single source of truth) instead of querying Supabase directly on every page.

### Explore view
- Default view after login at `/`
- Masonry grid of profile cards (CSS columns) with infinite loading using `IntersectionObserver`
- Desktop: sticky filter panel on the right with pill‑styled controls (each with Lucide icon); Favorites toggle uses accent‑filled pill when active. Offset below the sticky top bar
- Mobile: sticky bottom "Filters" pill that opens a bottom‑sheet with larger (h‑12) pill controls, including a Favorites toggle; hamburger removed
- Profile cards: rounded corners, subtle shadow, role badge and save control; show name + short bio
- Clicking a profile card navigates to the Profiles view (`/profiles`) to show a full profile

#### Explore data fetching & pagination (MVP)
- **Source**: `public.profiles` (RLS allows `SELECT` for all). Read fields: `user_id`, `username`, and `data` (use `data.displayName`, `data.bio`, `data.skills[0]` as role, `data.avatarUrl`).
- **Initial load**: fetch the first page with `limit = 24`.
- **Pagination strategy**:
  - Start with simple `offset/limit` for MVP (fast to ship, adequate for small N and varied filters):
    - Request: `?limit=24&offset=0`, next page `offset += 24`.
    - SQL/PostgREST: `.select('*').order('created_at', { ascending: false }).range(offset, offset+limit-1)`.
  - Upgrade to keyset pagination for stability and performance at scale:
    - Order by `(created_at desc, user_id desc)` with indexes.
    - Cursor encodes last `(created_at, user_id)`; query uses tuple comparison:
      - `where created_at < $cursorCreatedAt OR (created_at = $cursorCreatedAt AND user_id < $cursorUserId)`.
    - Returns `items` + `nextCursor` until empty.
- **Indexes**:
  - Add `create index if not exists profiles_created_at_idx on public.profiles(created_at desc);` to support ordering.
  - Already present: `GIN` on `data` for JSONB filters.
- **Transport & API**:
  - MVP: client fetch with `@supabase/supabase-js` (anon) directly from the Explore page.
  - Next step (preferred): centralize in a route handler `GET /api/profiles` that accepts filters and `cursor/offset`, returns `{ items, nextCursor | nextOffset }` to keep query logic server‑side.
- **Infinite scroll**:
  - Use the existing `IntersectionObserver` sentinel at the bottom of the list.
  - On intersect, fetch next page (guard with `isLoading` and `hasMore`).
  - De‑dupe by `user_id` to avoid duplicates.
- **Filters (later)**:
  - JSONB containment for facets, e.g., Supabase: `.contains('data', { skills: ['Design'] })` and `.contains('data', { causes: ['Climate'] })`.
  - Combine with keyset/offset; keep page size fixed (24) and pass filters to API to compute `nextCursor` consistently.
### Profiles view
- Uses the same global top bar
- Left column shows a flexible grid of panels (no fixed 1/3 or 2/3 rules). Titles drop legacy prefixes for clarity. Panels:
  - NAME: full‑bleed image (object‑cover, fixed 400px height) with name label; adjacent basic info (location, tags, bio, links)
  - Skills & What I Do (chips)
  - What I’m Known For (auto‑links URLs)
  - What I’m Focused On
  - Long‑term Strategy
  - Work Style (new)
  - What do I need help with (new)
  - Portfolio removed for MVP
- Consistent sizing via flexible grid (`auto-rows-fr`) and panel `min-height` where needed.
- Right column: sticky Invite composer with pill Skip/Invite; Skip loads another profile instead of alerting.
- Mobile: bottom composer; extra bottom padding prevents the last panel from being obscured.
- Desktop: right column hosts a sticky Invite composer panel sized to half the viewport height; pill‑shaped Skip and Invite buttons with icons
- Mobile: bottom fixed composer with full‑width textarea; pill‑shaped buttons below (Skip left, Invite right)

### My Profile (edit) view
- Mirrors public profile panels with one input per panel. Panels: Basics, Skills & What I Do, What I’m Known For, What I’m Focused On (mapped to first AIM item), Long‑term Strategy, Work Style, What do I need help with.
- Portfolio and Custom Sections removed.
- Inputs include helpful placeholders with guidance and examples.
- Buttons follow the pill system; Basics actions like “Change Picture” and “Add link” are muted pill buttons with icons.
- Desktop: header Save/Logout as pills (extra horizontal padding). Mobile: header actions hidden; sticky bottom Save/Logout pills.

## Routing & structure (App Router)

```
src/app/
  (marketing)/
    page.tsx
  (auth)/
    sign-in/page.tsx
    callback/route.ts
  page.tsx                // Explore (default after login)
  profile/page.tsx        // Edit your profile
  messages/
    page.tsx              // Conversations list + active thread (desktop split)
    [id]/page.tsx         // Full‑screen chat on mobile; global top bar shows a back arrow
  api/
    search/route.ts       // server search endpoint (if needed)
  layout.tsx
  globals.css
```

Guidance
- Prefer RSC for data reads; move interactive pieces to client components
- Use server actions for mutations when practical; otherwise route handlers

## Data layer

- **Server reads**: Direct from Postgres via Supabase server client inside RSC
- **Client mutations**: TanStack Query `useMutation`; optimistic updates; invalidate precise keys
- **Validation**: Zod schemas shared across client/server for DTOs
- **Caching**: HTTP caching for static segments; in‑memory query cache on client; ISR where safe

## Supabase integration & backend sync plan

- **Project setup**
  - Create a Supabase project; add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to `.env.local`.
  - Install client: `@supabase/supabase-js`.
  - Add `src/lib/supabase/server.ts` (RSC/server actions) and `src/lib/supabase/client.ts` (CSR) thin wrappers.
  - Generate types: commit a script to run `supabase gen types typescript --project-id <PROJECT_REF> --schema public > src/types/supabase.ts`.
- **Migrations**
  - Use SQL migrations to create tables, indexes, triggers, and RLS policies (see schema below). Store under `supabase/migrations`.
  - Include `set_updated_at()` trigger on all mutable tables.
- **RLS & security**
  - Enable RLS on all tables. Scope access by `auth.uid()` to record owners/participants.
  - Start permissive with SELECT on public profile view; tighten later as needed.
- **Data access**
  - Reads: server-first in RSC with the Supabase server client.
  - Writes: server actions where possible; otherwise route handlers. For client-side interactivity, use TanStack Query `useMutation` with optimistic updates.
- **Realtime**
  - Subscribe to `postgres_changes` on `messages` filtered by `conversation_id` for new messages.
  - Optionally add presence/typing with Realtime channels later.
- **JSONB strategy**
  - Keep minimal relational columns for identity, joins, constraints, and hot filters (e.g., `user_id`, `username`, `status`, foreign keys).
  - Store flexible, evolving attributes in `data jsonb` with GIN indexes for search. Add expression indexes for common access paths.

### Storage (avatars)

- **Bucket**: `avatars` (public) for profile pictures.
- **Path convention**: `userId/<filename>` (e.g., `f0a1.../avatar-1700000000000.webp`).
- **Linking**: store the absolute public URL in `public.profiles.data.avatarUrl`. Optionally also store `avatarPath` (storage key) for future migrations/cache busting.

SQL migration to create the bucket and RLS policies (add as `supabase/migrations/0002_storage_avatars.sql`):

```sql
-- Create a public bucket for profile avatars (no-op if it already exists)
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- RLS: public read of avatar images
create policy if not exists "avatars_public_read" on storage.objects
for select using (bucket_id = 'avatars');

-- RLS: authenticated users can upload to their own folder (prefix matches auth.uid())
create policy if not exists "avatars_authenticated_upload_own_folder" on storage.objects
for insert to authenticated with check (
  bucket_id = 'avatars' and split_part(name, '/', 1) = auth.uid()::text
);

-- RLS: authenticated users can update and delete their own objects
create policy if not exists "avatars_update_own" on storage.objects
for update to authenticated using (
  bucket_id = 'avatars' and split_part(name, '/', 1) = auth.uid()::text
);

create policy if not exists "avatars_delete_own" on storage.objects
for delete to authenticated using (
  bucket_id = 'avatars' and split_part(name, '/', 1) = auth.uid()::text
);
```

Client flow (My Profile view):
- **Upload**: when a user selects an image, upload to `avatars` with key `${user.id}/avatar-${Date.now()}.${ext}` (set `cacheControl` and `upsert: true`).
- **URL**: retrieve a public URL via `storage.from('avatars').getPublicUrl(key)`.
- **Persist**: update `public.profiles.data.avatarUrl` for the current user (policy `profiles_update_own` already allows this).
- **Images**: allow JPEG/PNG/WebP; cap size; optionally delete old objects when replacing.
- **Next/Image**: add the Supabase storage domain to `next.config.ts` `images.remotePatterns` to render remote avatars.

Lifecycle:
- **Replace**: after a successful upload, delete the previous object (if any) whose storage key is derived from the old `avatarUrl` path (`/storage/v1/object/public/<bucket>/<key>`).
- **Remove**: delete the current object and clear `profiles.data.avatarUrl`.

Rendering:
- **Explore**: cards show the avatar image in the card header if `profiles.data.avatarUrl` is present.
- **Profiles**: public profile view shows the avatar image in the NAME panel; edit view previews and manages uploads/removals.

Automation (using MCP Supabase tools):
- Apply the SQL above as a migration via the MCP Supabase migration tool, or run it once in SQL Editor. After creation, no further management is required in code.
- Optionally generate refreshed types if the app references storage types (not required for this change).

### Current implementation (status)
- **Environment**: `.env` contains `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (not committed).
- **Client**: browser client in `src/lib/supabase/client.ts` configured with stable auth options (`persistSession`, `autoRefreshToken`, `detectSessionInUrl`) and a dedicated `storageKey` (`civicmatch.supabase.auth`). A global `AuthProvider` wraps the app and derives auth from `getSession()` and `onAuthStateChange`, exposing `useAuth()`.
- **Types**: generated at `src/types/supabase.ts` and refreshed after migrations.
- **Migrations**: `supabase/migrations/0001_init.sql` applied (profiles, connections, conversations, messages, saved_searches + RLS + triggers).
- **Auth wiring**: Explore page (`/`) login/register form uses Supabase Auth (email/password). After auth, an `ensureProfile` step upserts into `public.profiles` with `user_id`, `username = email`, and a starter `data` payload.
- **Profile editing**: `profile/page.tsx` loads `public.profiles.data` for the current user and updates it on Save. Logout calls `supabase.auth.signOut()`.

### Google Sign‑in (Supabase) — integration plan

- **Provider setup (Supabase Dashboard)**
  - Enable Google under Authentication → Providers.
  - Callback URL (read‑only in Supabase): `https://gmqbixdqkdllmjiyhdke.supabase.co/auth/v1/callback`.
  - Auth → URL Configuration:
    - Site URL: your production app domain (e.g., `https://app.example.com`).
    - Additional Redirect URLs: add `http://localhost:3000` for local dev (and any other preview URLs if used).

- **Google Cloud Console (OAuth client → Web application)**
  - Authorized JavaScript origins:
    - `http://localhost:3000`
    - `https://app.example.com` (replace with your production domain)
  - Authorized redirect URIs:
    - `https://gmqbixdqkdllmjiyhdke.supabase.co/auth/v1/callback` (exact match)
  - Note: Do not put your app origin here. Supabase (GoTrue) is the OAuth client and must be the redirect URI. After Supabase completes the callback, it redirects the browser back to your app origin (configured via `redirectTo` and Supabase Auth URL settings).
  - Common error: `redirect_uri_mismatch` — ensure the redirect URI in Google exactly equals `https://gmqbixdqkdllmjiyhdke.supabase.co/auth/v1/callback` with no trailing slashes or extra paths.

- **Environment**
  - Already using `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. No extra env vars are required for Google OAuth on the client.

- **Client flow changes (`src/app/page.tsx`)**
  - Add a "Continue with Google" pill button alongside email/password.
  - On click, call:
    - `await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })` (redirect flow; no custom route needed).
  - Auth state comes from `AuthProvider` (`useAuth()`), initialized from `getSession()` and kept in sync by `onAuthStateChange` (no localStorage flags).
  - `ensureProfileForCurrentUser()` upserts on first sign‑in and bootstraps profile data from Google metadata:
    - Map `user.user_metadata.name` → `profiles.data.displayName` (fallback to `full_name` or `given_name + family_name`, else email prefix).
    - Map `user.user_metadata.picture` → `profiles.data.avatarUrl` (fallback to `avatar_url` if present).
    - Always set `profiles.data.email` to the user email.

- **Routing/redirect behavior**
  - Supabase handles the hosted callback and returns the browser to the originating app URL; no Next.js route is required.
  - Ensure your site URLs are listed in Supabase Auth → URL Configuration so redirects succeed.

- **UI/UX**
  - Use the same pill system. Label: "Continue with Google"; optional Google icon from `public/`.
  - Button remains disabled while the redirect call is in progress.

- **Testing**
  - Local: with `NEXT_PUBLIC_SUPABASE_*` set, click Google, complete consent, verify you return authenticated; confirm Explore loads and a `profiles` row exists.
  - Prod: add prod domain to redirect URLs; repeat test.

- **Non‑goals (now)**
  - No custom OAuth callback route; no server actions for OAuth; no multi‑provider account linking.

### Auth & profile lifecycle
1. User signs up or logs in on `/` using email/password via Supabase Auth.
2. On success, app upserts `public.profiles` with `user_id` and `username = email` (unique), plus `data.email`. If available from Google, also set `data.displayName` and `data.avatarUrl` during the initial insert (existing rows are not overwritten).
3. Navigating to `/profile` loads `profiles.data` for the current user and binds it to the edit form.
4. Clicking Save updates `profiles.data` (JSONB). Local draft remains for resilience.
5. Logout calls `supabase.auth.signOut()`; `AuthProvider` transitions to `unauthenticated`.

Fail‑safe: On client reads/writes, if a Supabase query fails and there is no active session (`getSession()` is null), the UI triggers a defensive `signOut()` and redirects to `/` to recover from stale or invalid client sessions.

## Database schema (JSONB‑first)

Notes
- Auth users live in `auth.users`; app tables reference it via `user_id`.
- Minimal typed columns + `data jsonb` for flexibility.
- All tables have `id` (or `user_id` for profiles), `created_at`, `updated_at`, `data jsonb`.

```sql
-- Utilities
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

-- Profiles (public view of users)
create table if not exists public.profiles (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  username   text unique not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  data       jsonb not null default '{}'
);
create index if not exists profiles_data_gin on public.profiles using gin (data jsonb_path_ops);
-- Common facets inside data: displayName, bio, location, availability, avatarUrl,
-- values[], skills[], causes[], links{}
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function set_updated_at();

alter table public.profiles enable row level security;
create policy "profiles_select_all" on public.profiles
for select using (true);
create policy "profiles_insert_own" on public.profiles
for insert with check (auth.uid() = user_id);
create policy "profiles_update_own" on public.profiles
for update using (auth.uid() = user_id);
create policy "profiles_delete_own" on public.profiles
for delete using (auth.uid() = user_id);

-- Connections between users
create table if not exists public.connections (
  id           uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id) on delete cascade,
  addressee_id uuid not null references auth.users(id) on delete cascade,
  status       text not null default 'pending', -- consider: pending|accepted|declined|blocked
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  data         jsonb not null default '{}',
  constraint connections_unique_pair unique (requester_id, addressee_id)
);
create index if not exists connections_status_idx on public.connections(status);
create index if not exists connections_requester_idx on public.connections(requester_id);
create index if not exists connections_addressee_idx on public.connections(addressee_id);
create trigger connections_set_updated_at
before update on public.connections
for each row execute function set_updated_at();

alter table public.connections enable row level security;
create policy "connections_participants_select" on public.connections
for select using (auth.uid() = requester_id or auth.uid() = addressee_id);
create policy "connections_requester_insert" on public.connections
for insert with check (auth.uid() = requester_id);
create policy "connections_participants_update" on public.connections
for update using (auth.uid() = requester_id or auth.uid() = addressee_id);
create policy "connections_requester_delete" on public.connections
for delete using (auth.uid() = requester_id);

-- Conversations (participants stored in data.participantIds as array of UUID strings)
create table if not exists public.conversations (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  data       jsonb not null default '{}'
);
create index if not exists conversations_data_gin on public.conversations using gin (data jsonb_path_ops);
create trigger conversations_set_updated_at
before update on public.conversations
for each row execute function set_updated_at();

alter table public.conversations enable row level security;
-- A user can access a conversation if they are listed in data.participantIds
create policy "conversations_participant_access" on public.conversations
for all using (
  exists (
    select 1 from jsonb_array_elements_text(data->'participantIds') pid
    where pid::uuid = auth.uid()
  )
)
with check (
  exists (
    select 1 from jsonb_array_elements_text(data->'participantIds') pid
    where pid::uuid = auth.uid()
  )
);

-- Messages (content flexible in data: text, attachments[], readAt, etc.)
create table if not exists public.messages (
  id               uuid primary key default gen_random_uuid(),
  conversation_id  uuid not null references public.conversations(id) on delete cascade,
  sender_id        uuid not null references auth.users(id) on delete cascade,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  data             jsonb not null default '{}'
);
create index if not exists messages_conversation_idx on public.messages(conversation_id);
create index if not exists messages_sender_idx on public.messages(sender_id);
create index if not exists messages_created_at_idx on public.messages(created_at desc);
create trigger messages_set_updated_at
before update on public.messages
for each row execute function set_updated_at();

alter table public.messages enable row level security;
-- Read if you participate in the parent conversation
create policy "messages_select_if_participant" on public.messages
for select using (
  exists (
    select 1 from public.conversations c
    where c.id = messages.conversation_id
      and exists (
        select 1 from jsonb_array_elements_text(c.data->'participantIds') pid
        where pid::uuid = auth.uid()
      )
  )
);
-- Insert if you are the sender and a participant
create policy "messages_insert_if_sender_participant" on public.messages
for insert with check (
  auth.uid() = sender_id and
  exists (
    select 1 from public.conversations c
    where c.id = messages.conversation_id
      and exists (
        select 1 from jsonb_array_elements_text(c.data->'participantIds') pid
        where pid::uuid = auth.uid()
      )
  )
);
-- Update/Delete limited to your own messages (rare in chat; usually disabled)
create policy "messages_update_own" on public.messages
for update using (auth.uid() = sender_id);
create policy "messages_delete_own" on public.messages
for delete using (auth.uid() = sender_id);

-- Saved searches (optional)
create table if not exists public.saved_searches (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  data       jsonb not null default '{}'
);
create index if not exists saved_searches_user_idx on public.saved_searches(user_id);
create index if not exists saved_searches_data_gin on public.saved_searches using gin (data jsonb_path_ops);
create trigger saved_searches_set_updated_at
before update on public.saved_searches
for each row execute function set_updated_at();

alter table public.saved_searches enable row level security;
create policy "saved_searches_owner_all" on public.saved_searches
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

Example `data` payloads

```json
// profiles.data
{
  "displayName": "Ada Lovelace",
  "bio": "I connect data and policy for climate innovation.",
  "location": { "city": "London", "country": "UK", "timezone": "Europe/London" },
  "availability": "open-to-collab",
  "avatarUrl": "/avatars/ada.png",
  "values": ["Integrity", "Impact", "Curiosity"],
  "skills": ["Data Science", "Policy", "Product"],
  "causes": ["Climate", "Civic Tech"],
  "links": { "x": "https://x.com/ada", "website": "https://adalabs.org" }
}
```

```json
// conversations.data
{ "participantIds": ["<uuid-of-user-a>", "<uuid-of-user-b>"] }

// messages.data
{ "text": "Hey there!", "attachments": [], "readAt": null }
```

## Messaging design

- **Transport**: Supabase Realtime channels per `conversationId`
- **Flow**: optimistic append → durable insert → realtime broadcast → reconcile/read receipts
- **Presence**: optional later (typing/online) using presence channels
- **Backpressure**: simple rate limit on send; text size cap

### Messaging UI
- Desktop: split layout in cards with bordered search header; item hover/active background; no left accent bar
- Mobile: full‑screen chat includes header with avatar, name, and about
- Composer: textarea + pill Send button; icon‑only pill on mobile; bubbles left/right aligned with tighter paddings

## Security & privacy

- **Auth**: Supabase Auth; session on server; middleware protects private routes
- **RLS**: strict row‑level security on all tables; policy tests required
- **PII minimization**: public vs private profile fields; explicit user controls
- **Abuse controls**: blocklist at `Connection.status=blocked`; rate limiting on search/messages
- **OWASP**: CSRF safe by server actions; input validation with Zod; output escaping by React

## Performance

- **Server‑first** rendering for profile/search pages
- **Streaming** RSC for long lists to reduce TTFB
- **Virtualization** for long result/message lists
- **Images**: Next/Image; responsive sizes; AVIF/WEBP
- **Bundles**: route‑level code splitting; avoid global client state

## Testing & quality

- **Unit**: Vitest + React Testing Library
- **E2E**: Playwright (smoke flows: onboarding, search, connect, message)
- **Type‑safety**: strict TS; generated DB types from Supabase
- **Lint/format**: ESLint + Prettier; CI checks on PR

## Analytics & telemetry (opt‑in)

- **Web analytics**: Vercel Analytics via `<Analytics />` in `app/layout.tsx` (zero‑config, privacy‑friendly).
- **Product analytics**: PostHog (self‑hostable) with anonymous by default
- **Errors**: Sentry for server/client error monitoring

## Configuration & environments

- `.env.local` for local dev, `.env` for CI; never commit secrets
- Key variables (Supabase path): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, service role for migrations only

## PWA (MVP) plan

- **Goals**: installable app, basic offline support for shell and recent pages, proper icons/splash, Lighthouse PWA pass. Keep code changes minimal.
- **Approach**: static Web App Manifest + icon set; minimal service worker via `next-pwa`; offline fallback page. No push notifications yet.

- **Files & structure**
  - `public/manifest.webmanifest`: name, short_name, start_url `/`, display `standalone`, theme/background colors, scope `/`, icons (192/512 + maskable 512).
  - `public/icons/` assets: `icon-192.png`, `icon-512.png`, `icon-512-maskable.png`, `apple-touch-icon.png`.
  - `src/app/layout.tsx`: add `metadata` entries `manifest: '/manifest.webmanifest'`, `themeColor` (light/dark), and link `apple-touch-icon`.
  - `src/app/offline/page.tsx`: lightweight offline fallback (logo, message, retry button).

- **Service worker & caching**
  - Use `next-pwa` to generate SW at build. Disable in dev.
  - Cache strategy (sane defaults, minimal custom rules):
    - App shell and static assets: `StaleWhileRevalidate`.
    - Images (`/_next/image`, `public/*`): `CacheFirst` with short max-age.
    - API/auth routes: bypass (network-only) to avoid stale auth.
    - Fallback to `/offline` on navigation failures.

- **Configuration changes**
  - `package.json`: add `next-pwa` dependency.
  - `next.config.ts`: wrap config with `withPWA({ dest: 'public', disable: process.env.NODE_ENV === 'development' })`.

- **Testing checklist**
  - Lighthouse PWA checks: installable, manifest valid, SW active.
  - Add to Home Screen works on iOS/Android; icon/splash look correct.
  - Offline navigation shows `/offline`; back online resumes normally.
  - Versioning: confirm old caches purge on new deploy (cache bust via `next-pwa` revisioning).

- **Future (not in MVP)**
  - Background sync for outgoing messages, push notifications, richer offline caches per conversation.

## Phased delivery plan

1. **Foundation**: auth, profile CRUD, shadcn/ui, dark mode, responsive layout
2. **Search & matching**: filters, rule‑based scoring, result lists
3. **Connections & messaging**: request/accept, realtime conversations
4. **Polish**: notifications, moderation tools, telemetry, accessibility audits

## Open questions

- Do we commit to Supabase for v1, or keep Prisma + NextAuth as the primary path?
- Which analytics/monitoring are acceptable from a privacy perspective?
- Do we support organization/team profiles in v1 or later?

---

This document describes the intended architecture for a Next.js + TypeScript application with shadcn/ui and dark mode, delivering a responsive Civic Match experience on desktop and mobile.


