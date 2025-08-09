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
- Sticky top bar with `Logo` and pill tabs (`Explore`, `Profiles`) on the left, and circular actions on the right (Messages, Logout, Profile)
- Top bar remains visible while scrolling (backdrop blur), keeps actions accessible

### Explore view
- Default view after login at `/`
- Masonry grid of profile cards (CSS columns) with infinite loading using `IntersectionObserver`
- Desktop: sticky filter panel on the right; offset so it sits below the sticky top bar
- Mobile: sticky bottom "Filters" pill that opens a bottom‑sheet modal with the same controls; hamburger menu removed
- Profile cards: rounded corners, subtle shadow, role badge and save control; show name + short bio
- Clicking a profile card navigates to the Profiles view (`/profiles`) to show a full profile
### Profiles view
- Sticky top bar with tabs and actions (same as Explore)
- Left column shows a flexible grid of panels (no fixed 1/3 or 2/3 rules):
  - NAME: full‑bleed image panel with large name label at the bottom‑left; adjacent card with location, timezone, tags, social links, and in‑depth bio
  - SAME: skills and “what I do” with chips
  - FAME: what the person is known for (unique achievements)
  - AIM: current focus with sub‑panels for projects/ideas
  - GAME: long‑term strategy
  - Custom panels like portfolio
- Desktop: right column hosts a sticky Invite composer panel sized to half the viewport height; pill‑shaped Skip and Invite buttons with icons
- Mobile: bottom fixed composer with full‑width textarea; pill‑shaped buttons below (Skip left, Invite right)

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
    page.tsx              // Conversations list + active thread
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

## Messaging design

- **Transport**: Supabase Realtime channels per `conversationId`
- **Flow**: optimistic append → durable insert → realtime broadcast → reconcile/read receipts
- **Presence**: optional later (typing/online) using presence channels
- **Backpressure**: simple rate limit on send; text size cap

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


