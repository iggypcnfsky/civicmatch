# CivicMatch Civic Challenges Module

This module adds a "Civic Challenges" layer to the CivicMatch map, displaying geolocated news articles representing real-world civic problems. Users see challenges near them alongside existing people, projects, and events — enabling discovery of problems and the nearby volunteers/projects that could address them.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    INGESTION PIPELINE                    │
│              (Backend cron job, every 4-6 hours)         │
│                                                         │
│  1. NewsAPI.ai  ──→  2. OpenRouter AI  ──→  3. Nominatim│
│     (fetch          (filter, classify,     (geocode      │
│      articles)       extract location,      location     │
│                      generate summary)                    │
│                              │                           │
│                              ▼                           │
│                   4. Database                            │
│                   (challenges table)                     │
│                          │                               │
│                          ▼                               │
│               5. CivicMatch Map UI                       │
│               (new challenge layer)                      │
└─────────────────────────────────────────────────────────┘
```

## Components

### 1. Database Schema

**File:** `supabase/migrations/0009_challenges.sql`

New tables:
- `challenges` - Stores civic challenges with location, metadata, and AI-generated content
- `geocode_cache` - Caches Nominatim geocoding results

Key features:
- PostGIS spatial indexing for efficient map queries
- Full-text search support
- Automatic expiration after 14 days
- Category and severity constraints

### 2. TypeScript Types

**File:** `src/types/challenge.ts`

Defines all types for:
- Challenge data structures
- Category and severity enums
- API response types
- Helper functions for category colors and labels

### 3. Service Layer

**Files:**
- `src/lib/services/NewsApiService.ts` - NewsAPI.ai client
- `src/lib/services/OpenRouterService.ts` - OpenRouter AI client
- `src/lib/services/NominatimService.ts` - OpenStreetMap geocoding
- `src/lib/services/ChallengeService.ts` - Coordination and DB operations

### 4. API Endpoints

**Files:**
- `src/app/api/challenges/route.ts` - GET challenges in bounding box
- `src/app/api/challenges/[id]/route.ts` - GET single challenge
- `src/app/api/challenges/categories/route.ts` - GET category stats
- `src/app/api/cron/ingest-challenges/route.ts` - Cron job for ingestion

### 5. Frontend Components

**Files:**
- `src/components/ExploreMap.tsx` - Updated with challenge layer
- `src/components/challenge/ChallengeMarker.tsx` - Triangle warning markers
- `src/components/challenge/ChallengeDetail.tsx` - Hover/click detail panel
- `src/components/challenge/ChallengeFilter.tsx` - Category/severity filters
- `src/lib/hooks/useChallenges.ts` - React hooks for data fetching

### 6. Explore Page Integration

**File:** `src/app/explore/page.tsx`

Updated with:
- Challenges tab in the sidebar
- Challenge filter panel on the map
- Real-time challenge loading based on map bounds

## Environment Variables

Add these to your `.env` file:

```env
# NewsAPI.ai (get free key at https://newsapi.ai/)
NEWSAPI_AI_KEY=your_newsapi_key_here

# OpenRouter (get key at https://openrouter.ai/)
OPENROUTER_API_KEY=your_openrouter_key_here
OPENROUTER_MODEL=google/gemini-2.0-flash-001  # optional, defaults to this

# Nominatim User Agent (required for OpenStreetMap geocoding)
NOMINATIM_USER_AGENT=CivicMatch/1.0 (contact@yourdomain.com)

# Cron Secret (for securing the ingestion endpoint)
CRON_SECRET=your_random_secret_here
```

## Setup Instructions

### 1. Apply Database Migration

```bash
# Using Supabase CLI
supabase db push

# Or run the SQL directly in Supabase Dashboard
# Copy contents of supabase/migrations/0009_challenges.sql
```

### 2. Configure Environment Variables

Add the environment variables listed above to your `.env` file.

### 3. Set Up Vercel Cron (Optional)

Add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/ingest-challenges?secret=your_cron_secret",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

### 4. Manual Trigger

You can manually trigger ingestion by visiting:
```
https://your-domain.com/api/cron/ingest-challenges?secret=your_cron_secret
```

## Category Configuration

Challenges are categorized into 8 types:

| Category | Keywords | Color |
|----------|----------|-------|
| Environment | pollution, contamination, waste, deforestation | Green |
| Housing | housing crisis, homelessness, eviction, gentrification | Orange |
| Transport | transit, traffic, road safety, public transport | Blue |
| Public Safety | crime, public safety, emergency services | Red |
| Governance | corruption, transparency, civic participation | Purple |
| Education | school funding, education access, digital divide | Yellow |
| Health | healthcare access, mental health, public health | Pink |
| Climate | flood, drought, wildfire, extreme weather | Teal |

## Severity Levels

| Level | Color | Description |
|-------|-------|-------------|
| Critical | Red | Urgent, life-threatening issues |
| High | Orange | Serious problems requiring attention |
| Medium | Yellow | Moderate issues |
| Low | Green | Minor concerns |

## Cost Estimation

| Service | Usage | Cost |
|---------|-------|------|
| NewsAPI.ai | ~960 searches/month | Free (under 2,000 limit) |
| OpenRouter (Gemini Flash) | ~48,000 articles/month | ~$5/month |
| Nominatim | ~500 geocode requests/month | Free |
| **Total** | | **~$5/month** |

## API Reference

### GET /api/challenges

Returns challenges within a bounding box.

**Query Parameters:**
- `north` (required) - North latitude
- `south` (required) - South latitude
- `east` (required) - East longitude
- `west` (required) - West longitude
- `categories` (optional) - Comma-separated category list
- `severity` (optional) - Minimum severity (low, medium, high, critical)
- `limit` (optional) - Max results (default 50, max 200)

**Example:**
```
GET /api/challenges?north=50.12&south=49.95&east=20.15&west=19.80&categories=environment,climate&limit=50
```

### GET /api/challenges/:id

Returns a single challenge with full details.

### GET /api/challenges/categories

Returns category statistics for the filter UI.

## Customization

### Adding New Categories

1. Update `NEWS_CATEGORIES` in `src/lib/services/NewsApiService.ts`
2. Add category to the `ChallengeCategory` type in `src/types/challenge.ts`
3. Add category info to `CHALLENGE_CATEGORIES` array
4. Update the database constraint in the migration

### Adjusting AI Prompts

Edit the `SYSTEM_PROMPT` in `src/lib/services/OpenRouterService.ts` to customize how articles are filtered and classified.

### Changing Expiration Period

Modify the `set_challenge_expires_at` function in the migration:
```sql
NEW.expires_at := NEW.published_at + INTERVAL '14 days'; -- Change 14 to your preference
```

## Troubleshooting

### No challenges appearing on map
- Check that the cron job has run at least once
- Verify API keys are set correctly
- Check browser console for errors
- Verify database has challenges: `SELECT COUNT(*) FROM challenges;`

### Geocoding failures
- Check Nominatim rate limits (max 1 req/sec)
- Verify User-Agent is set correctly
- Check geocode_cache table for cached results

### AI filtering too aggressive/lenient
- Adjust the SYSTEM_PROMPT in OpenRouterService
- Try a different model (e.g., `anthropic/claude-3.5-haiku`)
- Tune the `temperature` parameter

## Attribution

This module uses:
- [NewsAPI.ai](https://newsapi.ai/) (formerly Event Registry) for news data
- [OpenRouter](https://openrouter.ai/) for AI processing
- [Nominatim](https://nominatim.org/) (OpenStreetMap) for geocoding

When using Nominatim data, you must display "© OpenStreetMap contributors" somewhere in your application.

## Future Enhancements

- [ ] User manual challenge submission
- [ ] Challenge → Project conversion flow
- [ ] Skill-based challenge matching
- [ ] Push notifications for nearby challenges
- [ ] GDELT as supplementary data source
- [ ] Polish RSS feed ingestion
- [ ] Challenge bookmarking/claiming
- [ ] Related projects and people suggestions
