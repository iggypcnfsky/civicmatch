-- Civic Challenges News Module
-- Stores geolocated civic challenges from news articles

-- Enable PostGIS extension for spatial queries (if not already enabled)
create extension if not exists postgis;

-- Challenges table
CREATE TABLE IF NOT EXISTS public.challenges (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Source article info
  source_uri      VARCHAR(255) NOT NULL,          -- NewsAPI.ai article URI (for dedup)
  source_url      VARCHAR(2048) NOT NULL,          -- Original article URL
  source_title    VARCHAR(500),                    -- Source publication name
  article_title   VARCHAR(500) NOT NULL,           -- Original article headline
  article_image   VARCHAR(2048),                   -- Article image URL
  published_at    TIMESTAMPTZ NOT NULL,            -- Article publication date
  
  -- AI-generated content
  title           VARCHAR(300) NOT NULL,           -- AI-generated challenge title
  summary         TEXT NOT NULL,                   -- AI-generated summary (1-3 sentences)
  call_to_action  TEXT,                            -- AI-generated CTA
  category        VARCHAR(50) NOT NULL,            -- environment, housing, transport, etc.
  subcategory     VARCHAR(100),                    -- water_pollution, gentrification, etc.
  severity        VARCHAR(20) DEFAULT 'medium',    -- low, medium, high, critical
  skills_needed   TEXT[],                          -- Array of skill tags
  
  -- Location
  location_name   VARCHAR(300) NOT NULL,           -- Human-readable location
  location_city   VARCHAR(200),
  location_country VARCHAR(200),
  latitude        DECIMAL(10, 7) NOT NULL,
  longitude       DECIMAL(10, 7) NOT NULL,
  geocode_query   VARCHAR(500),                    -- Query used for geocoding (for debugging)
  
  -- Metadata
  sentiment       DECIMAL(4, 3),                   -- Original article sentiment from NewsAPI.ai
  language        VARCHAR(10),                     -- Article language
  status          VARCHAR(20) DEFAULT 'active',   -- active, expired, flagged, hidden
  
  -- Timestamps
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  expires_at      TIMESTAMPTZ,                     -- Auto-expire old challenges
  
  -- Dedup
  CONSTRAINT unique_source_uri UNIQUE (source_uri),
  CONSTRAINT valid_category CHECK (category IN ('environment', 'housing', 'transport', 'public_safety', 'governance', 'education', 'health', 'climate')),
  CONSTRAINT valid_severity CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  CONSTRAINT valid_status CHECK (status IN ('active', 'expired', 'flagged', 'hidden'))
);

-- Indexes for map queries
CREATE INDEX IF NOT EXISTS idx_challenges_location ON public.challenges USING GIST (
  ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
);
CREATE INDEX IF NOT EXISTS idx_challenges_category ON public.challenges (category);
CREATE INDEX IF NOT EXISTS idx_challenges_status ON public.challenges (status);
CREATE INDEX IF NOT EXISTS idx_challenges_created ON public.challenges (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_challenges_severity ON public.challenges (severity);
CREATE INDEX IF NOT EXISTS idx_challenges_expires ON public.challenges (expires_at);
CREATE INDEX IF NOT EXISTS idx_challenges_lat_lng ON public.challenges (latitude, longitude);

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_challenges_search ON public.challenges 
USING gin(to_tsvector('english', title || ' ' || COALESCE(summary, '') || ' ' || COALESCE(location_name, '')));

-- Geocode cache table
CREATE TABLE IF NOT EXISTS public.geocode_cache (
  query        VARCHAR(500) PRIMARY KEY,
  latitude     DECIMAL(10, 7) NOT NULL,
  longitude    DECIMAL(10, 7) NOT NULL,
  display_name VARCHAR(500),
  cached_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_geocode_cache_at ON public.geocode_cache (cached_at);

-- Function to auto-update updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Trigger for challenges updated_at
CREATE TRIGGER challenges_set_updated_at
BEFORE UPDATE ON public.challenges
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Function to auto-set expires_at based on published_at
CREATE OR REPLACE FUNCTION set_challenge_expires_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- Set expires_at to 14 days after published_at if not set
  IF NEW.expires_at IS NULL THEN
    NEW.expires_at := NEW.published_at + INTERVAL '14 days';
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger for auto-setting expires_at
CREATE TRIGGER challenges_set_expires_at
BEFORE INSERT ON public.challenges
FOR EACH ROW EXECUTE FUNCTION set_challenge_expires_at();

-- Row Level Security
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.geocode_cache ENABLE ROW LEVEL SECURITY;

-- Everyone can read active challenges
CREATE POLICY "challenges_select_active" ON public.challenges
  FOR SELECT USING (status = 'active');

-- Only service role can insert/update/delete
CREATE POLICY "challenges_service_insert" ON public.challenges
  FOR INSERT WITH CHECK (false); -- Insert only via service role

CREATE POLICY "challenges_service_update" ON public.challenges
  FOR UPDATE USING (false);

CREATE POLICY "challenges_service_delete" ON public.challenges
  FOR DELETE USING (false);

-- Geocode cache policies (read-only for all, write only via service)
CREATE POLICY "geocode_cache_select_all" ON public.geocode_cache
  FOR SELECT USING (true);

CREATE POLICY "geocode_cache_service_insert" ON public.geocode_cache
  FOR INSERT WITH CHECK (false);

CREATE POLICY "geocode_cache_service_update" ON public.geocode_cache
  FOR UPDATE USING (false);

-- Function to expire old challenges (can be called by cron)
CREATE OR REPLACE FUNCTION expire_old_challenges()
RETURNS TABLE(expired_count INT) LANGUAGE plpgsql AS $$
DECLARE
  count INT;
BEGIN
  UPDATE public.challenges 
  SET status = 'expired' 
  WHERE expires_at < NOW() 
    AND status = 'active';
  
  GET DIAGNOSTICS count = ROW_COUNT;
  RETURN QUERY SELECT count;
END;
$$;

-- Clean old geocode cache entries (older than 30 days)
CREATE OR REPLACE FUNCTION clean_geocode_cache()
RETURNS TABLE(deleted_count INT) LANGUAGE plpgsql AS $$
DECLARE
  count INT;
BEGIN
  DELETE FROM public.geocode_cache 
  WHERE cached_at < NOW() - INTERVAL '30 days';
  
  GET DIAGNOSTICS count = ROW_COUNT;
  RETURN QUERY SELECT count;
END;
$$;

-- Category counts view for filtering UI
CREATE OR REPLACE VIEW public.challenge_category_stats AS
SELECT 
  category,
  COUNT(*) as count,
  COUNT(*) FILTER (WHERE severity = 'critical') as critical_count,
  COUNT(*) FILTER (WHERE severity = 'high') as high_count,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as new_24h
FROM public.challenges
WHERE status = 'active'
GROUP BY category;

-- Nearby challenges function (for finding challenges near a point)
CREATE OR REPLACE FUNCTION nearby_challenges(
  lat DECIMAL,
  lng DECIMAL,
  radius_km DECIMAL DEFAULT 10,
  max_results INT DEFAULT 50
)
RETURNS TABLE(
  id UUID,
  title VARCHAR,
  category VARCHAR,
  severity VARCHAR,
  latitude DECIMAL,
  longitude DECIMAL,
  distance_km DECIMAL
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.title,
    c.category,
    c.severity,
    c.latitude,
    c.longitude,
    (ST_DistanceSphere(
      ST_MakePoint(c.longitude, c.latitude),
      ST_MakePoint(lng, lat)
    ) / 1000)::DECIMAL as distance_km
  FROM public.challenges c
  WHERE c.status = 'active'
    AND ST_DWithinSphere(
      ST_MakePoint(c.longitude, c.latitude)::geometry,
      ST_MakePoint(lng, lat)::geometry,
      radius_km * 1000
    )
  ORDER BY distance_km
  LIMIT max_results;
END;
$$;
