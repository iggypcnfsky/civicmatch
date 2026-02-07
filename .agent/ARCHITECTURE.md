# Civic Match — Comprehensive Architecture

> **Last Updated**: February 2026  
> **Version**: 2.0 — Reflects all major modules: Projects, Events, Challenges, Gamification, and AI-powered Discovery

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Architectural Philosophy](#architectural-philosophy)
3. [Tech Stack Evolution](#tech-stack-evolution)
4. [System Architecture Overview](#system-architecture-overview)
5. [Domain Architecture](#domain-architecture)
6. [Core Modules](#core-modules)
   - [Authentication & Profiles](#authentication--profiles)
   - [Projects & Collaboration](#projects--collaboration)
   - [Events & Discovery](#events--discovery)
   - [Challenges & News Intelligence](#challenges--news-intelligence)
   - [Messaging & Connections](#messaging--connections)
   - [Gamification & Engagement](#gamification--engagement)
7. [Data Layer Architecture](#data-layer-architecture)
8. [AI & External Services Integration](#ai--external-services-integration)
9. [Frontend Architecture](#frontend-architecture)
10. [Performance & Scalability](#performance--scalability)
11. [Security Architecture](#security-architecture)
12. [Deployment & Operations](#deployment--operations)

---

## Executive Summary

Civic Match is a civic technology platform connecting changemakers with co-founders and collaborators for impact projects. The platform has evolved from a simple people-discovery app into a comprehensive ecosystem with:

- **4 Core Entities**: People, Projects, Events, Challenges
- **AI-Powered Discovery**: Automated event discovery from 3 sources + news-based civic challenge detection
- **Gamified Collaboration**: XP system, badges, and game-completion gating for project access
- **Real-time Communication**: Built-in messaging with email bridge
- **Geographic Visualization**: Interactive Google Maps with 4 layered entity types

**Scale**: ~$1.70/month operational cost for AI services, handling thousands of events and challenges with automated ingestion pipelines.

---

## Architectural Philosophy

### Core Principles

1. **Server-First Rendering**: Prefer React Server Components (RSC) for reads; hydrate interactive pieces selectively
2. **JSONB-First Schema**: Minimal relational columns for joins/constraints; flexible attributes in `data jsonb`
3. **Progressive Enhancement**: Core functionality works without JavaScript; enhanced with client-side interactivity
4. **Privacy by Design**: RLS policies on all tables; explicit user controls for data visibility
5. **Feature Modularity**: Clear boundaries between domains; shared utilities in `lib/`
6. **AI-Augmented, Human-Validated**: AI powers discovery and enrichment; humans validate and interact

### Decision Records

| Decision | Context | Status |
|----------|---------|--------|
| Supabase over Prisma | Integrated auth, realtime, storage; faster MVP | ✅ Maintained |
| JSONB over normalized tables | Schema evolution without migrations; flexible profiles | ✅ Successful |
| App Router over Pages Router | Streaming, nested layouts, server components | ✅ Successful |
| Client-side Supabase vs API routes | Direct DB access for real-time; API routes for complex ops | ✅ Hybrid approach |
| AI-powered event discovery | Scale beyond manual curation; 3-source pipeline | ✅ Deployed |
| Game completion gating | Ensure project investment before collaboration | ✅ Deployed |

---

## Tech Stack Evolution

### Current Stack (v2.0)

| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| Framework | Next.js | 16.1.6 | App Router, React Server Components |
| Runtime | React | 19.2.4 | Concurrent features, Server Components |
| Language | TypeScript | 5.x | Type safety across full stack |
| Styling | Tailwind CSS | 4.x | Utility-first CSS with CSS variables |
| UI Components | shadcn/ui + Radix | Latest | Accessible, composable primitives |
| Database | PostgreSQL (Supabase) | 15+ | JSONB, PostGIS, Full-text search |
| Auth | Supabase Auth | Latest | OAuth, email, session management |
| Realtime | Supabase Realtime | Latest | WebSocket subscriptions |
| Storage | Supabase Storage | Latest | Avatars, images |
| Maps | Google Maps Platform | JS API v3 | Interactive mapping with Advanced Markers |
| Email | Resend + React Email | Latest | Transactional and campaign emails |
| AI/ML | OpenRouter AI | Latest | Multi-model AI with fallback |
| Search APIs | Brave Search, NewsAPI.ai | Latest | Event and news discovery |
| Icons | Lucide React | Latest | Consistent icon system |
| Dates | date-fns | Latest | Date manipulation |

### Legacy Stack Notes

- **Tailwind v3 → v4**: Migrated to `@import "tailwindcss"` with CSS-based configuration
- **React 18 → 19**: Leveraging improved Server Components and caching
- **Pages Router → App Router**: Full migration completed; all routes use App Router

---

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │   Explore   │  │   Project   │  │   Events    │  │     Challenges      │ │
│  │    (Map)    │  │   (Game)    │  │   (List)    │  │    (News Map)       │ │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘ │
│         │                │                │                    │            │
│  ┌──────┴────────────────┴────────────────┴────────────────────┴──────────┐ │
│  │                     React Components (Client/Server)                   │ │
│  │     ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐    │ │
│  │     │   Auth   │  │  Hooks   │  │   Map    │  │  UI Components   │    │ │
│  │     │ Provider │  │ (swr)    │  │ (Google) │  │ (shadcn/ui)      │    │ │
│  │     └──────────┘  └──────────┘  └──────────┘  └──────────────────┘    │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │ HTTP / WebSocket
┌───────────────────────────────────┴─────────────────────────────────────────┐
│                              API LAYER                                       │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                        Next.js API Routes                              │ │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐  │ │
│  │  │  Events  │ │Challenges│ │ Messages │ │  Email   │ │    Cron      │  │ │
│  │  │  (API)   │ │  (API)   │ │  (API)   │ │ (API)    │ │  (Jobs)      │  │ │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────────┘  │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │
┌───────────────────────────────────┴─────────────────────────────────────────┐
│                           SERVICE LAYER                                      │
│  ┌────────────────┐ ┌────────────────┐ ┌────────────────┐ ┌───────────────┐ │
│  │ EventDiscovery │ │  ChallengeSvc  │ │ EmailService   │ │ ProfileQuality│ │
│  │    Service     │ │    Service     │ │                │ │   Service     │ │
│  └────────────────┘ └────────────────┘ └────────────────┘ └───────────────┘ │
│  ┌────────────────┐ ┌────────────────┐ ┌────────────────┐ ┌───────────────┐ │
│  │ BraveSearch    │ │  NewsApiSvc    │ │ OpenRouterSvc  │ │ NominatimSvc  │ │
│  │    Service     │ │    Service     │ │  (AI Gateway)  │ │  (Geocode)    │ │
│  └────────────────┘ └────────────────┘ └────────────────┘ └───────────────┘ │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │ SQL / REST / WebSocket
┌───────────────────────────────────┴─────────────────────────────────────────┐
│                              DATA LAYER                                      │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                    PostgreSQL (Supabase)                               │ │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐  │ │
│  │  │ profiles │ │ projects │ │  events  │ │challenges│ │ discovered_  │  │ │
│  │  │          │ │_members  │ │  rsvps   │ │          │ │   events     │  │ │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────────┘  │ │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐  │ │
│  │  │research_ │ │  ideas   │ │   votes  │ │roadmap_  │ │    jobs      │  │ │
│  │  │  nodes   │ │          │ │          │ │  items   │ │              │  │ │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────────┘  │ │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐                   │ │
│  │  │messages  │ │conversat-│ │connections│ │game_compl│                   │ │
│  │  │          │ │   ions   │ │          │ │etions    │                   │ │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘                   │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                    External Integrations                               │ │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐  │ │
│  │  │  Resend  │ │  Google  │ │  Brave   │ │ NewsAPI  │ │  EventsEye   │  │ │
│  │  │  (Email) │ │  Maps    │ │  Search  │ │   .ai    │ │ (Scraper)    │  │ │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────────┘  │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Domain Architecture

### Entity Relationship Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DOMAIN ENTITY MODEL                                  │
└─────────────────────────────────────────────────────────────────────────────┘

User (auth.users)
│
├─► Profile ───────┬──► Connections ◄────┬──► Messages ◄──► Conversations
│     │            │       │              │       │              │
│     │            │       │              │       │              │
│     ▼            │       ▼              │       ▼              │
│  [JSONB data]    │   [Relationships]    │  [JSONB content]     │
│  • displayName   │   • pending          │  • text              │
│  • skills[]      │   • accepted         │  • attachments[]     │
│  • causes[]      │   • blocked          │  • readAt            │
│  • location      │                      │                      │
│  • xp            │                      │                      │
│                  │                      │                      │
├─► Projects ◄─────┼──► ProjectMembers    │                      │
│     │            │   • founder          │                      │
│     │            │   • admin            │                      │
│     ▼            │   • member           │                      │
│  [JSONB data]    │                      │                      │
│  • title         │                      │                      │
│  • manifesto     │                      │                      │
│  • location      │                      │                      │
│                  │                      │                      │
├─► GameCompletions┘                      │                      │
│   (gates access)                        │                      │
│                                         │                      │
├─► ResearchNodes ─┬──► Votes            │                      │
│   (after game)   │   • idea            │                      │
│                  │   • research        │                      │
├─► Ideas          │   • roadmap         │                      │
│                  │                      │                      │
├─► RoadmapItems   │                      │                      │
│                  │                      │                      │
└─► Jobs           │                      │                      │
                   │                      │                      │
Events (public) ◄──┘                      │                      │
│                                         │                      │
├─► EventRSVPs                            │                      │
│                                         │                      │
└─► DiscoveredEvents (AI-generated) ──────┘                      │
    • brave_search                                               │
    • newsapi                                                    │
    • eventseye                                                  │
                                                                 │
Challenges (AI-generated from news) ◄────────────────────────────┘
• Environment
• Housing
• Transport
• Public Safety
• Governance
• Education
• Health
• Climate
```

---

## Core Modules

### Authentication & Profiles

**Architecture Pattern**: Context-based auth with profile-onboarding

```typescript
// Auth Flow
1. User signs up (email/password or Google OAuth)
2. Supabase Auth creates auth.users entry
3. ensureProfileForCurrentUser() upserts public.profiles
4. Google metadata → displayName, avatarUrl extraction
5. Welcome email triggered via /api/email/welcome
```

**Profile Data Strategy (JSONB)**:
```typescript
interface ProfileData {
  // Core identity
  displayName: string;
  bio: string;
  email: string;
  avatarUrl?: string;
  
  // Facets for matching
  skills: string[];
  causes: string[];
  values?: string[];
  
  // Location (geocoded)
  location?: {
    coordinates: { lat: number; lng: number; accuracy: string };
    displayName: string;
    placeId: string;
    source: 'places_autocomplete' | 'geocoded' | 'manual';
  };
  
  // Extended profile
  fame?: string;           // What I'm known for
  aim?: AimItem[];         // What I'm focused on
  workStyle?: string;
  helpNeeded?: string;
  portfolio?: string[];
  customSections?: CustomSection[];
  
  // Gamification
  xp?: number;
  
  // Email preferences
  emailPreferences?: {
    weeklyMatches?: boolean;
    profileReminders?: boolean;
  };
  weeklyMatchHistory?: string[];
}
```

**Profile Quality System**:
- Weighted scoring: Core fields (15 pts), Optional (5-10 pts)
- Threshold: 50% = "quality profile"
- Incomplete banner shown for < 50% completion
- Used in: Weekly matching eligibility, search ranking

---

### Projects & Collaboration

**Core Innovation**: Game-completion gating ensures investment before collaboration access.

#### Project Access Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        PROJECT ACCESS LIFECYCLE                              │
└─────────────────────────────────────────────────────────────────────────────┘

User discovers project
        │
        ▼
┌───────────────┐
│   /[slug]     │ ───► Manifesto page (public)
│  (Manifesto)  │       • Project story
└───────┬───────┘       • Founder video
        │               • Continue button
        ▼
┌───────────────┐
│ /[slug]/game  │ ───► Interactive game/quiz
│    (Game)     │       • Engages user with project
└───────┬───────┘       • Tests understanding
        │
        ▼ (On completion)
┌───────────────┐
│  game_completions  ◄── Record created
│   (DB Table)   │       • user_id + project_id
└───────┬───────┘
        │
        ▼
┌───────────────┐
│/[slug]/dashboard│ ───► Full project access:
│  (Dashboard)  │       • Vision, Plan, Research
        │               • Ideas (voting)
├───────┴───────┤       • Roadmap (Kanban)
│  Tab System   │       • People
│ • vision      │       • Jobs
│ • plan        │
│ • research    │
│ • ideas       │
│ • people      │
│ • jobs        │
└───────────────┘
```

#### Project Data Model

```typescript
interface ProjectData {
  title: string;
  description: string;
  manifesto?: string;           // Founder story
  founderName?: string;
  logoUrl?: string;
  videoUrl?: string;
  backgroundImageUrl?: string;
  tags?: string[];
  status: 'active' | 'completed' | 'archived';
  location?: {
    city?: string;
    country?: string;
    coordinates?: { lat: number; lng: number };
  };
  organizers?: string[];        // User IDs with admin rights
}
```

#### Collaboration Tools

| Feature | Access | Gamification |
|---------|--------|--------------|
| Research Nodes | Members only | +15 XP |
| Ideas | Members only | +10 XP |
| Roadmap Items | Members only | +10 XP |
| Votes | All auth | +1 XP |
| Jobs | View: all, Edit: admins | - |

---

### Events & Discovery

**Architecture Pattern**: Multi-source AI-powered event discovery with user submission blending

#### Discovery Pipeline (3 Sources)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       EVENT DISCOVERY PIPELINE                               │
└─────────────────────────────────────────────────────────────────────────────┘

SOURCE A: NewsAPI.ai                    SOURCE B: Brave Search API
(News articles)                         (Search results)
        │                                       │
        │   ┌──────────────┐                    │   ┌──────────────┐
        └──►│  NewsApiSvc  │                    └──►│  BraveSvc    │
            │  • Keywords  │                        │  • Queries   │
            │  • 30/day    │                        │  • 20/query  │
            └──────┬───────┘                        └──────┬───────┘
                   │                                       │
                   └──────────────────┬────────────────────┘
                                      ▼
                            ┌──────────────────┐
                            │  OpenRouter AI   │
                            │  (Extraction)    │
                            │                  │
                            │ • is_event?      │
                            │ • Extract fields │
                            │ • Relevance 0-100│
                            └────────┬─────────┘
                                     │
                                     ▼
SOURCE C: EventsEye             ┌──────────────┐
(Trade show scraper)            │  Deduplication│
        │                       │  • URL match  │
        │   ┌──────────────┐    │  • Name+date  │
        └──►│ EventsEyeSvc │    │  • Fuzzy match│
            │  • 9 categories   └──────┬───────┘
            │  • AI filtering          │
            │  • Weekly scrape         ▼
            └──────┬───────┐    ┌──────────────┐
                   │        └──►│  Geocoding   │
                   │            │  (Nominatim) │
                   │            └──────┬───────┘
                   │                   │
                   └───────────────────┤
                                       ▼
                              ┌────────────────┐
                              │  discovered_   │
                              │   events       │
                              │   (Postgres)   │
                              └────────────────┘
                                       │
                    ┌──────────────────┼──────────────────┐
                    │                  │                  │
                    ▼                  ▼                  ▼
            ┌─────────────┐   ┌─────────────┐   ┌─────────────┐
            │  /events    │   │  /explore   │   │  /api/events│
            │  (List)     │   │  (Map)      │   │  (Combined) │
            └─────────────┘   └─────────────┘   └─────────────┘
```

#### Event Type Classification

| Type | Color | Discovery Source |
|------|-------|------------------|
| conference | Blue (#3b82f6) | All sources |
| hackathon | Green (#22c55e) | Brave, NewsAPI |
| meetup | Orange (#f97316) | Brave |
| workshop | Purple (#a855f7) | All sources |
| summit | Teal (#14b8a6) | All sources |
| webinar | Indigo (#6366f1) | All sources |
| training | Yellow (#eab308) | EventsEye |
| festival | Pink (#ec4899) | EventsEye |

#### Combined Events View

The `combined_events` database view unifies user-submitted and AI-discovered events:

```sql
CREATE VIEW combined_events AS (
  -- User events
  SELECT e.id, e.data->>'title' AS name, ... 'user_submitted' AS source
  FROM events e WHERE start_date >= NOW()
)
UNION ALL
(
  -- Discovered events
  SELECT id, name, ... 'discovered' AS source
  FROM discovered_events 
  WHERE status = 'active' AND relevance_score >= 60
)
ORDER BY start_datetime ASC;
```

---

### Challenges & News Intelligence

**Architecture Pattern**: News → AI Analysis → Geocoding → Civic Challenge Map

#### Ingestion Pipeline

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      CHALLENGE INGESTION PIPELINE                            │
└─────────────────────────────────────────────────────────────────────────────┘

NewsAPI.ai
(8 categories)
• Environment       ┐
• Housing           │
• Transport         │
• Public Safety     ├─► ┌──────────────┐
• Governance        │   │ NewsApiSvc   │
• Education         │   │ • Keywords   │
• Health            │   │ • 30/cat/day │
• Climate           ┘   └──────┬───────┘
                               │
                               ▼
                      ┌──────────────────┐
                      │  OpenRouter AI   │
                      │  (Classification)│
                      │                  │
                      │ • is_challenge?  │
                      │ • category       │
                      │ • severity       │
                      │ • location       │
                      │ • summary        │
                      │ • skills_needed[]│
                      └────────┬─────────┘
                               │
                               ▼
                      ┌──────────────────┐
                      │   Geocoding      │
                      │   (Nominatim)    │
                      │                  │
                      │ • City extraction│
                      │ • Lat/lng lookup │
                      │ • Cache results  │
                      └────────┬─────────┘
                               │
                               ▼
                      ┌──────────────────┐
                      │    challenges    │
                      │    (PostGIS)     │
                      │                  │
                      │ • GIST index     │
                      │ • Auto-expire    │
                      │ • Full-text      │
                      │   search         │
                      └──────────────────┘
```

#### Challenge Categories & Visual Design

| Category | Color | Icon | Severity Levels |
|----------|-------|------|-----------------|
| Environment | Green (#22c55e) | Leaf | Critical → Low |
| Housing | Orange (#f97316) | Home | Critical → Low |
| Transport | Blue (#3b82f6) | Bus | Critical → Low |
| Public Safety | Red (#ef4444) | Shield | Critical → Low |
| Governance | Purple (#a855f7) | Landmark | Critical → Low |
| Education | Yellow (#eab308) | GraduationCap | Critical → Low |
| Health | Pink (#ec4899) | Heart | Critical → Low |
| Climate | Teal (#14b8a6) | ThermometerSun | Critical → Low |

**Auto-Expiration**: Challenges expire 14 days after publication date via database trigger.

---

### Messaging & Connections

**Architecture Pattern**: Supabase Realtime with optimistic updates + email bridge

#### Realtime Message Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        REALTIME MESSAGING FLOW                               │
└─────────────────────────────────────────────────────────────────────────────┘

Sender (Client A)                    Receiver (Client B)
        │                                    │
        │  1. Type message                   │
        │  2. Click send / Enter             │
        │                                    │
        ▼                                    │
┌───────────────┐                           │
│  messages.insert│                          │
│  • conversation_id                         │
│  • sender_id                               │
│  • data: {text}                            │
└───────┬───────┘                           │
        │                                    │
        ▼ (Supabase Realtime)                ▼
┌──────────────────────────────────────────────────┐
│         postgres_changes channel                  │
│  ┌────────────────────────────────────────────┐  │
│  │  Filter: conversation_id = 'xyz'           │  │
│  │  Event: INSERT                             │  │
│  └────────────────────────────────────────────┘  │
└────────────────────┬─────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        ▼            ▼            ▼
   All clients   listening on   this channel
   receive the  new message
   instantly
```

#### Connection States

```typescript
type ConnectionStatus = 
  | 'pending'    // Request sent, awaiting response
  | 'accepted'   // Connected, can message
  | 'declined'   // Request rejected
  | 'blocked';   // Either party blocked
```

#### Email-to-Conversation Bridge

Weekly matching emails include direct links to start conversations:

```
Email CTA → /messages/start?userId=xyz
                │
                ▼
        ┌───────────────┐
        │  Check if     │
        │  conversation │
        │  exists       │
        └───────┬───────┘
                │
        ┌───────┴───────┐
        ▼               ▼
   ┌─────────┐    ┌──────────┐
   │ Create  │    │ Navigate │
   │ new     │    │ to existing
   │ convo   │    │          │
   └────┬────┘    └────┬─────┘
        │              │
        └──────┬───────┘
               ▼
        /messages/[id]
```

---

### Gamification & Engagement

**Architecture Pattern**: XP accumulation → Level progression → Badge unlocking

#### XP Rewards Table

| Action | XP | Rationale |
|--------|-----|-----------|
| Research Node | 15 | High effort, valuable contribution |
| Idea | 10 | Creative contribution |
| Roadmap Item | 10 | Planning contribution |
| Vote | 1 | Engagement encouragement |
| Game Completion | 25 | Project commitment |
| Profile Complete | 50 | Platform investment |

#### Level System (Logarithmic)

```typescript
const LEVEL_THRESHOLDS = [
  0,      // Level 1: Newcomer
  100,    // Level 2: Explorer
  300,    // Level 3: Contributor
  700,    // Level 4: Collaborator
  1300,   // Level 5: Builder
  2100,   // Level 6: Leader
  3100,   // Level 7: Innovator
  4300,   // Level 8: Champion
  5700,   // Level 9: Visionary
  7300,   // Level 10: Pioneer
  9100,   // Level 11: Legend
  11100,  // Level 12: Civic Hero
];
```

#### Badge System

| Badge | Requirement | Rarity |
|-------|-------------|--------|
| First Steps | Profile ≥ 50% | Common |
| Researcher | 1 research node | Common |
| Ideator | 1 idea | Common |
| Team Player | 1 project joined | Common |
| Active Voter | 10 votes | Uncommon |
| Roadmap Planner | 5 roadmap items | Uncommon |
| Century | 100 XP | Uncommon |
| Prolific Researcher | 5 research nodes | Rare |
| Visionary | 10 ideas | Rare |
| Multi-Project | 3 projects | Rare |

---

## Data Layer Architecture

### JSONB Strategy

**Philosophy**: Relational columns for identity and joins; JSONB for flexible, evolving data.

```sql
-- Example: profiles table
CREATE TABLE public.profiles (
  user_id    uuid primary key references auth.users(id),
  username   text unique not null,  -- Relational: needed for lookups
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  data       jsonb not null default '{}'  -- Flexible: evolves without migrations
);

-- Index strategy
CREATE INDEX profiles_data_gin ON public.profiles 
  USING gin (data jsonb_path_ops);  -- For JSONB containment queries

-- Expression indexes for hot paths
CREATE INDEX idx_profiles_display_name 
  ON public.profiles ((data->>'displayName'));
```

### RLS Policy Patterns

```sql
-- Pattern 1: Public read, owner write
CREATE POLICY "profiles_select_all" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_update_own" ON public.profiles 
  FOR UPDATE USING (auth.uid() = user_id);

-- Pattern 2: Participant-based access (conversations)
CREATE POLICY "conversations_participant_access" ON public.conversations
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM jsonb_array_elements_text(data->'participantIds') pid
    WHERE pid::uuid = auth.uid()
  )
);

-- Pattern 3: Role-based access (project members)
CREATE POLICY "projects_update_member" ON public.projects FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.project_members pm
    WHERE pm.project_id = projects.id
      AND pm.user_id = auth.uid()
      AND pm.role IN ('founder', 'admin')
  )
);

-- Pattern 4: Service role only (challenges, discovered events)
CREATE POLICY "challenges_select_active" ON public.challenges
  FOR SELECT USING (status = 'active');
CREATE POLICY "challenges_service_insert" ON public.challenges
  FOR INSERT WITH CHECK (false);  -- Insert only via service role key
```

### PostGIS Spatial Queries

```sql
-- Enable PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

-- Spatial index for challenges
CREATE INDEX idx_challenges_location ON public.challenges USING GIST (
  ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
);

-- Nearby challenges function
CREATE FUNCTION nearby_challenges(lat DECIMAL, lng DECIMAL, radius_km DECIMAL)
RETURNS TABLE(...) AS $$
  SELECT * FROM public.challenges
  WHERE ST_DWithinSphere(
    ST_MakePoint(longitude, latitude)::geometry,
    ST_MakePoint(lng, lat)::geometry,
    radius_km * 1000
  );
$$;
```

---

## AI & External Services Integration

### OpenRouter Service Pattern

**Purpose**: AI gateway with model fallback for reliability.

```typescript
class OpenRouterService {
  private readonly models = [
    'google/gemini-2.0-flash-001',
    'anthropic/claude-3.5-haiku',
    'openai/gpt-4o-mini',
  ];
  
  async analyzeWithFallback(prompt: string): Promise<AIResult> {
    for (const model of this.models) {
      try {
        return await this.callModel(model, prompt);
      } catch (error) {
        console.warn(`Model ${model} failed, trying next...`);
        continue;
      }
    }
    throw new Error('All AI models failed');
  }
}
```

### Geocoding with Cache

```typescript
interface GeocodeCacheEntry {
  query: string;
  latitude: number;
  longitude: number;
  display_name: string;
  cached_at: string;
}

// Cache strategy: Check DB first, fallback to Nominatim API
async function geocodeWithCache(
  query: string,
  getCache: (q: string) => Promise<GeocodeCacheEntry | null>,
  setCache: (e: GeocodeCacheEntry) => Promise<void>
): Promise<Coordinates | null> {
  const cached = await getCache(query);
  if (cached) return cached;
  
  const result = await nominatimGeocode(query);
  if (result) await setCache(result);
  return result;
}
```

### Rate Limiting Strategy

| Service | Limit | Our Strategy |
|---------|-------|--------------|
| Brave Search API | 2,000/mo | Rotating daily queries |
| NewsAPI.ai | 2,000/mo | 8 categories, 30 articles each |
| OpenRouter | Pay-per-use | Sequential processing, 200ms delays |
| Nominatim | 1 req/sec | 1100ms delays, caching |
| EventsEye | None | Respectful scraping with delays |

---

## Frontend Architecture

### Component Hierarchy

```
src/
├── app/                          # Next.js App Router
│   ├── (routes)/                 # Page components
│   ├── api/                      # API routes
│   ├── layout.tsx                # Root layout with providers
│   └── globals.css               # Tailwind + design tokens
│
├── components/
│   ├── ui/                       # shadcn/ui components
│   ├── profile/                  # Profile-specific components
│   │   ├── ActivityTimeline.tsx
│   │   ├── BadgesDisplay.tsx
│   │   ├── ExperienceMeter.tsx
│   │   └── LevelBadge.tsx
│   ├── project/                  # Project collaboration components
│   │   ├── KanbanBoard.tsx
│   │   ├── IdeasGrid.tsx
│   │   ├── ResearchGrid.tsx
│   │   ├── VoteButton.tsx
│   │   └── JobsPanel.tsx
│   ├── challenge/                # Challenge map components
│   │   ├── ChallengeMarker.tsx
│   │   ├── ChallengeDetail.tsx
│   │   └── ChallengeFilter.tsx
│   ├── ExploreMap.tsx            # Main map component
│   ├── TopBar.tsx                # Global navigation
│   └── AuthProvider.tsx          # Auth context
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts             # Browser client
│   │   └── server.ts             # Server/client + service role
│   ├── services/                 # Business logic services
│   │   ├── EventDiscoveryService.ts
│   │   ├── ChallengeService.ts
│   │   ├── ProfileQualityService.ts
│   │   ├── BraveSearchService.ts
│   │   ├── NewsApiService.ts
│   │   ├── OpenRouterService.ts
│   │   ├── NominatimService.ts
│   │   └── EventsEyeService.ts
│   ├── email/
│   │   ├── services/             # Email services
│   │   └── templates/            # React Email templates
│   ├── hooks/                    # Custom React hooks
│   │   ├── useChallenges.ts
│   │   └── useEvents.ts
│   └── google/                   # Google Maps integration
│       ├── maps-loader.ts
│       └── calendar.ts
│
└── types/                        # TypeScript definitions
    ├── supabase.ts               # Generated DB types
    ├── profile.ts
    ├── project.ts
    ├── event.ts
    ├── challenge.ts
    ├── discoveredEvent.ts
    └── gamification.ts
```

### State Management Strategy

| State Type | Solution | Example |
|------------|----------|---------|
| Server State | TanStack Query (SWR) | Profile data, events |
| Auth State | AuthProvider Context | Session, user |
| UI State | React useState | Modals, filters |
| Real-time | Supabase Realtime | Messages |
| Form State | React Hook Form | Profile edit |

### Map Visualization Architecture

```typescript
// Layered marker system with collision detection
interface MapLayers {
  profiles: AdvancedMarkerElement[];   // Avatar pills
  projects: AdvancedMarkerElement[];   // Green circles
  events: AdvancedMarkerElement[];     // Blue circles
  challenges: AdvancedMarkerElement[]; // Triangle markers
}

// Overlap resolution for clustered markers
function resolveOverlaps(
  items: { id: string; lat: number; lng: number }[]
): Map<string, { lat: number; lng: number }> {
  // Group by rounded coordinates
  // Apply circular offset for zoom >= 8
  // Return resolved positions
}
```

---

## Performance & Scalability

### Optimization Strategies

| Area | Strategy | Implementation |
|------|----------|----------------|
| Database | Keyset pagination | Cursor-based for feeds |
| Database | Materialized views | combined_events, challenge_category_stats |
| API | Debounced fetching | 800ms debounce for map bounds |
| API | Bound padding | Fetch 50% larger area than viewport |
| Client | Memoization | useMemo for map markers |
| Client | Virtual scrolling | For long lists |
| Images | Next/Image | Optimized loading, WebP |
| Static | CDN caching | ISR for public pages |

### Query Optimization Examples

```typescript
// Efficient: Cursor-based pagination
const { data } = await supabase
  .from('profiles')
  .select('*')
  .order('created_at', { ascending: false })
  .lt('created_at', cursorDate)
  .limit(24);

// Efficient: Select only needed fields
const { data } = await supabase
  .from('profiles')
  .select('user_id, username, data->displayName, data->avatarUrl')
  .limit(24);

// Efficient: Use materialized view
const { data } = await supabase
  .from('combined_events')
  .select('*')
  .gte('start_datetime', new Date().toISOString());
```

---

## Security Architecture

### Defense in Depth

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SECURITY LAYERS                                      │
└─────────────────────────────────────────────────────────────────────────────┘

Layer 1: Application
├─ Input validation (Zod schemas)
├─ XSS protection (React escaping)
├─ CSRF protection (SameSite cookies)
└─ Rate limiting (API routes)

Layer 2: Authentication
├─ Supabase Auth (secure session management)
├─ OAuth 2.0 (Google Sign-in)
├─ Password policies (via Supabase)
└─ Session expiration and refresh

Layer 3: Authorization
├─ Row Level Security (RLS) on all tables
├─ Role-based access (project members)
├─ Participant-based access (conversations)
└─ Service role for admin operations

Layer 4: Data
├─ Encryption at rest (Supabase managed)
├─ Encryption in transit (TLS 1.3)
├─ PII minimization (JSONB strategy)
└─ Data retention policies

Layer 5: Infrastructure
├─ Vercel Edge Network (DDoS protection)
├─ Supabase security (SOC 2)
└─ Dependency scanning (npm audit)
```

### RLS Security Model

```sql
-- All tables have RLS enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS for cron jobs
-- Anon key respects RLS policies
-- Authenticated users subject to user-specific policies
```

---

## Deployment & Operations

### Environment Configuration

```bash
# Required environment variables
NEXT_PUBLIC_SUPABASE_URL=           # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=      # Supabase anon key
SUPABASE_SERVICE_ROLE_KEY=          # For server-only operations

# AI Services
OPENROUTER_API_KEY=                 # AI model gateway
BRAVE_SEARCH_API_KEY=               # Web search
NEWSAPI_AI_KEY=                     # News aggregation

# Email
RESEND_API_KEY=                     # Email delivery
RESEND_FROM_EMAIL=                  # Sender address

# Google
GOOGLE_CLIENT_ID=                   # OAuth
GOOGLE_CLIENT_SECRET=               # OAuth
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=    # Maps
NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID=     # Map styling

# Cron Security
CRON_SECRET=                        # Protect cron endpoints
```

### Cron Jobs (Vercel)

```json
{
  "crons": [
    {
      "path": "/api/cron/discover-events?secret=CRON_SECRET",
      "schedule": "0 2 * * *"
    },
    {
      "path": "/api/cron/discover-events-eye?secret=CRON_SECRET",
      "schedule": "0 3 * * 0"
    },
    {
      "path": "/api/cron/ingest-challenges?secret=CRON_SECRET",
      "schedule": "0 */6 * * *"
    },
    {
      "path": "/api/cron/weekly-matching?secret=CRON_SECRET",
      "schedule": "0 12 * * 1"
    },
    {
      "path": "/api/cron/weekly-reminders?secret=CRON_SECRET",
      "schedule": "12 12 * * 2"
    }
  ]
}
```

### Cost Overview

| Service | Usage | Monthly Cost |
|---------|-------|--------------|
| Brave Search API | ~370 queries | Free (2,000 limit) |
| NewsAPI.ai | ~600 articles | Free (2,000 limit) |
| OpenRouter AI | ~8,000 calls | ~$1.70 |
| Nominatim | ~300 requests | Free |
| EventsEye | ~540 requests | Free |
| **Total** | | **~$1.70/month** |

---

## Future Architecture Directions

### Planned Enhancements

1. **Vector Search**: pgvector for semantic profile/event matching
2. **Collaborative Filtering**: User behavior-based recommendations
3. **Graph Database**: Neo4j for connection insights
4. **Edge Functions**: Supabase Edge Functions for AI processing
5. **Web Push**: Browser notifications for messages
6. **Mobile App**: React Native with shared API

### Scalability Considerations

- Current architecture supports ~10K users without changes
- Next scale point: 100K users requires:
  - Read replicas for database
  - CDN for static assets
  - Rate limiting per-user
  - Background job queue (Redis + Bull)

---

## Related Documentation

- [EXPLORE.md](./EXPLORE.md) — Map visualization and location features
- [MYPROFILE.md](./MYPROFILE.md) — Profile editing implementation
- [MESSAGES.md](./MESSAGES.md) — Messaging system details
- [WEEKLYMATCHING.md](./WEEKLYMATCHING.md) — Matching algorithm and emails
- [CHALLENGES_MODULE.md](../docs/CHALLENGES_MODULE.md) — Civic challenges
- [QUALITY-CONTROL.md](./QUALITY-CONTROL.md) — Profile quality system

---

*This architecture document is a living document. Update when making cross-cutting changes to the system.*
