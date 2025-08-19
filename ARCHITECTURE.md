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
- **Email system**: Resend + React Email for transactional and campaign emails
- **Scheduling**: Vercel Cron for automated email campaigns and background tasks
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
   │     ├─ Email system (Resend + React Email templates)
   │     ├─ Cron jobs (Vercel Cron for automated campaigns)
   │     └─ Validation (Zod)
   │
   ├─ Database (Postgres / Supabase) + email tracking tables
   ├─ Realtime (Supabase Realtime) for conversations & presence
   ├─ Storage (avatars, images) via Supabase Storage
   └─ Email infrastructure (Resend API + webhooks)
```

## Domain model (MVP)

- **User**: id, email, createdAt, onboarded
- **Profile**: userId, displayName, username, bio, location, availability, avatarUrl, values[], skills[], causes[], emailPreferences{}, weeklyMatchHistory{}
- **Connection**: id, requesterId, addresseeId, status(pending|accepted|declined|blocked), createdAt
- **Conversation**: id, participantIds[], createdAt, updatedAt
- **Message**: id, conversationId, senderId, text, attachments[], createdAt, readAt?
- **EmailLog**: id, userId, emailType, resendId, status, createdAt, data (separate table for analytics)
- **SavedSearch** (optional later): id, userId, filters, createdAt

Indexes focus on username, search facets (skills/causes), and conversationId for fast messaging.

## Feature modules

- **Auth & onboarding**: email magic link, optional social; guided setup of profile facets
- **Profiles**: view/edit profile; public profile at `/profile/[username]`
- **Matching & search**: filter by values, skills, causes; sort by a rule‑based score
- **Messaging**: 1:1 conversations; realtime updates; optimistic send
- **Connections**: request/accept/block; dashboard overview
- **Email system**: welcome emails, password resets, weekly reminders, matching suggestions
- **Notifications**: in‑app (toast/badge); email campaigns and transactional messages

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

### Database access summary and optimization plan

This section documents where the app hits the database (Supabase PostgREST) and how often, followed by safe, incremental optimizations that do not interrupt service.

#### Where we query (by component/page)
- Top bar (`src/components/TopBar.tsx`)
  - Profile cache refresh: up to 1–2 reads on auth becoming available and/or profile‑updated event
    - `profiles.select('username, data').eq('user_id', uid).maybeSingle()`
  - Realtime INSERT handler: 0–1 read per external incoming message (when not on `/messages`)
    - `conversations.select('id').eq('id', conversation_id).maybeSingle()`
  - Polling fallback (only when enabled):
    - Initial check: 1 read
    - Interval: 1 read every 12s
    - `messages.select('id, sender_id, created_at').gt('created_at', baseline).neq('sender_id', uid).order('created_at', { desc }).limit(1)`

- Explore (home) page (`src/app/page.tsx`)
  - Connections for current user: 1 read
    - `connections.select('addressee_id')`
  - Profiles feed (first page): 1 read per page fetch
    - `profiles.select('user_id, username, data, created_at') ...`
  - Ensure profile on first sign‑in: up to 1 read + 1 write (first‑time only)
    - `profiles.select('user_id').eq('user_id', user.id).limit(1)` then conditional `profiles.insert(...)`

- Messages list (`src/app/messages/page.tsx`)
  - Conversations list: 1 read
    - `conversations.select('id, updated_at, data')`
  - Participant profiles for conversations: 1 read
    - `profiles.select('user_id, username, data').in('user_id', [...])`
  - Recent messages for the active thread: 1 read per load/refresh
    - `messages.select('id, sender_id, created_at, data').eq('conversation_id', ...)`
  - Send message: 1 write per send
    - `messages.insert([...])`

- Message detail (`src/app/messages/[id]/page.tsx`)
  - Conversation metadata: 1 read
    - `conversations.select('data, updated_at').eq('id', ...)`
  - Other participant profile: 1 read
    - `profiles.select('username, data').eq('user_id', ...)`
  - Messages list: 1 read per load/refresh
    - `messages.select('id, sender_id, created_at, data').eq('conversation_id', ...)`
  - Send message: 1 write per send
    - `messages.insert([...])`

- Profiles view (browse + invite) (`src/app/profiles/page.tsx`)
  - My connections: 1 read
    - `connections.select('addressee_id')`
  - Profiles feed: 1 read per page fetch
    - `profiles.select('user_id, username, data') ...`
  - Count (for total): 1 head count read (exact)
    - `profiles.select('*', { count: 'exact', head: true })`
  - Invite workflow: up to 1–3 operations per invite
    - Check conversation: `conversations.select('id').contains('data->participantIds', ...)`
    - Create conversation if missing: `conversations.insert(...)` (write)
    - Insert invite message: `messages.insert({...})` (write)
    - Record/refresh connection: `connections.upsert(...)` (write)

- My profile (edit) (`src/app/profile/page.tsx`)
  - Load my profile: 1 read
    - `profiles.select('data').eq('user_id', user.id).single()`
  - Save profile: 1 write per save
    - `profiles.update({ data: ... }).eq('user_id', user.id)`
  - Avatar upload: Storage operation (not DB), then public URL retrieval

Notes
- Auth calls like `auth.getSession()`/`auth.getUser()` hit Supabase Auth, not PostgREST, but they still incur network requests.
- Realtime subscriptions maintain a websocket; DB reads happen only where noted above (e.g., validation on INSERT handler).

#### Minimization strategies (no service interruption)
- Reduce redundant profile fetches in `TopBar`
  - Keep the cached `displayName`/`avatarUrl` as the source of truth on first paint.
  - Trigger a single debounced refresh on auth change or explicit `profile-updated` events instead of multiple effects.

- Prefer `useAuth()` session data over repeated `auth.getUser()`/`auth.getSession()`
  - Read the `user.id` from the existing context to avoid extra Auth round‑trips inside effects (e.g., `TopBar` polling, invite flows).

- Make polling conditional and lighter
  - Disable polling when the Realtime channel is subscribed and healthy; enable only as a fallback (with exponential backoff) or increase interval to ≥60s.
  - Keep the `.limit(1)` pattern and guard by pathname as already implemented.

- Batch/merge reads where possible
  - Conversations + participant profiles: keep a single `IN (...)` fetch for profiles (already present) and avoid per‑participant lookups.
  - Profiles feed: use a single API route (server) that returns `{ items, nextCursor, myConnectionsSubset }` to avoid separate client reads.

- Avoid expensive exact counts on hot paths
  - Replace `profiles` exact counts with either omission (if not essential) or an approximate indicator (e.g., show until empty), or serve counts via a cached server endpoint.

- Shift list reads to server (RSC/route handlers) with HTTP caching
  - Move feed/conversation lists into server routes and apply `Cache-Control`/ISR where compatible with auth.
  - This reduces client round‑trips and enables response shaping (fewer over‑fetches).

- Index and query hygiene (already mostly in place)
  - Ensure `messages(created_at desc)`, `messages(sender_id)`, and `profiles(data GIN)` indexes exist and align with filters; avoid unindexed filters.
  - Keep `maybeSingle()`/`limit(1)` usage for point lookups.

- Session‑scoped in‑memory caches
  - Cache small sets (e.g., my connection addressee IDs) in memory for the session and refresh on change events to avoid re‑reads on every navigation.

All of the above can be rolled out incrementally, guarded by existing events (`auth-changed`, `profile-updated`) and without altering user‑visible behavior.

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
- Email variables: `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_WEBHOOK_SECRET`, `EMAIL_ENABLED`, `EMAIL_TEST_MODE`

## Email System (Resend + React Email)

Civic Match uses Resend as the primary email service provider combined with React Email for template creation, enabling transactional emails, user engagement campaigns, and automated lifecycle communications.

### Overview & Goals

- **Transactional emails**: Welcome messages, password resets, connection notifications
- **Engagement emails**: Weekly profile completion reminders, user matching suggestions
- **Automated campaigns**: Weekly matching emails to connect users with compatible collaborators
- **Developer experience**: Type-safe email templates using React components, consistent branding
- **Reliability**: Delivery tracking, bounce handling, and webhook-based event processing

### Technical Stack Integration

- **Email API**: Resend for delivery infrastructure and analytics
- **Template engine**: React Email for component-based email templates
- **Scheduling**: Vercel Cron (preferred) or Supabase Edge Functions for automated campaigns
- **Event tracking**: Resend webhooks for delivery status, opens, clicks, bounces
- **Authentication**: Integrate with Supabase Auth for password reset flows

### Email Types & Triggers

#### 1. Welcome Email (Immediate)
- **Trigger**: New user signup (email/password or Google OAuth)
- **Template**: `WelcomeEmail.tsx`
- **Content**: 
  - Personalized welcome message "Welcome [FirstName]!" (extracts first name from displayName)
  - CivicMatch logo (email-logo.png from https://civicmatch.app domain)
  - Numbered step guide with table-based layout for email client compatibility:
    1. Complete your profile → `/profile`
    2. Start exploring → `/` (main explore page)
    3. Connect and collaborate (simplified messaging info)
    4. Stay engaged (newsletter signup info)
  - Light gray "Explore Profiles" CTA button
  - Email signature with logo from "Iggy, CivicMatch"
  - All URLs point to production domain (https://civicmatch.app)
- **Implementation**: 
  - API route `/api/email/welcome` triggered after successful signup
  - Email/password: Called directly from `handleSignup()` function
  - Google OAuth: Called from `ensureProfileForCurrentUser()` when `isNewUser = true`
  - Uses production domain for all links and assets to avoid CORS issues

#### 2. Password Reset Email (Immediate)
- **Trigger**: User requests password reset via Supabase Auth
- **Template**: Custom HTML template in Supabase Dashboard
- **Content**:
  - Professional branding with hosted logo
  - DM Sans typography with email client fallbacks
  - Security-focused messaging with 24-hour expiration
  - Alternative copy-paste URL for accessibility
- **Implementation**: Supabase built-in email with customized template
- **Approach**: Single email system using only Supabase (no duplicate custom emails)

#### 3. Profile Completion Reminder (Weekly) ✅ IMPLEMENTED
- **Trigger**: Cron job checking incomplete profiles (0-90% complete, no recent reminders)
- **Template**: `ProfileReminderEmail.tsx`
- **Content**:
  - Personalized completion percentage with progress bar
  - Top 3 missing fields with importance explanations
  - Benefits showcase (Better Matches, More Connections, Project Opportunities)
  - Direct CTA to complete profile with edit icon
  - Encouragement message and signature from "Iggy, CivicMatch"
- **Implementation**: 
  - **Cron Schedule**: Tuesday 12:12 PM UTC (`12 12 * * 2`)
  - **Targeting Logic**: Profiles 0-90% complete, email preferences enabled, no reminder in last 7 days
  - **Completion Calculation**: Weighted scoring system (15 points for core fields, 5-10 for optional)
  - **Rate Limiting**: Sequential processing with 600ms delays (1.67 req/sec, under Resend's 2 req/sec limit)
  - **Security**: CRON_SECRET authorization header verification
- **Files Created**: 
  - `src/lib/email/services/ProfileCompletionService.ts` - Core completion logic
  - `src/app/api/cron/weekly-reminders/route.ts` - Cron endpoint
  - `src/app/api/test/profile-reminders/route.ts` - Testing endpoint (dev only)
  - `vercel.json` - Cron configuration

#### 4. Weekly Matching Email (Weekly)
- **Trigger**: Cron job for active users without recent connections
- **Template**: `WeeklyMatchEmail.tsx`
- **Content**:
  - **Single focused match**: Simplified to showcase one carefully selected user
  - **Complete profile display**: All available profile sections (Skills, What I'm Known For, What I'm Focused On, Long-term Strategy, Work Style, What do I need help with)
  - **Visual profile cards**: Profile pictures for both current user and matched user
  - **Conditional rendering**: Only shows sections that have content to avoid empty panels
  - **Match reasoning**: Shared values/skills/causes with detailed explanations
  - **Clear CTAs**: Send Message and View Profile buttons with Lucide icons
  - **Professional branding**: DM Sans font, CivicMatch colors, signature from "Iggy, CivicMatch"
- **Implementation**: Weekly cron → matching algorithm → batch email send
- **Future enhancement**: Google Meet event creation for suggested connections

### Database Schema Extensions

**Approach**: Minimize schema complexity by leveraging existing `profiles.data` JSONB for user preferences and matching history, while keeping email logs separate for performance and analytics.

#### Email Logs Table (Separate - Required for Performance)
```sql
-- Email tracking for analytics and delivery monitoring
create table if not exists public.email_logs (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  email_type   text not null, -- welcome|password_reset|profile_reminder|weekly_match
  resend_id    text, -- Resend email ID for tracking
  status       text not null default 'sent', -- sent|delivered|opened|clicked|bounced|failed
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  data         jsonb not null default '{}' -- template_version, recipient_email, etc.
);
create index if not exists email_logs_user_id_idx on public.email_logs(user_id);
create index if not exists email_logs_type_idx on public.email_logs(email_type);
create index if not exists email_logs_resend_id_idx on public.email_logs(resend_id);
create index if not exists email_logs_created_at_idx on public.email_logs(created_at desc);
```

#### Extended Profiles Data Schema
```json
// Enhanced profiles.data structure
{
  // Existing profile fields
  "displayName": "Ada Lovelace",
  "bio": "I connect data and policy for climate innovation.",
  "location": { "city": "London", "country": "UK" },
  "tags": ["Social Entrepreneur", "Policy Expert"],
  "values": ["Integrity", "Impact", "Curiosity"],
  "skills": ["Data Science", "Policy", "Product"],
  "causes": ["Climate", "Civic Tech"],
  "avatarUrl": "https://example.com/avatar.jpg",
  
  // Additional profile sections (for comprehensive email display)
  "fame": "Built data platforms for 3 climate NGOs, featured in Tech for Good",
  "aim": [{ 
    "title": "Scale climate data accessibility across Europe", 
    "summary": "Focus on policy integration" 
  }],
  "game": "Long-term: establish climate data consortium with EU backing",
  "workStyle": "Collaborative, weekly check-ins, values-driven approach",
  "helpNeeded": "Seeking technical co-founder and climate policy advisor",
  
  // Email preferences (replaces user_email_preferences table)
  "emailPreferences": {
    "weeklyMatchingEnabled": true,
    "profileRemindersEnabled": true,
    "connectionNotifications": true,
    "frequency": "weekly",
    "preferredTime": "09:00",
    "timezone": "America/New_York"
  },
  
  // Weekly matching history (replaces weekly_match_history table)
  "weeklyMatchHistory": {
    "sentMatches": {
      "2024-01": ["uuid1", "uuid2", "uuid3"],
      "2024-02": ["uuid4", "uuid5"]
    },
    "lastSentWeek": "2024-02",
    "totalSent": 5
  }
}
```

#### Design Rationale: JSONB vs Separate Tables

**Email Preferences → JSONB** ✅
- **Why**: One-to-one with user, infrequent queries, simple booleans, schema flexibility
- **Queries**: `profiles.data->>'emailPreferences'->>'weeklyMatchingEnabled' = 'true'`
- **Updates**: `UPDATE profiles SET data = jsonb_set(data, '{emailPreferences,weeklyMatchingEnabled}', 'false') WHERE user_id = $1`

**Weekly Match History → JSONB** ✅
- **Why**: Low volume (12-20 UUIDs per month), primary use is duplicate prevention
- **Queries**: `profiles.data->'weeklyMatchHistory'->'sentMatches'->'2024-02' ? 'target-uuid'`
- **Updates**: Append to monthly array, simple deduplication logic

**Email Logs → Separate Table** ✅
- **Why**: High volume, time-series analytics, frequent webhook updates, retention policies
- **Queries**: Complex aggregations, date ranges, delivery analytics
- **Performance**: Dedicated indexes, efficient pagination, analytics queries

This hybrid approach **reduces schema complexity by 66%** (3 tables → 1 table) while maintaining query performance where it matters most.

### File Structure & Implementation

```
src/
  lib/
    email/
      resend.ts           # Resend client configuration
      templates/          # React Email templates
        WelcomeEmail.tsx
        PasswordResetEmail.tsx
        ProfileReminderEmail.tsx
        WeeklyMatchEmail.tsx
        shared/
          Layout.tsx      # Common email layout with DM Sans font
          Header.tsx      # Email header with inline SVG logo
          Footer.tsx      # Unsubscribe links
          Icons.tsx       # Lucide icons as React components for emails
        index.ts          # Barrel exports for templates
      services/
        EmailLogService.ts # Email logging with Supabase (anon key + RLS)
        EmailService.ts   # Email sending abstraction
        MatchingService.ts # User matching logic for emails
      utils/
        emailValidation.ts # Email content validation
  app/
    api/
      webhooks/
        resend/
          route.ts        # Webhook handler for email events
      email/
        send/
          route.ts        # Manual email sending endpoint
        test/
          route.ts        # Test email sending (dev only)
      cron/
        weekly-reminders/
          route.ts        # Profile completion reminders
        weekly-matching/
          route.ts        # Weekly user matching emails
  types/
    email.ts             # Email-related TypeScript types
```

### Environment Configuration

Add to `.env.local`:
```bash
# Resend Configuration
RESEND_API_KEY=re_xxxxxxxxxxxx
RESEND_FROM_EMAIL=noreply@civicmatch.app
RESEND_WEBHOOK_SECRET=whsec_xxxxxxxxxxxx

# Email Settings
EMAIL_ENABLED=true
EMAIL_TEST_MODE=false # Set to true in development

# Note: Uses existing NEXT_PUBLIC_SUPABASE_ANON_KEY for email logging
# No service role needed - safer approach with proper RLS policies
```

### Implementation Phases

#### Phase 1: Core Infrastructure (MVP)
1. **Setup Resend integration**
   - Install `resend` and `@react-email/components`
   - Configure Resend client with API key
   - Create base email layout components
   - Add email logs table migration

2. **Welcome email implementation**
   - Create `WelcomeEmail.tsx` template
   - Integrate with auth signup flow
   - Test email delivery and tracking

3. **Password reset integration**
   - Override Supabase Auth email templates
   - Create custom `PasswordResetEmail.tsx`
   - Test reset flow end-to-end

#### Phase 2: Automated Campaigns
1. **Weekly profile reminders**
   - Create cron job endpoint
   - Implement profile completion analysis
   - Design and test `ProfileReminderEmail.tsx`
   - Add user preferences for email frequency

2. **Email preferences management**
   - Add preferences to user profile page
   - Implement unsubscribe handling
   - Create preference update API

#### Phase 3: Matching & Advanced Features
1. **Weekly matching emails**
   - Implement matching algorithm for email suggestions
   - Create `WeeklyMatchEmail.tsx` with profile previews
   - Add match history tracking to prevent duplicates
   - Test and optimize matching logic

2. **Email analytics & optimization**
   - Implement webhook event processing
   - Add email performance metrics
   - A/B testing infrastructure for subject lines
   - Bounce and unsubscribe handling

### Cron Job Strategy

#### Vercel Cron (Preferred)
- **Advantages**: Integrated with Next.js deployment, reliable scheduling, zero additional infrastructure
- **Configuration**: `vercel.json` cron configuration
- **Implementation**: API routes at `/api/cron/[job-name]`
- **Security**: Vercel-signed headers for authentication

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/weekly-reminders",
      "schedule": "12 12 * * 2" // Tuesday 12:12 PM UTC
    },
    {
      "path": "/api/cron/weekly-matching",
      "schedule": "0 10 * * 3" // Wednesday 10 AM UTC (planned)
    }
  ]
}
```

#### Supabase Edge Functions (Alternative)
- **Advantages**: Database proximity, direct Postgres access, shared environment
- **Configuration**: Supabase CLI deployment
- **Implementation**: TypeScript functions with pg_cron integration
- **Security**: Supabase service role authentication

### Email Template Design Principles

1. **Consistent branding**: Shared layout with CivicMatch colors and typography
2. **Mobile-first**: Responsive design for various email clients  
3. **Accessibility**: High contrast, clear hierarchy, alt text for images
4. **Personalization**: Dynamic content based on user profile and activity
5. **Clear CTAs**: Single primary action per email with prominent buttons
6. **Unsubscribe compliance**: Clear opt-out options for all campaign emails
7. **Email client compatibility**: Avoid CSS features that don't work across email clients:
   - No `hover:` pseudo-classes (not supported in most email clients)
   - No CSS Grid or Flexbox gap properties (use explicit margins instead)
   - No `space-y-*` utilities (require CSS selectors not available in email)
   - Use inline styles and email-safe CSS properties
   - Prefer Table/Row/Column layout over modern CSS Grid/Flexbox

### Security & Privacy Considerations

1. **Email address validation**: Validate all recipient addresses before sending
2. **Rate limiting**: Prevent abuse of email sending endpoints
3. **Webhook security**: Verify Resend webhook signatures
4. **Data privacy**: Minimal data collection, clear privacy policy links
5. **Unsubscribe handling**: Honor opt-out requests immediately
6. **Bounce management**: Automatically suppress bounced addresses

### Monitoring & Analytics

1. **Email delivery tracking**: Monitor delivery rates, bounce rates, open rates
2. **Template performance**: A/B testing for subject lines and content
3. **User engagement**: Track clicks, profile completions from emails
4. **Error monitoring**: Alert on email sending failures
5. **Cost tracking**: Monitor Resend usage and costs

### Alternative Approaches Considered

#### Resend vs. Other Providers
**Pros of Resend:**
- Developer-first API with excellent TypeScript support
- React Email integration for component-based templates
- Built-in analytics and webhook system
- Competitive pricing with generous free tier
- Good deliverability reputation

**Cons:**
- Newer service with smaller ecosystem
- Less enterprise features compared to SendGrid/Mailgun
- Limited template editor (relies on React Email)

#### Template Engine Alternatives
**React Email (Chosen):**
- Type-safe templates with React components
- Excellent developer experience
- Version control friendly
- Component reusability

**Traditional HTML Templates:**
- More widely supported
- Easier for non-developers to edit
- Better email client compatibility
- Less modern development experience

#### Scheduling Alternatives
**Vercel Cron (Preferred):**
- Zero additional infrastructure
- Integrated with deployment
- Reliable scheduling

**External Services (Considered):**
- More complex setup
- Additional cost and dependencies
- Better for complex scheduling needs

### Performance Considerations

1. **Batch processing**: Send multiple emails efficiently using Resend batch API
2. **Template caching**: Cache compiled email templates
3. **Database optimization**: Efficient queries for user segmentation
4. **Rate limiting**: Respect Resend API limits and implement queuing
5. **Webhook processing**: Async webhook event processing to avoid timeouts

### Implementation Lessons Learned

#### Welcome Email System Implementation (Current Status)
1. **Production Setup Complete**: Full welcome email system implemented and working:
   - **EmailService**: Complete service class with logging, error handling, and template rendering
   - **Welcome API Route**: `/api/email/welcome` handles server-side email sending with user validation
   - **Auth Integration**: Automatic email sending on signup (both email/password and Google OAuth)
   - **Production URLs**: All email links and assets use `https://civicmatch.app` domain
   - **Email Logging**: Supabase RLS disabled on `email_logs` table to allow server-side logging

2. **Email Template Fixes Applied**:
   - **Logo Solution**: Uses `email-logo.png` from production domain with 100% border-radius
   - **Header Personalization**: "Welcome [FirstName]!" instead of full name + emoji
   - **Number Alignment**: Table-based layout with centered numbers using `margin: 0 auto`
   - **Clean Layout**: Removed "Learn about messaging" and "View community guidelines" text
   - **CTA Styling**: Light gray background on "Explore Profiles" button
   - **Signature Logo**: Added CivicMatch logo below signature

3. **Cross-Origin Issues Resolved**:
   - **Base URL Strategy**: All email templates use production domain (`https://civicmatch.app`)
   - **Asset Loading**: Email images load from live domain to avoid `net::ERR_BLOCKED_BY_RESPONSE`
   - **Link Targeting**: Profile and explore links direct users to production app

#### Email Template Development
1. **React Email Limitations**: Email clients have strict CSS limitations that require careful consideration:
   - Avoid modern CSS features like CSS Grid, Flexbox gap, space-y utilities
   - Use Table/Row/Column components for reliable layout across email clients
   - Replace hover states with static styling (emails don't support hover reliably)
   - Use explicit margin classes instead of space utilities
   - **Number Centering**: Use `margin: 0 auto` instead of `display: flex` for email compatibility

2. **Profile Data Integration**: WeeklyMatchEmail template successfully integrates all profile fields:
   - Conditional rendering prevents empty sections from appearing
   - Comprehensive profile display includes: skills, fame, aim, game, workStyle, helpNeeded
   - Visual hierarchy with Lucide icons maintains consistency with web app
   - Profile pictures enhance personalization and engagement

3. **Template Architecture**: 
   - Shared components (Layout, Header, Icons) ensure consistency
   - Barrel exports simplify imports across the email system
   - DM Sans font integration provides brand consistency
   - **Image Strategy**: Use production domain URLs instead of base64 for better performance and reliability

#### Database & Security Decisions
1. **Supabase Integration**: Successfully implemented secure email logging without service role:
   - Uses `NEXT_PUBLIC_SUPABASE_ANON_KEY` with RLS policies for security
   - EmailLogService provides abstraction layer for database operations
   - Server-side validation prevents abuse while maintaining security

2. **Schema Optimization**: JSONB approach reduces complexity while maintaining performance:
   - Email preferences and match history moved to profiles.data JSONB
   - Separate email_logs table maintained for analytics and high-volume operations
   - 66% reduction in required tables (3 → 1) without performance compromise

#### Profile Reminder Email Implementation (December 2024)

1. **Production Implementation Complete**: Fully functional profile reminder system:
   - **ProfileCompletionService**: Intelligent completion calculation with weighted scoring
   - **Cron Endpoint**: `/api/cron/weekly-reminders` with proper security and batch processing
   - **Testing Infrastructure**: `/api/test/profile-reminders` for development testing
   - **Vercel Cron Integration**: Automated scheduling with CRON_SECRET authentication

2. **Profile Completion Logic Lessons**:
   - **Weighted Scoring**: Essential fields (displayName, bio, skills) worth 15 points each
   - **Flexible Thresholds**: Initially 20-85%, refined to 0-90% to include more users
   - **Smart Filtering**: Only targets users with email preferences enabled and no recent reminders
   - **Field Analysis**: Handles both string and array formats for skills/tags fields
   - **Special Handling**: Custom logic for aim array structure validation

3. **Cron Job Best Practices**:
   - **Authorization**: Proper CRON_SECRET verification prevents unauthorized access
   - **Rate Limiting**: Sequential processing with 600ms delays to respect Resend's 2 req/sec limit
   - **Error Handling**: Graceful failure handling with detailed logging
   - **Monitoring**: Comprehensive response data for debugging and analytics
   - **Environment Safety**: Development-only test endpoints with production guards

4. **Database Query Optimization**:
   - **Efficient Filtering**: Single query fetches all profiles, then filters in-memory
   - **Recent Reminder Check**: Separate queries to email_logs prevent duplicate sends
   - **JSONB Flexibility**: Leverages existing profile.data structure without schema changes
   - **Email Logging**: Proper tracking with template versions and recipient data

5. **Testing and Debugging Insights**:
   - **Preview Limitations**: Initially showed only 3 profiles due to `.slice(0, 3)` limitation
   - **Threshold Issues**: Too-restrictive completion thresholds excluded most users
   - **Singleton Patterns**: Lazy initialization prevents environment variable issues during testing
   - **Postman Testing**: Clear documentation for manual API testing workflows

6. **Schedule Configuration**:
   - **Flexible Timing**: Easy cron schedule changes via vercel.json
   - **UTC Considerations**: All times in UTC with clear timezone documentation
   - **Production Impact**: Tuesday 12:12 PM UTC chosen for optimal global coverage

7. **Rate Limiting Challenges & Solutions**:
   - **Problem Discovered**: Resend free plan limits to 2 requests per second
   - **Initial Issue**: Parallel batch processing (10 emails simultaneously) caused 10 failures, 4 successes
   - **Root Cause**: Sending multiple emails in parallel exceeded rate limits despite 1-second batch delays
   - **Solution Implemented**: 
     - **Sequential Processing**: Changed from parallel batches to one-by-one email sending
     - **Precise Timing**: 600ms delays between emails (1.67 req/sec, safely under 2 req/sec limit)
     - **Retry Logic**: Added exponential backoff for rate limit errors (1s, 2s, 4s delays)
     - **Graceful Degradation**: Maintains delays even on errors to preserve rate limiting
   - **Performance Impact**: 14 emails now take ~8.4 seconds instead of failing
   - **Alternative Considered**: Upgrading to Resend paid plan for higher limits

This email system architecture provides a solid foundation for user engagement while maintaining developer productivity and system reliability. The phased approach allows for incremental implementation and testing of each component.

### Password Reset Implementation Lessons Learned

#### Initial Approach and Problems
The initial implementation attempted to create a dual email system:
1. **Supabase's built-in `resetPasswordForEmail()`** for secure token generation
2. **Custom React Email template** sent via Resend for branding

**Issues Encountered:**
- **Duplicate emails**: Users received both Supabase's email AND our custom email
- **Token mismatch**: Custom email used placeholder URLs, not Supabase's secure tokens
- **Session handling**: Reset page couldn't properly detect password recovery sessions
- **Spam detection**: Security-focused language triggered email spam filters

#### Final Solution: Supabase-Only Approach

**Architecture Decision:**
- **Single email system**: Use only Supabase's built-in email infrastructure
- **Custom template**: Replace Supabase's default template with branded HTML
- **Hosted assets**: Serve logo via `/api/brand/logo` endpoint for email embedding
- **Typography**: DM Sans with progressive fallbacks for email client compatibility

**Implementation Details:**
```javascript
// Simplified password reset flow
const { error } = await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: `${window.location.origin}/auth/reset`
});
```

**Custom Template Features:**
- **Branded design**: CivicMatch colors, logo, and typography
- **Email client compatibility**: Works across Gmail, Apple Mail, Outlook, etc.
- **Font integration**: DM Sans with fallbacks for older clients
- **Spam-safe language**: Avoided phishing-trigger phrases
- **Responsive design**: Mobile-optimized layout

**Technical Components:**
1. **Logo hosting**: `/api/brand/logo` serves email-optimized PNG with caching headers
2. **Template variables**: Uses Supabase's `{{ .ConfirmationURL }}` and `{{ .SiteURL }}`
3. **Session detection**: Enhanced auth state listener for `PASSWORD_RECOVERY` events
4. **UI improvements**: Password visibility toggles, proper loading states

#### Key Lessons Learned

1. **Avoid Dual Email Systems**: 
   - **Problem**: Complex to maintain, confuses users, higher spam risk
   - **Solution**: Choose one email provider and customize it thoroughly

2. **Leverage Platform Features**: 
   - **Problem**: Rebuilding authentication flows from scratch
   - **Solution**: Supabase's email templates are fully customizable and secure

3. **Email Client Compatibility**: 
   - **Problem**: Modern CSS doesn't work in all email clients
   - **Solution**: Progressive enhancement with web fonts and fallbacks

4. **Asset Hosting for Emails**: 
   - **Problem**: Email templates need external asset URLs
   - **Solution**: Simple API endpoints with proper caching headers

5. **Spam Filter Awareness**: 
   - **Problem**: Security language triggers spam detection
   - **Solution**: Use softer, conversational language while maintaining clarity

6. **Authentication Session Handling**: 
   - **Problem**: Supabase's password reset uses URL fragments and auth events
   - **Solution**: Proper auth state listeners and URL parameter detection

**Final Architecture Benefits:**
- ✅ **Single email** per password reset (no duplicates)
- ✅ **Professional branding** with logo and custom fonts
- ✅ **Secure tokens** using Supabase's built-in system
- ✅ **Reliable delivery** through Supabase's email infrastructure
- ✅ **Low maintenance** - no custom email service to manage
- ✅ **Spam-safe** language and design patterns

This approach demonstrates that sometimes the best solution is to work with platform capabilities rather than building parallel systems.

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
4. **Email system**: welcome emails, password resets, weekly campaigns, user matching
5. **Polish**: notifications, moderation tools, telemetry, accessibility audits

## Open questions

- Do we commit to Supabase for v1, or keep Prisma + NextAuth as the primary path?
- Which analytics/monitoring are acceptable from a privacy perspective?
- Do we support organization/team profiles in v1 or later?

---

This document describes the intended architecture for a Next.js + TypeScript application with shadcn/ui and dark mode, delivering a responsive Civic Match experience on desktop and mobile.


