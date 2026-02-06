## Civic Match

Civic Match helps changemakers find the right co‑founders and collaborators for impact projects.

- **Discover**: Search and filter people by values, skills, and causes
- **Connect**: Built‑in messaging to start conversations quickly
- **Showcase**: Personal profile highlighting mission, skills, and projects

Keep this README in sync with `ARCHITECTURE.md` for deeper technical details.

### Status

- Next.js App Router + Tailwind CSS v4
- Supabase integrated for Auth and database reads/writes
- Explore (`/`) is the default view after login, with infinite scroll fetching from `public.profiles`
- Auth: email/password and Google Sign‑in (via Supabase OAuth)
- Routes implemented: Explore (`/`), Profiles (`/profiles`), Messages (`/messages`), My Profile (`/profile`), Discover demo (`/discover`)

### Objectives and principles

- **Responsiveness** (mobile‑first), **clarity** (accessible UI), **server‑first** rendering, **privacy‑aware** defaults, and **modularity** by feature

## Tech stack

- **Framework**: Next.js (App Router, React 18+, TypeScript)
- **Styling**: Tailwind CSS v4 via `@import "tailwindcss"` in `src/app/globals.css`
- **Icons**: `lucide-react`
- **Dates**: `date-fns`
- **Auth/DB/Realtime/Storage**: Supabase
- **Planned**: Zod, React Hook Form, TanStack Query, shadcn/ui, `next-themes`

## Project structure

```
civicmatch/
  ARCHITECTURE.md
  README.md
  next.config.ts
  package.json
  postcss.config.mjs
  supabase/
    migrations/
    seed/
  src/
    app/
      globals.css
      layout.tsx
      page.tsx            # Explore (default after login)
      discover/page.tsx   # Discover (demo)
      profiles/page.tsx   # Public profile view
      messages/page.tsx   # Conversations list + active thread (desktop split)
      messages/[id]/page.tsx  # Mobile/full-screen chat
      profile/page.tsx    # Edit your profile
    components/
      Logo.tsx
      TopBar.tsx
    lib/supabase/
      client.ts
    types/
      supabase.ts
  public/
```

## Architecture and approach

See `ARCHITECTURE.md` for full details. Highlights below:

- **Server‑first rendering**: Prefer RSC for reads; hydrate interactive pieces.
- **Feature modules**: Auth & onboarding, profiles, matching & search, messaging, connections.
- **Data layer**: Supabase for Postgres + Auth + Realtime. Client uses `@supabase/supabase-js`.
- **Messaging design**: Realtime channels per conversation; optimistic send (planned).
- **Security**: Supabase Auth + strict RLS; clear public vs private profile fields.
- **Performance**: Route‑level code splitting; streaming RSC for long lists; image optimizations.

### Matching (rule‑based MVP, planned)

Candidate score uses weighted overlap of values, skills, causes, plus optional geo‑affinity. See formula and notes in `ARCHITECTURE.md`.

## UI system

- **Theme tokens** are declared in `src/app/globals.css` (palette, typography, divider). Example utilities: `.btn`, `.card`, and `border-divider`.
- **Global layout**: No sidebar. Sticky `TopBar` in `src/app/layout.tsx` with actions for Explore, Profiles, Messages, Logout, and user chip.
- **Dark mode**: Planned migration to `next-themes` with `class` strategy.

## Scripts

- `npm run dev` — start the dev server (Turbopack)
- `npm run build` — build for production
- `npm run start` — run production server
- `npm run lint` — run ESLint

## Getting started

Prerequisites: Node 18+ and npm.

1) Install dependencies:

```bash
npm install
```

2) Run the app locally:

```bash
npm run dev
```

Then open `http://localhost:3000`.

Create `.env.local` and add:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Email Configuration (see ARCHITECTURE.md for complete setup)
RESEND_API_KEY=re_xxxxxxxxxxxx
RESEND_FROM_EMAIL=noreply@yourdomain.com
RESEND_AUDIENCE_ID=audienceID
EMAIL_ENABLED=true
EMAIL_TEST_MODE=false

# Event Discovery (optional - enables automated event discovery)
BRAVE_SEARCH_API_KEY=your_brave_search_api_key
NEWSAPI_AI_KEY=your_newsapi_key
OPENROUTER_API_KEY=your_openrouter_key
NOMINATIM_USER_AGENT=CivicMatch/1.0 (contact@yourdomain.com)

# EventsEye Configuration (optional)
EVENTSEYE_USER_AGENT=CivicMatchBot/1.0 (contact@yourdomain.com)
EVENTSEYE_DELAY_MS=2000
EVENTSEYE_MAX_PAGES=30
EVENTSEYE_BATCH_SIZE=40
EVENTSEYE_MIN_RELEVANCE=55

# Cron (for automated ingestion)
CRON_SECRET=your_cron_secret
```

Supabase setup (summary — see `ARCHITECTURE.md` for full details):
- Enable Google under Authentication → Providers
- Callback (Supabase, read‑only): `https://gmqbixdqkdllmjiyhdke.supabase.co/auth/v1/callback`
- Auth → URL Configuration: set Site URL to your production domain; add `http://localhost:3000` to Additional Redirect URLs
- In Google Cloud Console (OAuth client → Web application):
  - Authorized JavaScript origins: `http://localhost:3000`, your production domain
  - Authorized redirect URIs: `https://gmqbixdqkdllmjiyhdke.supabase.co/auth/v1/callback`

## Routes (current)

- `/` — Explore (login/register + Google; infinite list of profiles)
- `/profiles` — Public profile view
- `/messages` — Conversations list + active thread (desktop split)
- `/messages/[id]` — Full‑screen chat (mobile)
- `/profile` — Edit your profile
- `/events` — Events page (user-submitted + AI-discovered civic tech events)

## Events Module (Automated Discovery)

The Events page includes an automated discovery system that finds civic tech events from across the web:

- **Brave Search API** (Source B): Discovers events from Eventbrite, Luma, Meetup, and conference websites
- **NewsAPI.ai** (Source A): Finds event announcements in news coverage
- **EventsEye** (Source C): Scrapes global trade show directory for major civic tech conferences
- **AI Extraction**: Uses OpenRouter AI to extract structured event data and filter for relevance
- **Geocoding**: Nominatim (OpenStreetMap) for location coordinates

### Cost Overview

| Service | Usage | Cost |
|---------|-------|------|
| Brave Search API | ~370 queries/month | Free (2,000 limit) |
| NewsAPI.ai | ~600 articles/month | Free (2,000 limit) |
| EventsEye Scraping | ~540 requests/month | Free (HTTP) |
| OpenRouter AI | ~8,000 calls/month | ~$1.70 |
| Nominatim | ~300 requests/month | Free |
| **Total** | | **~$1.70/month** |

### Source C: EventsEye Integration

EventsEye (eventseye.com) is a comprehensive global directory of trade shows and conferences. The integration:

- Scrapes 9 relevant categories (Environmental, ICT, Smart Cities, etc.)
- Uses AI filtering to identify civic-relevant events (smart cities, govtech, climate, etc.)
- Discovers major conferences like Smart City Expo, COP, World Urban Forum
- Runs weekly (Sundays at 3 AM UTC) - trade show data changes slowly

**Categories monitored:**
- Environmental (primary)
- ICT / Information Communications Technologies (primary)
- Education / Training / Employment (primary)
- Quality / Security (primary)
- Urban Equipment & Engineering (subcategory)
- Clean Energies & Renewable Energies (subcategory)
- Environmental Protection (subcategory)
- Water Management & Treatment (subcategory)
- Knowledge Based Systems & AI (subcategory)

### Cron Configuration

Set up in Vercel or your hosting platform:
- **Event Discovery (Daily)**: `0 2 * * *` (daily at 2 AM UTC) - Brave Search + NewsAPI.ai
- **Event Discovery (Weekly)**: `0 3 * * 0` (Sundays at 3 AM UTC) - EventsEye
- **Challenge Ingestion**: `0 */6 * * *` (every 6 hours)

## Roadmap (phased)

1. Foundation: auth, profile CRUD, design system polish, dark mode
2. Search & matching: filters and rule‑based scoring
3. Connections & messaging: request/accept; realtime conversations
4. Events & challenges: automated discovery, map integration
5. Polish: notifications, moderation, telemetry, accessibility

## Contributing

- Keep edits small and focused; align with the principles above.
- Update `ARCHITECTURE.md` when making cross‑cutting changes.

