## Civic Match

Civic Match helps changemakers find the right co‑founders and collaborators for impact projects.

- **Discover**: Search and filter people by values, skills, and causes
- **Connect**: Built‑in messaging to start conversations quickly
- **Showcase**: Personal profile highlighting mission, skills, and projects

Keep this README in sync with `ARCHITECTURE.md` for deeper technical details.

### Status

- UI prototype using Next.js App Router and Tailwind CSS v4
- Demo routes implemented: dashboard (`/`), discover (`/discover`), messages (`/messages`), profile (`/profile`)
- Static/demo data only; backend integration is planned

### Objectives and principles

- **Responsiveness** (mobile‑first), **clarity** (accessible UI), **server‑first** rendering, **privacy‑aware** defaults, and **modularity** by feature

## Tech stack

- **Framework**: Next.js 15 (App Router, React 19, TypeScript)
- **Styling**: Tailwind CSS v4 via `@import "tailwindcss"` in `src/app/globals.css`
- **Icons**: `lucide-react`
- **Fonts**: Google `DM Sans` via `next/font`

Planned (see `ARCHITECTURE.md`): Supabase (Auth/DB/Realtime/Storage), Zod, React Hook Form, TanStack Query, date-fns, shadcn/ui, `next-themes`.

## Project structure

```
civicmatch/
  ARCHITECTURE.md
  README.md
  next.config.ts
  package.json
  postcss.config.mjs
  src/
    app/
      globals.css
      layout.tsx
      page.tsx           # Dashboard
      discover/page.tsx  # Discover prototype
      messages/page.tsx  # Messaging prototype
      profile/page.tsx   # Profile prototype
    components/
      Sidebar.tsx
  public/
```

## Architecture and approach

See `ARCHITECTURE.md` for full details. Highlights below:

- **Server‑first rendering**: Use React Server Components where practical; hydrate only interactive areas.
- **Feature modules**: Auth & onboarding, profiles, matching & search, messaging, connections.
- **Data layer (planned)**: Supabase for Postgres + Auth + Realtime. Server reads via server client, client mutations via server actions or route handlers.
- **Messaging design (planned)**: Realtime channels per conversation with optimistic send and reconciliation.
- **Security**: Supabase Auth + strict RLS; clear public vs private profile fields.
- **Performance**: Route‑level code splitting; streaming RSC for long lists; image optimizations.

### Matching (rule‑based MVP, planned)

Candidate score uses weighted overlap of values, skills, causes, plus optional geo‑affinity. See formula and notes in `ARCHITECTURE.md`.

## UI system

- **Theme tokens** are declared in `src/app/globals.css` (palette, typography, divider). Example utilities: `.btn`, `.card`, and `border-divider`.
- **Layout**: `Sidebar` provides primary navigation; pages are composed of small, accessible UI blocks.
- **Dark mode**: Currently uses `prefers-color-scheme`; planned migration to `next-themes` with `class` strategy.

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

Environment variables are not required for the current UI prototype. Planned keys (Supabase path): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

## Routes (current)

- `/` — Dashboard (cards for actions, suggestions, and activity)
- `/discover` — Rich filter panel and profile preview (demo state)
- `/messages` — Thread list and chat UI (demo state)
- `/profile` — Basic profile form (demo state)

## Roadmap (phased)

1. Foundation: auth, profile CRUD, design system polish, dark mode
2. Search & matching: filters and rule‑based scoring
3. Connections & messaging: request/accept; realtime conversations
4. Polish: notifications, moderation, telemetry, accessibility

## Contributing

- Keep edits small and focused; align with the principles above.
- Update `ARCHITECTURE.md` when making cross‑cutting changes.

