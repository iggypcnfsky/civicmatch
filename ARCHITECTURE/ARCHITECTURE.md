## Civic Match — Architecture

### Product overview

Civic Match helps changemakers find the right co‑founders and collaborators for impact.

- **Explore (default)**: Search and filter people by values, skills, and causes in a masonry grid
- **Connect**: Built‑in messaging to start conversations quickly
- **Showcase**: Personal profile highlighting mission, skills, and experience
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
   │     ├─ Email-to-conversation bridge (/api/messages/start) ✅ NEW
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
- **Profiles**: view/edit profile; public profile at `/profile/[username]` (see [MYPROFILE.md](../MYPROFILE.md) for detailed edit view implementation)
- **Matching & search**: filter by values, skills, causes; sort by a rule‑based score
- **Messaging**: 1:1 conversations with modern UI, keyboard shortcuts, and mobile optimization (see [MESSAGES.md](./MESSAGES.md))
- **Connections**: request/accept/block; dashboard overview
- **Email system**: welcome emails, password resets, weekly reminders, matching suggestions with integrated messaging
- **Notifications**: in‑app (toast/badge); email campaigns and transactional messages

## Matching approach 

### Current Implementation (Random MVP) ✅ DEPLOYED
**Status**: Production-ready random matching algorithm deployed for weekly matching emails.

**Algorithm**: Simple random selection with basic filtering:
- **Eligibility**: Users with `displayName` or `username` (loosened for early adoption)
- **Match Score**: Random integer between 70-100 for engagement
- **Duplicate Prevention**: Uses `profiles.data.weeklyMatchHistory` to avoid repeat matches
- **Match Reasons**: Generic encouragement messages for all matches

**Code Location**: `src/lib/email/services/MatchingService.ts`
```typescript
calculateMatchScore(currentUser, candidateUser): number {
  // Random score between 70-100 for MVP
  return Math.floor(Math.random() * 31) + 70;
}
```

### Future Implementation (AI-Powered Matching) 🚧 PLANNED
**Approach**: Advanced rule-based scoring with AI enhancement:

\[ score(C,S) = w_v · overlap(values) + w_s · overlap(skills) + w_c · overlap(causes) + w_l · geoAffinity \]

- **Base weights**: `w_v = w_s = w_c = 1.0`, `w_l = 0.5` (if location provided)
- **Overlap calculation**: Jaccard similarity for each facet array
- **LLM Integration**: OpenAI/AI analysis for semantic matching and personalized reasons
- **Learning system**: Connection accept rates inform weight adjustments
- **Stricter eligibility**: Require complete profiles (bio, skills, values, causes)

**Planned Enhancements**:
- Semantic similarity using embeddings for skills/values/causes
- AI-generated personalized match explanations
- Collaborative filtering based on user interaction history
- Geographic proximity scoring with timezone consideration
- Activity recency weighting (recent logins, profile updates)

## UI/UX architecture ✅ ENHANCED

- **Design tokens**: Tailwind theme extended in `tailwind.config` (colors, spacing, radii)
- **Components**: shadcn/ui primitives composed into Civic Match components (e.g., `Logo`, `ProfileCard`, Filters UI)
  - Foundations: `Button`, `Input`, `Textarea`, `Select`, `Badge`, `Avatar`, `Dialog`, `Sheet`, `Tabs`
  - Domain: `ProfileCard`, `FacetChips`, `MatchList`, `ConversationList`, `MessageBubble`, `ConnectionCard`
- **Loading States**: Comprehensive skeleton UI system with pulse animations for all major components
  - **Authentication Loading**: Full-page skeleton during auth resolution
  - **Profile Loading**: Card-based skeleton with avatar, text, and section placeholders
  - **Composer Loading**: Disabled states with visual feedback during interactions
- **Dark mode**: `next-themes` with `ThemeProvider`; store preference in `localStorage`
- **Responsiveness**: mobile‑first; critical layouts use `grid`/`flex` with safe fallbacks
- **A11y**: keyboard focus states, Radix primitives, color contrast ≥ 4.5:1, loading state announcements

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

**⚠️ For complete Google Maps integration architecture, location-based discovery features, and implementation details, see [EXPLORE.md](./EXPLORE.md)**

#### Current Implementation (Pill List)
- Default view after login at `/`
- Horizontal scrolling pills showing avatar + name
- Desktop: sticky filter panel on the right with pill‑styled controls (each with Lucide icon); Favorites toggle uses accent‑filled pill when active. Offset below the sticky top bar
- Mobile: sticky bottom "Filters" pill that opens a bottom‑sheet with larger (h‑12) pill controls, including a Favorites toggle; hamburger removed
- Profile pills: rounded corners, subtle shadow, show name only
- Clicking a profile pill navigates to the Profiles view (`/profiles`) to show a full profile

#### Planned Enhancement (Interactive World Map) 🚧 PLANNED
**Status**: Detailed implementation plan available in [EXPLORE.md](./EXPLORE.md)

**Vision**: Transform discovery from chronological list to geographic exploration:
- **Full-screen Google Maps**: Interactive world map showing users positioned by location
- **Location-based Pills**: User avatars + names positioned according to profile location data
- **Geographic Discovery**: "Who's building impact near me?" and global community visualization
- **Enhanced Filtering**: Maintain existing filters plus location-based options (near me, by country, radius-based)
- **Clustering**: Intelligent grouping for dense urban areas
- **Mobile Optimization**: Touch-friendly map interactions with bottom sheet controls

**Key Features Planned**:
- Google Maps JavaScript API integration with custom dark mode styling
- Geocoding service for location coordinate resolution
- Viewport-based profile loading for performance
- Progressive enhancement maintaining backward compatibility
- Privacy-aware location sharing with user control

**Implementation**: See [EXPLORE.md](./EXPLORE.md) for detailed architecture, technical specifications, and 3-phase implementation plan

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
### Profiles view ✅ OPTIMIZED
- Uses the same global top bar
- **Authentication Loading**: Shows skeleton UI during auth resolution instead of blank screen (eliminates 1s delay)
- **Debounced Profile Loading**: Prevents multiple rapid profile loads with 150ms debounce and race condition protection
- **Optimized Auth Context**: Uses `useAuth()` context directly instead of redundant `supabase.auth.getUser()` calls
- Left column shows a flexible grid of panels (no fixed 1/3 or 2/3 rules). Titles drop legacy prefixes for clarity. Panels:
  - NAME: full‑bleed image (object‑cover, fixed 400px height) with name label; adjacent basic info (location, tags, bio, links)
  - Skills & What I Do (chips)
  - What I'm Known For (auto‑links URLs)
  - What I'm Focused On
  - Long‑term Strategy
  - Work Style (new)
  - What do I need help with (new)
  - Portfolio removed for MVP
- **Loading States**: Skeleton animation during profile transitions, disabled buttons during loading
- Consistent sizing via flexible grid (`auto-rows-fr`) and panel `min-height` where needed.
- Right column: sticky Invite composer with pill Skip/Invite; Skip loads another profile instead of alerting.
- Mobile: bottom composer; extra bottom padding prevents the last panel from being obscured.
- Desktop: right column hosts a sticky Invite composer panel sized to half the viewport height; pill‑shaped Skip and Invite buttons with icons
- Mobile: bottom fixed composer with full‑width textarea; pill‑shaped buttons below (Skip left, Invite right)

### My Profile (edit) view

**⚠️ For complete implementation details, layout architecture, account management features, and responsive design patterns, see [MYPROFILE.md](../MYPROFILE.md)**

- Mirrors public profile panels with one input per panel. Panels: Basics, Email Preferences, Account Actions, Skills & What I Do, What I'm Known For, What I'm Focused On (mapped to first AIM item), Long‑term Strategy, Work Style, What do I need help with.
- Portfolio and Custom Sections removed.
- Inputs include helpful placeholders with guidance and examples.
- Buttons follow the pill system; Basics actions like "Change Picture" and "Add link" are muted pill buttons with icons.
- Desktop: header Preview/Save as pills; Account Actions panel with Reset Password/Logout/Delete Account. Mobile: sticky bottom Save only; other actions in Account Actions panel.

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
  profiles/
    page.tsx              // Browse all profiles
    [userId]/page.tsx     // Individual profile view ✅ NEW
  events/
    page.tsx              // Events (user + discovered) ✅ NEW
  messages/
    page.tsx              // Conversations list + active thread (desktop split)
    [id]/page.tsx         // Full‑screen chat on mobile; global top bar shows a back arrow
    start/page.tsx        // Email-to-conversation bridge page ✅ NEW
  api/
    auth/
      delete-account/route.ts      // Account deletion endpoint ✅ NEW
    messages/
      start/route.ts      // Email-to-conversation creation ✅ NEW
    calendar/
      download/[eventId]/route.ts  // ICS file downloads
    cron/
      weekly-matching/route.ts     // Weekly match emails
      weekly-reminders/route.ts    // Profile completion reminders
    email/
      welcome/route.ts    // Welcome email sending
    test/
      weekly-matching/route.ts     // Development testing
      profile-reminders/route.ts   // Development testing
    webhooks/
      resend/route.ts     // Resend webhook handler
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
- **Client**: browser client in `src/lib/supabase/client.ts` configured with stable auth options (`persistSession`, `autoRefreshToken`, `detectSessionInUrl`) and a dedicated `storageKey` (`your_app.supabase.auth`). A global `AuthProvider` wraps the app and derives auth from `getSession()` and `onAuthStateChange`, exposing `useAuth()`.
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

## Messaging System

**⚠️ For comprehensive messaging system documentation including UI design, message composer features, keyboard shortcuts, mobile optimization, and implementation details, see [MESSAGES.md](./MESSAGES.md)**

### High-Level Overview

- **Architecture**: Real-time 1:1 messaging with Supabase Realtime
- **Layout**: Desktop split-view (conversations + active chat) and mobile full-screen
- **Features**: Optimistic updates, profile integration, advanced message composer
- **UI Design**: Modern minimal interface with consistent rounded edges
- **Mobile Optimization**: Zoom prevention, keyboard shortcuts, touch-friendly interactions

### Core Components

- **Desktop Interface** (`/messages`): Split layout with conversation list and active chat
- **Mobile Interface** (`/messages/[id]`): Full-screen chat experience
- **Message Composer**: Multi-line input with Enter to send, Cmd/Ctrl+Enter for new lines
- **Profile Integration**: Clickable avatars navigate to individual profile pages
- **Real-time Updates**: Foundation for live messaging with optimistic UI updates

### Email-to-Conversation Integration ✅ IMPLEMENTED

**Bridge Flow**: Email → `/messages/start` → `/messages/[conversationId]`

**Key Features**:
- Direct conversation creation from weekly match emails
- Smart conversation detection (create/reuse existing)
- User-friendly loading states and error handling
- Connection tracking for analytics
- Mobile-compatible experience

**Implementation**: See [MESSAGES.md](./MESSAGES.md) for detailed technical implementation, database operations, and user experience flows.

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

- Individual profile view (`src/app/profiles/[userId]/page.tsx`) ✅ NEW
  - Single profile: 1 read
    - `profiles.select('*').eq('user_id', userId).single()`
  - Direct message navigation to `/messages`
  - Static profile display with all sections (bio, skills, causes, work style, etc.)
  - Client-side data fetching with loading states and error handling

- My profile (edit) (`src/app/profile/page.tsx`) - See [MYPROFILE.md](../MYPROFILE.md) for complete implementation
  - Load my profile: 1 read
    - `profiles.select('data').eq('user_id', user.id).single()`
  - Save profile: 1 write per save
    - `profiles.update({ data: ... }).eq('user_id', user.id)`
  - Avatar upload: Storage operation (not DB), then public URL retrieval
  - Delete account: 1 delete + API call
    - `profiles.delete().eq('user_id', user.id)` + `/api/auth/delete-account`

Notes
- Auth calls like `auth.getSession()`/`auth.getUser()` hit Supabase Auth, not PostgREST, but they still incur network requests.
- Realtime subscriptions maintain a websocket; DB reads happen only where noted above (e.g., validation on INSERT handler).

#### Minimization strategies (no service interruption) ✅ IMPLEMENTED
- **Reduce redundant profile fetches in `TopBar`** ✅ COMPLETED
  - Keep the cached `displayName`/`avatarUrl` as the source of truth on first paint.
  - Trigger a single debounced refresh on auth change or explicit `profile-updated` events instead of multiple effects.

- **Prefer `useAuth()` session data over repeated `auth.getUser()`/`auth.getSession()`** ✅ COMPLETED
  - **Profiles Page Optimized**: Eliminated 2 redundant `supabase.auth.getUser()` calls per page load
  - **Direct Context Usage**: Use `user.id` from `useAuth()` context instead of API calls
  - **Removed State Duplication**: Eliminated `currentUserId` state variable, use `user.id` directly
  - **Performance Impact**: Faster initial load, reduced network traffic, improved reliability

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

### Profile Loading Optimizations ✅ IMPLEMENTED

**Problem Solved**: Multiple profile loading, 1-second authentication delay, race conditions

#### **Debounced Loading System**
- **150ms debounce delay** prevents rapid successive profile loads
- **Duplicate prevention** using `lastLoadedProfileRef` to avoid loading same profile multiple times
- **Timeout management** with cleanup on unmount and navigation
- **Centralized profile building** with consistent data transformation

#### **Authentication Loading States**
- **Skeleton UI during auth resolution** instead of blank screen (eliminates 1s perceived delay)
- **Progressive loading indicators** with pulse animations
- **Conditional rendering** hides profile sections during loading
- **Disabled interactions** during loading states to prevent errors

#### **useEffect Dependency Optimization**
- **Reduced re-renders** by optimizing dependency arrays
- **Loading state guards** prevent unnecessary effect executions
- **Refresh parameter handling** for forced profile reloads
- **Race condition prevention** with loading state checks

#### **Performance Impact**
- **Eliminated 1-second blank screen** during initial page load
- **Prevented profile flickering** during navigation and skip actions
- **Reduced API calls** by 2 requests per page load (auth optimization)
- **Smoother user experience** with consistent loading animations

#### **Technical Implementation**
```typescript
// Debounced loading function
const loadProfileWithDebounce = useCallback((profileData: ViewProfile, userId: string) => {
  if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
  if (lastLoadedProfileRef.current === userId) return;
  
  setIsLoadingProfile(true);
  loadingTimeoutRef.current = setTimeout(() => {
    // Set profile data and animate
  }, 150);
}, []);

// Auth loading state
if (isAuthenticated === null) {
  return <SkeletonUI />; // Instead of null
}
```

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

**⚠️ For bi-weekly matching system details, see [WEEKLYMATCHING.md](./WEEKLYMATCHING.md)**

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
  - App logo (email-logo.png from your domain)
  - Numbered step guide with table-based layout for email client compatibility:
    1. Complete your profile → `/profile`
    2. Start exploring → `/` (main explore page)
    3. Connect and collaborate (simplified messaging info)
    4. Stay engaged (newsletter signup info)
  - Light gray "Explore Profiles" CTA button
  - Email signature with logo from your team
  - All URLs point to production domain
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
  - Benefits showcase (Better Matches, More Connections, Collaboration Opportunities)
  - Direct CTA to complete profile with edit icon
  - Encouragement message and signature from your team
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

#### 4. Weekly Matching Email with Google Meet Integration (Bi-weekly) ✅ COMPLETED

**Status**: Complete implementation with Google Calendar integration deployed.

**⚠️ For detailed architecture, implementation, and configuration documentation, see [WEEKLYMATCHING.md](./WEEKLYMATCHING.md)**

**Summary**:
- **Schedule**: Bi-weekly Monday 9:00 AM UTC (even weeks only)
- **Template**: `WeeklyMatchEmail.tsx` with comprehensive Google Meet integration
- **Algorithm**: Random matching (MVP) with AI-powered matching planned for future
- **Google Calendar**: Automatic Friday 5 PM CET meetings with Meet links
- **User Preferences**: Respects `emailPreferences.weeklyMatchingEnabled` setting
- **Rate Limiting**: 600ms delays for Resend free plan compliance
- **Implementation Files**: See WEEKLYMATCHING.md for complete file structure

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
  
  // Email preferences (see WEEKLYMATCHING.md for detailed schema)
  "emailPreferences": {
    "weeklyMatchingEnabled": true,
    "profileRemindersEnabled": true,
    "connectionNotifications": true
  },
  
  // Weekly matching history (see WEEKLYMATCHING.md for detailed schema)
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

**Email Preferences & Weekly Match History → JSONB** ✅
- **Why**: One-to-one with user, infrequent queries, schema flexibility
- **Implementation**: See [WEEKLYMATCHING.md](./WEEKLYMATCHING.md) for detailed query patterns and admin controls

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
          route.ts        # Bi-weekly user matching emails (see WEEKLYMATCHING.md)
  types/
    email.ts             # Email-related TypeScript types
```

### Environment Configuration

Add to `.env.local`:
```bash
# Resend Configuration
RESEND_API_KEY=re_xxxxxxxxxxxx
RESEND_FROM_EMAIL=noreply@yourdomain.com
RESEND_WEBHOOK_SECRET=whsec_xxxxxxxxxxxx

# Email Settings
EMAIL_ENABLED=true
EMAIL_TEST_MODE=false # Set to true in development

# Contact Management
RESEND_AUDIENCE_ID=audienceid # Your Resend audience ID

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
1. **Bi-weekly matching emails** ✅ COMPLETED
   - **Status**: Complete implementation deployed
   - **Documentation**: See [WEEKLYMATCHING.md](./WEEKLYMATCHING.md) for detailed architecture

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
  "  crons": [
    {
      "path": "/api/cron/weekly-reminders",
      "schedule": "12 12 * * 2" // Tuesday 12:12 PM UTC
    },
    {
      "path": "/api/cron/weekly-matching",
      "schedule": "0 9 * * 1" // Monday 9 AM UTC, bi-weekly (see WEEKLYMATCHING.md)
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

1. **Consistent branding**: Shared layout with your app colors and typography
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
   - **Production URLs**: All email links and assets use production domain
   - **Email Logging**: Supabase RLS disabled on `email_logs` table to allow server-side logging

2. **Email Template Fixes Applied**:
   - **Logo Solution**: Uses `email-logo.png` from production domain with 100% border-radius
   - **Header Personalization**: "Welcome [FirstName]!" instead of full name + emoji
   - **Number Alignment**: Table-based layout with centered numbers using `margin: 0 auto`
   - **Clean Layout**: Removed "Learn about messaging" and "View community guidelines" text
   - **CTA Styling**: Light gray background on "Explore Profiles" button
   - **Signature Logo**: Added app logo below signature

3. **Cross-Origin Issues Resolved**:
   - **Base URL Strategy**: All email templates use production domain
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

#### Weekly Matching Implementation Lessons Learned (December 2024)

1. **Complete Integration Success**: Full Google Calendar + Google Meet + Email system deployed:
   - **Random Matching Algorithm**: MVP implementation with 70-100 scores for user engagement
   - **Google Calendar Events**: Automatic 30-minute Friday 5 PM CET meetings with Meet links
   - **Dual Email Sending**: Both users receive emails about each other for mutual awareness
   - **Dynamic Profile Pages**: Created `/profiles/[userId]` route for email navigation
   - **Production Cron**: Bi-weekly Monday 9 AM UTC automated scheduling via Vercel

2. **Service Account & Permissions Resolution**:
   - **Domain-Wide Delegation**: Essential for service account calendar creation with attendees
   - **Permission Setup**: "Make changes to events" permission required on shared calendar
   - **Authentication Method**: JWT-based service account auth with user impersonation
   - **Calendar Organization**: Dedicated app calendar with proper organizer settings

3. **Email Template Design Improvements**:
   - **Image Styling**: Fixed stretched profile pictures with `objectFit: 'cover'` and proper dimensions
   - **Location Display**: Handled both string and object location formats
   - **Action Simplification**: Removed complex meeting response buttons, kept only "Add to Calendar"
   - **Professional Branding**: Centered signature with logo, improved footer alignment
   - **Navigation URLs**: Updated links to use production domain and new profile routes

4. **Data Handling & Type Safety**:
   - **String to Array Conversion**: Implemented `ensureArray` helper for database string fields
   - **Email Address Resolution**: Used `auth.users` table for actual email addresses (not profile usernames)
   - **Meeting Duration**: Reduced from 60 to 30 minutes based on user feedback
   - **Database Tracking**: Added `calendar_event_id` and `google_meet_url` columns for analytics

5. **Testing & Development Workflow**:
   - **Comprehensive Test Endpoints**: GET and POST methods for different testing scenarios
   - **Calendar Event Testing**: Verified actual calendar creation and Meet link generation
   - **Email Delivery Testing**: Confirmed both users receive properly formatted emails
   - **Error Handling**: Graceful fallbacks when calendar creation fails (emails still send)

6. **Rate Limiting & Production Considerations**:
   - **Google Calendar API**: 200ms delays between calendar API calls to respect quotas
   - **Email Rate Limiting**: Existing 600ms delays maintained for Resend compliance
   - **Batch Processing**: Sequential processing for both emails and calendar events
   - **Error Recovery**: Comprehensive error logging and graceful degradation strategies

7. **User Experience Enhancements**:
   - **Meeting Coordination**: Added message encouraging users to confirm via calendar or direct message
   - **Profile Accessibility**: Direct links to view full profiles from emails
   - **Calendar Integration**: Proper ICS file generation for cross-platform calendar support
   - **Visual Consistency**: Maintained app branding throughout email and calendar events

**Architecture Decision Validation**: The integrated approach of combining matching, calendar creation, and email sending in a single cron job proved effective for:
- **Simplicity**: Single entry point for weekly matching workflow
- **Data Consistency**: Match data, calendar events, and emails created atomically
- **Error Handling**: Centralized error management and logging
- **Rate Limiting**: Coordinated delays across multiple external APIs

## Google Meet & Calendar Integration

**Status**: Complete implementation with production deployment ✅

**⚠️ For detailed Google Calendar integration architecture, service account configuration, and implementation details, see [WEEKLYMATCHING.md](./WEEKLYMATCHING.md)**

### Overview

- **Automated Scheduling**: Create Google Calendar events with embedded Google Meet links for bi-weekly matches
- **Meeting Schedule**: Friday 5 PM CET, 30-minute duration
- **Service Account Integration**: Domain-wide delegation for calendar creation
- **Email Integration**: Meeting details embedded in WeeklyMatchEmail templates

### Key Features Implemented

- **Service Account Authentication**: Domain-wide delegation for calendar access
- **Google Meet Integration**: Automatic video conference links via `conferenceData`
- **Event Naming**: Format `"FirstName + FirstName / CivicMatch"`
- **ICS Downloads**: Calendar file generation via `/api/calendar/download/[eventId]`

**Implementation Files**: See [WEEKLYMATCHING.md](./WEEKLYMATCHING.md) for complete file structure and configuration.

### Database Schema Extensions

**Status**: Complete implementation ✅

**⚠️ For detailed database schema, JSONB structure, and SQL examples, see [WEEKLYMATCHING.md](./WEEKLYMATCHING.md)**

**Summary**:
- Added `calendar_event_id` and `google_meet_url` columns to `email_logs` table
- Enhanced `profiles.data` JSONB with `emailPreferences` and `weeklyMatchHistory`
- Maintains existing relational structure while adding flexible JSONB fields

### Implementation Components

**⚠️ For complete file structure, service configurations, and implementation details, see [WEEKLYMATCHING.md](./WEEKLYMATCHING.md)**

**Key Components**:
- Google Calendar API service with JWT authentication
- Enhanced MatchingService with calendar integration  
- WeeklyMatchEmail template with Google Meet integration
- Production cron endpoint with bi-weekly scheduling logic
- ICS file generation for calendar downloads

#### Environment Configuration

**⚠️ For complete environment variables and setup requirements, see [WEEKLYMATCHING.md](./WEEKLYMATCHING.md)**

**Key Variables**:
- `GOOGLE_SERVICE_ACCOUNT_JSON` - Service account credentials  
- `GOOGLE_CALENDAR_OWNER_EMAIL` - Domain-wide delegation target
- `CRON_SECRET` - Vercel cron authentication
- Meeting configuration (duration, time, timezone)

### Core Services Implementation ✅ COMPLETED

**⚠️ For complete service implementation details, API interfaces, and integration patterns, see [WEEKLYMATCHING.md](./WEEKLYMATCHING.md)**

**Summary**:
- **GoogleCalendarService**: Creates events with Meet links, generates ICS files, handles timezone conversion
- **Enhanced MatchingService**: Integrates calendar creation with random matching algorithm
- **WeeklyMatchEmail Integration**: Embeds meeting details in email templates
- **Error Handling**: Graceful degradation when calendar creation fails

### WeeklyMatchEmail Enhancements ✅ COMPLETED

**⚠️ For detailed email template structure, props interfaces, and content features, see [WEEKLYMATCHING.md](./WEEKLYMATCHING.md)**

**Key Features**:
- Complete profile display with Google Meet integration
- Friday 5 PM CET meeting coordination
- Direct messaging and profile navigation links
- Conditional rendering for profile sections
- Professional branding with centered signature

### Security, Performance & Testing

**⚠️ For detailed security considerations, performance optimizations, testing strategies, and monitoring approaches, see [WEEKLYMATCHING.md](./WEEKLYMATCHING.md)**

**Key Areas Covered**:
- Data protection and privacy controls
- API security and rate limiting
- Performance optimizations and error handling  
- Integration testing and production monitoring

### Google Calendar Integration Implementation ✅ COMPLETED

**Status**: Complete production implementation deployed.

**⚠️ For detailed implementation history, lessons learned, and technical decisions, see [WEEKLYMATCHING.md](./WEEKLYMATCHING.md)**

**Implementation Summary**:
- Complete Google Calendar + Google Meet integration
- Service account authentication with domain-wide delegation  
- Enhanced email templates with meeting coordination
- Production cron endpoints with comprehensive error handling
- Database migrations for calendar event tracking

## Summary

This architecture document provides the foundational design for CivicMatch's core platform features. For specialized system documentation, refer to:

- **[EXPLORE.md](./EXPLORE.md)** - Google Maps integration architecture, location-based discovery features, geographic filtering, and interactive world map implementation
- **[MESSAGES.md](./MESSAGES.md)** - Complete messaging system architecture, UI design patterns, message composer features, keyboard shortcuts, mobile optimization, and implementation details
- **[WEEKLYMATCHING.md](./WEEKLYMATCHING.md)** - Complete bi-weekly matching system architecture, Google Calendar integration, user preferences, and operational details
- **[MYPROFILE.md](../MYPROFILE.md)** - My Profile view implementation, layout architecture, account management features, and responsive design patterns

The document emphasizes:
- **Server-first architecture** with Next.js App Router
- **Privacy-aware design** with user-controlled preferences  
- **Modular email system** with React Email templates
- **JSONB-first database strategy** for flexibility
- **Progressive enhancement** from MVP to AI-powered features
- **Modern UI patterns** with consistent design language

This approach enables rapid iteration while maintaining production reliability, user privacy, and excellent user experience across all platform features.

---

*For detailed system implementations, see the specialized documentation: [EXPLORE.md](./EXPLORE.md) for geographic discovery, [MESSAGES.md](./MESSAGES.md) for messaging, [WEEKLYMATCHING.md](./WEEKLYMATCHING.md) for matching, and [MYPROFILE.md](../MYPROFILE.md) for profile management.*

## Events Module (Automated Discovery)

The Events Module provides automated discovery and aggregation of civic tech events from across the web, combining user-submitted events with AI-discovered conferences, hackathons, meetups, and workshops.

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        EVENT SOURCES                             │
├──────────────────────┬──────────────────────────────────────────┤
│ Source A: NewsAPI.ai │ Source B: Brave Search API               │
│ (event announcements │ (event pages across the web)             │
│  in press coverage)  │                                          │
└──────────┬───────────┴────────────────────┬─────────────────────┘
           │                                │
           └──────────────┬─────────────────┘
                          │
           ┌──────────────▼─────────────────┐
           │   OpenRouter AI (extraction)   │
           │   - Detect if content is event │
           │   - Extract structured data    │
           │   - Score relevance (0-100)    │
           └──────────────┬─────────────────┘
                          │
           ┌──────────────▼─────────────────┐
           │   Nominatim (geocoding)        │
           │   - Convert addresses to coords│
           │   - Shared cache w/ challenges │
           └──────────────┬─────────────────┘
                          │
           ┌──────────────▼─────────────────┐
           │   Database (Supabase)          │
           │   - discovered_events table    │
           │   - Deduplication & merging    │
           └──────────────┬─────────────────┘
                          │
           ┌──────────────▼─────────────────┐
           │   Frontend Integration         │
           │   - /events page               │
           │   - Map layer (planned)        │
           │   - Filter by type/date/cost   │
           └────────────────────────────────┘
```

### Data Sources

#### Source A: NewsAPI.ai
- **Purpose**: Find event announcements in news coverage
- **Keywords**: "civic tech conference", "govtech summit", "civic hackathon", "open government event"
- **Volume**: ~30 articles per query, runs daily
- **Cost**: Free tier (2,000 articles/month)

#### Source B: Brave Search API
- **Purpose**: Discover events across Eventbrite, Luma, Meetup, conference websites
- **Query Groups**: 6 rotating groups covering:
  - Civic Tech (daily)
  - Democracy & Governance (Mon/Wed/Fri)
  - Social Impact & Open Data (Tue/Thu/Sat)
  - Regional - Europe (Mon/Thu)
  - Regional - Global (Tue/Fri)
  - Platform-specific (Wed/Sat)
- **Volume**: ~15 queries/day, ~370 queries/month
- **Cost**: Free tier (2,000 queries/month)

### AI Processing Pipeline

#### Step 1: Initial Extraction (Snippet-First)
1. Send search result title + description to OpenRouter
2. AI determines if content describes a real, upcoming civic tech event
3. If extraction complete → store event
4. If "need more info" → fetch full page content

#### Step 2: Full Page Fetch (On Demand)
1. Fetch event page HTML (10s timeout, 2 retries)
2. Strip scripts/styles, extract main content
3. Re-process with AI using full page text
4. Truncate to 4000 chars for AI context window

#### Step 3: Structured Data Extraction
AI returns JSON with:
```typescript
{
  is_event: boolean;
  event: {
    name: string;
    start_date: string;     // YYYY-MM-DD
    end_date: string;       // YYYY-MM-DD
    location_city: string;
    location_country: string;
    is_online: boolean;
    is_hybrid: boolean;
    event_type: 'conference' | 'hackathon' | 'meetup' | ...;
    cost: 'free' | 'paid' | 'donation' | 'unknown';
    relevance_score: number; // 0-100
    tags: string[];
    // ... more fields
  }
}
```

### Relevance Scoring

| Score | Category | Description |
|-------|----------|-------------|
| 90-100 | Core civic tech | Code for America Summit, Open Government Partnership, civic hackathons |
| 70-89 | Strongly related | GovTech conferences, social innovation summits, open data events |
| 50-69 | Tangentially related | General tech conferences with civic tracks, NGO meetings |
| <50 | Not relevant | Filtered out, not stored |

Only events with score ≥60 are displayed to users.

### Deduplication Strategy

1. **URL-based**: Check `source_url` and `event_url` for exact matches
2. **Fuzzy name matching**: PostgreSQL `pg_trgm` extension for similar names
3. **Date + Location**: Events within 3 days and same city are potential duplicates
4. **Merging**: When duplicates found, merge missing fields from new source

### Database Schema

See migration file: `supabase/migrations/0010_discovered_events.sql`

Key features:
- `discovered_events` table with full-text search index
- `combined_events` view merging user + discovered events
- `pg_trgm` extension for fuzzy deduplication
- Automatic expiration of past events
- Stats view for dashboard metrics

### API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/events/discovered` | List discovered events with filters |
| `GET /api/events/combined` | Unified list (user + discovered) |
| `GET /api/events/map` | Events within bounding box (for map) |
| `GET /api/events/stats` | Discovery statistics |
| `GET /api/cron/discover-events` | Cron job for daily discovery |

### Cron Configuration

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/discover-events",
      "schedule": "0 2 * * *"
    }
  ]
}
```

Runs daily at 2 AM UTC (~10-15 minutes execution time).

### Cost Analysis

| Service | Usage | Cost/Month |
|---------|-------|------------|
| Brave Search API | ~370 queries | Free (2,000 limit) |
| NewsAPI.ai | ~600 articles | Free (2,000 limit) |
| OpenRouter AI | ~7,200 calls | ~$1.50 |
| Nominatim | ~200 requests | Free |
| **Total** | | **~$1.50/month** |

### File Structure

```
src/
  types/
    discoveredEvent.ts        # Event types, query groups, helpers
  lib/
    services/
      BraveSearchService.ts   # Brave Search API client
      PageFetchService.ts     # HTML content extraction
      EventDiscoveryService.ts # Main coordination service
    hooks/
      useEvents.ts            # React hooks for events
  app/
    api/
      events/
        discovered/           # Discovered events API
        combined/             # Unified events API
        map/                  # Map bounds API
        stats/                # Statistics API
      cron/
        discover-events/      # Daily discovery cron
    events/
      page.tsx                # Events page
```

### Environment Variables

```bash
# Event Discovery (optional)
BRAVE_SEARCH_API_KEY=your_brave_key
NEWSAPI_AI_KEY=your_newsapi_key
OPENROUTER_API_KEY=your_openrouter_key
NOMINATIM_USER_AGENT=CivicMatch/1.0

# Cron
CRON_SECRET=your_cron_secret
```

### Future Enhancements

1. **Map Integration**: Display events on Google Maps alongside challenges
2. **Email Digest**: Weekly "upcoming events near you" emails
3. **iCal Export**: Subscribe to events feed
4. **User Flagging**: Report incorrect events or duplicates
5. **Smart Recommendations**: ML-based event recommendations based on user profile
6. **Event Series**: Track recurring events (monthly meetups, annual conferences)

---

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
4. **Email system**: welcome emails, password resets, profile reminders, bi-weekly user matching (see [WEEKLYMATCHING.md](./WEEKLYMATCHING.md))
5. **Polish**: notifications, moderation tools, telemetry, accessibility audits

## Open questions

- Do we commit to Supabase for v1, or keep Prisma + NextAuth as the primary path?
- Which analytics/monitoring are acceptable from a privacy perspective?
- Do we support organization/team profiles in v1 or later?

---

This document describes the intended architecture for a Next.js + TypeScript application with shadcn/ui and dark mode, delivering a responsive Civic Match experience on desktop and mobile.


