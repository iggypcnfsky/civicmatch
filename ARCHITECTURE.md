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

### Global layout
- No sidebar anywhere in the app
- Sticky global top bar provided by `TopBar` and rendered from `app/layout.tsx` (single source of truth)
- Left: `Logo` + app title. Right: pill actions `Explore`, `Profiles`, `Messages` (active with orange fill), `Logout`, and user chip (avatar + name on desktop)
- Mobile: icons‑only for the same actions; on `/messages/[id]` a back arrow appears in the global top bar
- Top bar remains visible while scrolling (backdrop blur), keeps actions accessible

### Explore view
- Default view after login at `/`
- Masonry grid of profile cards (CSS columns) with infinite loading using `IntersectionObserver`
- Desktop: sticky filter panel on the right; offset so it sits below the sticky top bar
- Mobile: sticky bottom "Filters" pill that opens a bottom‑sheet modal with the same controls; hamburger menu removed
- Profile cards: rounded corners, subtle shadow, role badge and save control; show name + short bio
- Clicking a profile card navigates to the Profiles view (`/profiles`) to show a full profile
### Profiles view
- Uses the same global top bar
- Left column shows a flexible grid of panels (no fixed 1/3 or 2/3 rules):
  - NAME: full‑bleed image panel with large name label at the bottom‑left; adjacent card with location, timezone, tags, social links, and in‑depth bio
  - SAME: skills and “what I do” with chips
  - FAME: what the person is known for (unique achievements)
  - AIM: current focus with sub‑panels for projects/ideas
  - GAME: long‑term strategy
  - Custom panels like portfolio
- Desktop: right column hosts a sticky Invite composer panel sized to half the viewport height; pill‑shaped Skip and Invite buttons with icons
- Mobile: bottom fixed composer with full‑width textarea; pill‑shaped buttons below (Skip left, Invite right)

### My Profile (edit) view
- Mirrors public profile panels (NAME/basic, SAME, FAME, AIM, GAME, Portfolio) but all fields are editable
- Add/Remove items where relevant (links, AIM cards, portfolio links)
- Add New Section for custom content blocks
- Save persists a draft locally for now; desktop Save in header; mobile has a sticky bottom Save bar

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
- Desktop: split layout (approx 1/3 list, 2/3 chat). Left list has a sticky "Search conversations" input; active item has a subtle left accent
- Mobile: list‑first at `/messages`; navigating a thread opens `/messages/[id]` as a full‑screen chat
- Chat header shows name and a short "About" line for context; removed call/video/"We met" actions for MVP
- Composer: larger textarea with pill Send button; fixed at bottom on mobile, inline on desktop

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

- **Product analytics**: PostHog (self‑hostable) with anonymous by default
- **Errors**: Sentry for server/client error monitoring

## Configuration & environments

- `.env.local` for local dev, `.env` for CI; never commit secrets
- Key variables (Supabase path): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, service role for migrations only

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


