-- EventsEye Integration Support
-- Adds necessary columns and updates constraints for EventsEye source

-- 1. Add relevance_reason column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'discovered_events' AND column_name = 'relevance_reason'
  ) THEN
    ALTER TABLE public.discovered_events ADD COLUMN relevance_reason TEXT;
  END IF;
END $$;

-- 2. Update source_type constraint to include 'eventseye'
ALTER TABLE public.discovered_events 
  DROP CONSTRAINT IF EXISTS valid_source_type;

ALTER TABLE public.discovered_events 
  ADD CONSTRAINT valid_source_type 
  CHECK (source_type IN ('brave_search', 'newsapi', 'eventseye'));

-- 3. Update ai_confidence constraint to include 'listing_only' for EventsEye
ALTER TABLE public.discovered_events 
  DROP CONSTRAINT IF EXISTS valid_ai_confidence;

ALTER TABLE public.discovered_events 
  ADD CONSTRAINT valid_ai_confidence 
  CHECK (ai_confidence IS NULL OR ai_confidence IN ('complete', 'partial', 'low', 'listing_only'));

-- 4. Recreate the stats view to include eventseye_count
DROP VIEW IF EXISTS public.discovered_events_stats;

CREATE OR REPLACE VIEW public.discovered_events_stats AS
SELECT 
  COUNT(*) FILTER (WHERE status = 'active') AS active_count,
  COUNT(*) FILTER (WHERE status = 'active' AND start_date >= CURRENT_DATE AND start_date < CURRENT_DATE + INTERVAL '7 days') AS this_week,
  COUNT(*) FILTER (WHERE status = 'active' AND start_date >= CURRENT_DATE AND start_date < CURRENT_DATE + INTERVAL '30 days') AS this_month,
  COUNT(*) FILTER (WHERE discovered_at > NOW() - INTERVAL '24 hours') AS new_24h,
  COUNT(*) FILTER (WHERE source_type = 'brave_search') AS brave_search_count,
  COUNT(*) FILTER (WHERE source_type = 'newsapi') AS newsapi_count,
  COUNT(*) FILTER (WHERE source_type = 'eventseye') AS eventseye_count
FROM public.discovered_events;

-- 5. Add comment explaining the listing_only confidence level
COMMENT ON COLUMN public.discovered_events.ai_confidence IS 
  'AI confidence level: complete (all fields), partial (essential fields), low (minimal data), listing_only (from directory listing without detail page)';
