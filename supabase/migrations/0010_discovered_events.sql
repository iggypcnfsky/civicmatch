-- Discovered Events Module
-- Stores civic tech events discovered via NewsAPI.ai and Brave Search API

-- Enable pg_trgm extension for fuzzy string matching (deduplication)
create extension if not exists pg_trgm;

-- Discovered events table
CREATE TABLE IF NOT EXISTS public.discovered_events (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Event details (AI-extracted)
  name              VARCHAR(500) NOT NULL,
  description       TEXT,
  event_type        VARCHAR(50) NOT NULL,           -- conference, hackathon, meetup, etc.
  tags              TEXT[],                         -- civic tech, open data, democracy, etc.
  
  -- Dates
  start_date        DATE,
  end_date          DATE,
  start_time        TIME,
  end_time          TIME,
  timezone          VARCHAR(100),
  
  -- Location
  location_name     VARCHAR(500),                   -- Venue name
  location_city     VARCHAR(200),
  location_country  VARCHAR(200),
  latitude          DECIMAL(10, 7),                 -- NULL for online events
  longitude         DECIMAL(10, 7),
  is_online         BOOLEAN DEFAULT false,
  is_hybrid         BOOLEAN DEFAULT false,
  
  -- Links
  event_url         VARCHAR(2048),                  -- Main event page
  registration_url  VARCHAR(2048),                  -- Where to sign up
  source_url        VARCHAR(2048) NOT NULL,         -- Where we found it (search result URL)
  source_type       VARCHAR(50) NOT NULL,           -- 'brave_search', 'newsapi'
  source_urls       TEXT[],                         -- All source URLs that referenced this event
  
  -- Organizer
  organizer         VARCHAR(300),
  
  -- Cost
  cost              VARCHAR(20) DEFAULT 'unknown',  -- free, paid, donation, unknown
  cost_details      VARCHAR(500),                   -- "€50 early bird, €100 regular"
  
  -- Quality signals
  relevance_score   INTEGER,                        -- 0-100 from AI
  ai_confidence     VARCHAR(20),                    -- complete, partial, low
  
  -- Metadata
  status            VARCHAR(20) DEFAULT 'active',   -- active, expired, flagged, hidden, merged
  merged_into       UUID REFERENCES public.discovered_events(id),  -- if merged as duplicate
  
  -- Timestamps
  discovered_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  
  -- Dedup support
  name_normalized   VARCHAR(500),                   -- lowercase, stripped version for dedup
  
  -- Constraints
  CONSTRAINT valid_event_type CHECK (event_type IN ('conference', 'hackathon', 'meetup', 'workshop', 'summit', 'webinar', 'training', 'festival', 'other')),
  CONSTRAINT valid_cost CHECK (cost IN ('free', 'paid', 'donation', 'unknown')),
  CONSTRAINT valid_status CHECK (status IN ('active', 'expired', 'flagged', 'hidden', 'merged')),
  CONSTRAINT valid_ai_confidence CHECK (ai_confidence IS NULL OR ai_confidence IN ('complete', 'partial', 'low')),
  CONSTRAINT valid_relevance_score CHECK (relevance_score IS NULL OR (relevance_score >= 0 AND relevance_score <= 100))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_disc_events_dates ON public.discovered_events (start_date);
CREATE INDEX IF NOT EXISTS idx_disc_events_status ON public.discovered_events (status);
CREATE INDEX IF NOT EXISTS idx_disc_events_type ON public.discovered_events (event_type);
CREATE INDEX IF NOT EXISTS idx_disc_events_location ON public.discovered_events (latitude, longitude) WHERE latitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_disc_events_city ON public.discovered_events (location_city);
CREATE INDEX IF NOT EXISTS idx_disc_events_relevance ON public.discovered_events (relevance_score DESC);
CREATE INDEX IF NOT EXISTS idx_disc_events_source_type ON public.discovered_events (source_type);
CREATE INDEX IF NOT EXISTS idx_disc_events_discovered ON public.discovered_events (discovered_at DESC);

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_disc_events_search ON public.discovered_events 
USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '') || ' ' || COALESCE(location_city, '')));

-- Fuzzy name matching index for deduplication
CREATE INDEX IF NOT EXISTS idx_disc_events_name_trgm ON public.discovered_events USING gin (name gin_trgm_ops);

-- Unique constraint on event_url (if provided)
CREATE UNIQUE INDEX IF NOT EXISTS idx_disc_events_event_url_unique ON public.discovered_events (event_url) WHERE event_url IS NOT NULL;

-- Trigger for updated_at
CREATE TRIGGER discovered_events_set_updated_at
BEFORE UPDATE ON public.discovered_events
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Function to normalize event name for dedup
CREATE OR REPLACE FUNCTION normalize_event_name(name TEXT)
RETURNS TEXT LANGUAGE plpgsql AS $$
BEGIN
  RETURN regexp_replace(
    regexp_replace(
      regexp_replace(
        regexp_replace(
          lower(name),
          '[^a-z0-9\s]', '', 'g'           -- remove punctuation
        ),
        '\b(the|a|an|in|at|for|of|on|to|and|or)\b', '', 'g'  -- remove articles/prepositions
      ),
      '\b(20\d{2})\b', '', 'g'              -- remove year
    ),
    '\s+', ' ', 'g'                        -- normalize whitespace
  );
END;
$$;

-- Function to auto-normalize name on insert/update
CREATE OR REPLACE FUNCTION set_event_name_normalized()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.name_normalized := normalize_event_name(NEW.name);
  RETURN NEW;
END;
$$;

CREATE TRIGGER discovered_events_set_normalized
BEFORE INSERT OR UPDATE ON public.discovered_events
FOR EACH ROW EXECUTE FUNCTION set_event_name_normalized();

-- Row Level Security
ALTER TABLE public.discovered_events ENABLE ROW LEVEL SECURITY;

-- Everyone can read active discovered events with sufficient relevance
CREATE POLICY "discovered_events_select_active" ON public.discovered_events
  FOR SELECT USING (status = 'active' AND relevance_score >= 60);

-- Only service role can insert/update/delete
CREATE POLICY "discovered_events_service_insert" ON public.discovered_events
  FOR INSERT WITH CHECK (false);

CREATE POLICY "discovered_events_service_update" ON public.discovered_events
  FOR UPDATE USING (false);

CREATE POLICY "discovered_events_service_delete" ON public.discovered_events
  FOR DELETE USING (false);

-- Function to expire old events
CREATE OR REPLACE FUNCTION expire_old_events()
RETURNS TABLE(expired_count INT) LANGUAGE plpgsql AS $$
DECLARE
  count INT;
BEGIN
  UPDATE public.discovered_events 
  SET status = 'expired' 
  WHERE status = 'active'
    AND (
      (end_date IS NOT NULL AND end_date < CURRENT_DATE)
      OR (end_date IS NULL AND start_date < CURRENT_DATE - INTERVAL '3 days')
    );
  
  GET DIAGNOSTICS count = ROW_COUNT;
  RETURN QUERY SELECT count;
END;
$$;

-- View for combining user events and discovered events
CREATE OR REPLACE VIEW public.combined_events AS
(
  SELECT 
    e.id,
    e.data->>'title' AS name,
    e.data->>'description' AS description,
    e.creator_id,
    NULL::VARCHAR AS organizer,
    (e.data->>'startDateTime')::timestamptz AS start_datetime,
    (e.data->>'endDateTime')::timestamptz AS end_datetime,
    (e.data->'location'->>'displayName')::VARCHAR AS location_name,
    NULL::VARCHAR AS location_city,
    NULL::VARCHAR AS location_country,
    ((e.data->'location'->>'coordinates')::jsonb->>'lat')::DECIMAL AS latitude,
    ((e.data->'location'->>'coordinates')::jsonb->>'lng')::DECIMAL AS longitude,
    (e.data->>'isOnline')::BOOLEAN AS is_online,
    FALSE AS is_hybrid,
    NULL::VARCHAR AS event_type,
    NULL::TEXT[] AS tags,
    NULL::VARCHAR AS cost,
    NULL::VARCHAR AS event_url,
    e.data->>'meetingUrl' AS registration_url,
    NULL::INTEGER AS relevance_score,
    'user_submitted'::VARCHAR AS source,
    e.created_at,
    NULL::TIMESTAMPTZ AS discovered_at
  FROM public.events e
  WHERE (e.data->>'startDateTime')::timestamptz >= NOW()
)
UNION ALL
(
  SELECT 
    id,
    name,
    description,
    NULL::UUID AS creator_id,
    organizer,
    (start_date || ' ' || COALESCE(start_time::TEXT, '00:00'))::timestamptz AS start_datetime,
    (end_date || ' ' || COALESCE(end_time::TEXT, '23:59'))::timestamptz AS end_datetime,
    location_name,
    location_city,
    location_country,
    latitude,
    longitude,
    is_online,
    is_hybrid,
    event_type,
    tags,
    cost,
    event_url,
    registration_url,
    relevance_score,
    'discovered'::VARCHAR AS source,
    discovered_at AS created_at,
    discovered_at
  FROM public.discovered_events
  WHERE status = 'active'
    AND relevance_score >= 60
    AND (end_date IS NULL OR end_date >= CURRENT_DATE)
)
ORDER BY start_datetime ASC;

-- Stats view for discovered events
CREATE OR REPLACE VIEW public.discovered_events_stats AS
SELECT 
  COUNT(*) FILTER (WHERE status = 'active') AS active_count,
  COUNT(*) FILTER (WHERE status = 'active' AND start_date >= CURRENT_DATE AND start_date < CURRENT_DATE + INTERVAL '7 days') AS this_week,
  COUNT(*) FILTER (WHERE status = 'active' AND start_date >= CURRENT_DATE AND start_date < CURRENT_DATE + INTERVAL '30 days') AS this_month,
  COUNT(*) FILTER (WHERE discovered_at > NOW() - INTERVAL '24 hours') AS new_24h,
  COUNT(*) FILTER (WHERE source_type = 'brave_search') AS brave_search_count,
  COUNT(*) FILTER (WHERE source_type = 'newsapi') AS newsapi_count
FROM public.discovered_events;
