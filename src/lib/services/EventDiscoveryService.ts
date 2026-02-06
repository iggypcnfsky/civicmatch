// Event Discovery Service - coordinates event ingestion from multiple sources
// Combines Brave Search API, NewsAPI.ai, EventsEye, OpenRouter AI extraction, and geocoding

import { SupabaseClient } from '@supabase/supabase-js';
import type { 
  DiscoveredEvent, 
  AIEventExtraction, 
  EventType, 
  EventCost,
  EventSourceType,
  BraveSearchResult,
  BoundingBox,
  DiscoveredEventsStats
} from '@/types/discoveredEvent';
import type { NewsApiArticle, GeocodeCacheEntry } from '@/types/challenge';

// Extended type for Brave Search with full page content
type BraveSearchResultWithPage = BraveSearchResult & { pageText: string };
import { BRAVE_QUERY_GROUPS, NEWSAPI_EVENT_KEYWORDS } from '@/types/discoveredEvent';
import { createBraveSearchService } from './BraveSearchService';
import { createNominatimService } from './NominatimService';
import { createPageFetchService } from './PageFetchService';
import { NewsApiService } from './NewsApiService';
import { createOpenRouterServiceForEvents } from './OpenRouterService';
import { 
  createEventsEyeScraperService, 
  createEventsEyeFilterService,
  EventsEyeFilterService,
  type RawEventsEyeEvent,
  type FilteredEventsEyeEvent 
} from './EventsEyeService';

export class EventDiscoveryService {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  // ==================== Database Operations ====================

  /**
   * Check if a source URL has already been processed
   */
  async isSourceProcessed(sourceUrl: string): Promise<boolean> {
    const normalized = this.normalizeUrl(sourceUrl);
    
    const { data, error } = await this.supabase
      .from('discovered_events')
      .select('id')
      .or(`source_url.eq.${normalized},source_urls.cs.{${normalized}}`)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking source URL:', error);
    }

    return !!data;
  }

  /**
   * Look up geocode cache
   */
  async getGeocodeCache(query: string): Promise<GeocodeCacheEntry | null> {
    const { data, error } = await this.supabase
      .from('geocode_cache')
      .select('*')
      .eq('query', query)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error looking up geocode cache:', error);
    }

    return data || null;
  }

  /**
   * Store geocode cache entry
   */
  async setGeocodeCache(entry: {
    query: string;
    latitude: number;
    longitude: number;
    display_name: string | null;
  }): Promise<void> {
    const { error } = await this.supabase
      .from('geocode_cache')
      .upsert({
        ...entry,
        cached_at: new Date().toISOString(),
      });

    if (error) {
      console.error('Error storing geocode cache:', error);
    }
  }

  /**
   * Find duplicate events based on name, date, and location
   */
  async findDuplicate(
    name: string,
    startDate: string | null,
    city: string | null,
    eventUrl: string | null
  ): Promise<DiscoveredEvent | null> {
    // Check by event URL first
    if (eventUrl) {
      const { data: urlMatch } = await this.supabase
        .from('discovered_events')
        .select('*')
        .eq('event_url', eventUrl)
        .eq('status', 'active')
        .single();
      
      if (urlMatch) return urlMatch as DiscoveredEvent;
    }

    // Check by fuzzy name matching + overlapping dates + same city
    if (startDate && city) {
      const { data: fuzzyMatches } = await this.supabase
        .from('discovered_events')
        .select('*')
        .eq('status', 'active')
        .eq('location_city', city)
        .gte('start_date', this.addDays(startDate, -3))
        .lte('start_date', this.addDays(startDate, 3))
        .filter('name', 'ilike', `%${name.substring(0, 20)}%`)
        .limit(5);

      if (fuzzyMatches && fuzzyMatches.length > 0) {
        // Return best match
        return fuzzyMatches[0] as DiscoveredEvent;
      }
    }

    return null;
  }

  /**
   * Check for duplicates in user-submitted events
   */
  async findDuplicateInUserEvents(
    name: string,
    startDate: string | null,
    city: string | null
  ): Promise<boolean> {
    if (!startDate) return false;

    const { data, error } = await this.supabase
      .from('combined_events')
      .select('id')
      .eq('source', 'user_submitted')
      .gte('start_datetime', new Date(this.addDays(startDate, -3)).toISOString())
      .lte('start_datetime', new Date(this.addDays(startDate, 3)).toISOString())
      .ilike('name', `%${name.substring(0, 20)}%`)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking user events:', error);
    }

    return !!data;
  }

  /**
   * Store a new discovered event
   */
  async storeEvent(
    extraction: AIEventExtraction,
    sourceUrl: string,
    sourceType: EventSourceType
  ): Promise<DiscoveredEvent | null> {
    if (!extraction.is_event || !extraction.event) {
      return null;
    }

    const event = extraction.event;

    // Check for duplicates first
    const existing = await this.findDuplicate(
      event.name,
      event.start_date,
      event.location_city,
      event.event_url
    );

    if (existing) {
      // Merge: update missing fields, add source URL
      return this.mergeIntoExisting(existing, event, sourceUrl);
    }

    // Check against user-submitted events
    const isUserEvent = await this.findDuplicateInUserEvents(
      event.name,
      event.start_date,
      event.location_city
    );

    if (isUserEvent) {
      console.log('Discovered event matches user-submitted event, skipping:', event.name);
      return null;
    }

    // Geocode if location provided
    let coordinates: { lat: number; lng: number; display_name: string } | null = null;
    if (event.geocode_query && !event.is_online) {
      const nominatim = createNominatimService();
      coordinates = await nominatim.geocodeWithCache(
        event.geocode_query,
        (q) => this.getGeocodeCache(q),
        (e) => this.setGeocodeCache(e),
        event.location_city && event.location_country
          ? { city: event.location_city, country: event.location_country }
          : undefined
      );
    }

    // Insert new event
    const { data, error } = await this.supabase
      .from('discovered_events')
      .insert({
        name: event.name,
        description: event.description,
        event_type: event.event_type,
        tags: event.tags,
        start_date: event.start_date,
        end_date: event.end_date,
        start_time: event.start_time,
        end_time: event.end_time,
        timezone: event.timezone,
        location_name: event.location_name,
        location_city: event.location_city,
        location_country: event.location_country,
        latitude: coordinates?.lat ?? null,
        longitude: coordinates?.lng ?? null,
        is_online: event.is_online,
        is_hybrid: event.is_hybrid,
        event_url: event.event_url,
        registration_url: event.registration_url,
        source_url: sourceUrl,
        source_type: sourceType,
        source_urls: [sourceUrl],
        organizer: event.organizer,
        cost: event.cost,
        cost_details: event.cost_details,
        relevance_score: event.relevance_score,
        ai_confidence: this.calculateConfidence(event),
        status: 'active',
      })
      .select()
      .single();

    if (error) {
      // Check for unique constraint violation
      if (error.code === '23505') {
        console.log('Event already exists (URL duplicate):', event.event_url);
        return null;
      }
      console.error('Error storing discovered event:', error);
      throw error;
    }

    return data as DiscoveredEvent;
  }

  /**
   * Merge new event data into existing record
   */
  private async mergeIntoExisting(
    existing: DiscoveredEvent,
    newEvent: AIEventExtraction['event'],
    newSourceUrl: string
  ): Promise<DiscoveredEvent> {
    if (!newEvent) return existing;

    // Build update object with non-null new values
    const updates: Partial<DiscoveredEvent> = {};
    
    if (!existing.description && newEvent.description) updates.description = newEvent.description;
    if (!existing.registration_url && newEvent.registration_url) updates.registration_url = newEvent.registration_url;
    if (!existing.event_url && newEvent.event_url) updates.event_url = newEvent.event_url;
    if (!existing.organizer && newEvent.organizer) updates.organizer = newEvent.organizer;
    if (!existing.cost_details && newEvent.cost_details) updates.cost_details = newEvent.cost_details;
    if (existing.cost === 'unknown' && newEvent.cost !== 'unknown') updates.cost = newEvent.cost;

    // Add new source URL
    const sourceUrls = existing.source_urls || [];
    if (!sourceUrls.includes(newSourceUrl)) {
      updates.source_urls = [...sourceUrls, newSourceUrl];
    }

    // Only update if there are changes
    if (Object.keys(updates).length === 0) {
      return existing;
    }

    const { data, error } = await this.supabase
      .from('discovered_events')
      .update(updates)
      .eq('id', existing.id)
      .select()
      .single();

    if (error) {
      console.error('Error merging event:', error);
      return existing;
    }

    return data as DiscoveredEvent;
  }

  /**
   * Calculate AI confidence based on completeness
   */
  private calculateConfidence(event: AIEventExtraction['event']): 'complete' | 'partial' | 'low' {
    if (!event) return 'low';
    
    let score = 0;
    if (event.name) score++;
    if (event.start_date) score++;
    if (event.location_city || event.is_online) score++;
    if (event.description) score++;
    if (event.event_url || event.registration_url) score++;
    if (event.organizer) score++;

    if (score >= 5) return 'complete';
    if (score >= 3) return 'partial';
    return 'low';
  }

  // ==================== AI Processing ====================

  private openRouterService = createOpenRouterServiceForEvents();

  /**
   * Process a search result with AI extraction
   */
  async processWithAI(
    result: BraveSearchResult | NewsApiArticle,
    sourceType: EventSourceType | 'brave_snippet' | 'brave_fullpage'
  ): Promise<AIEventExtraction> {
    let content: string;

    if ('body' in result) {
      // NewsAPI article
      content = `Article title: ${result.title}\nURL: ${result.url}\nArticle body:\n${result.body.substring(0, 3000)}`;
    } else if (sourceType === 'brave_fullpage') {
      // Brave Search with full page content
      content = `Title: ${result.title}\nURL: ${result.url}\nPage content:\n${(result as BraveSearchResultWithPage).pageText}`;
    } else {
      // Brave Search snippet only
      content = `Title: ${result.title}\nURL: ${result.url}\nDescription: ${result.description}`;
    }

    const today = new Date().toISOString().split('T')[0];

    // Use OpenRouter service with model fallback
    return this.openRouterService.analyzeForEvent(content, sourceType, today);
  }

  /**
   * Process result with snippet-first, fetch-on-demand strategy
   */
  async processSearchResult(
    result: BraveSearchResult,
    pageFetchService: ReturnType<typeof import('./PageFetchService').createPageFetchService>
  ): Promise<AIEventExtraction | null> {
    // Try snippet first
    let aiResult = await this.processWithAI(result, 'brave_snippet');

    // If not an event but needs more info, fetch full page
    if (!aiResult.is_event && aiResult.reason?.toLowerCase().includes('need more')) {
      console.log('Fetching full page for:', result.url);
      const pageContent = await pageFetchService.fetchAndExtract(result.url);
      
      if (pageContent) {
        const resultWithPage: BraveSearchResultWithPage = { ...result, pageText: pageContent };
        aiResult = await this.processWithAI(resultWithPage, 'brave_fullpage');
      }
    }

    return aiResult;
  }

  // ==================== Ingestion Pipeline ====================

  /**
   * Run the full event discovery pipeline
   */
  async runDiscoveryPipeline(options: {
    onProgress?: (message: string) => void;
    skipBrave?: boolean;
    skipNewsAPI?: boolean;
  } = {}): Promise<{
    brave: { processed: number; accepted: number; errors: number };
    newsapi: { processed: number; accepted: number; errors: number };
  }> {
    const { onProgress, skipBrave = false, skipNewsAPI = false } = options;
    
    const braveStats = { processed: 0, accepted: 0, errors: 0 };
    const newsapiStats = { processed: 0, accepted: 0, errors: 0 };

    // Initialize services
    const pageFetchService = createPageFetchService();

    // ===== SOURCE B: Brave Search =====
    if (!skipBrave && process.env.BRAVE_SEARCH_API_KEY) {
      onProgress?.('Starting Brave Search discovery...');
      
      try {
        const braveSearch = createBraveSearchService();
        const todayQueries = braveSearch.getTodaysQueries(BRAVE_QUERY_GROUPS);
        
        onProgress?.(`Running ${todayQueries.length} Brave Search queries...`);

        for (const query of todayQueries) {
          try {
            const results = await braveSearch.search(query, {
              count: 20,
              freshness: 'pm',  // past month
            });

            onProgress?.(`Query "${query.substring(0, 40)}...": ${results.length} results`);

            for (const result of results) {
              try {
                // Skip already processed URLs
                if (await this.isSourceProcessed(result.url)) {
                  continue;
                }
                if (pageFetchService.isProcessed(result.url)) {
                  continue;
                }

                braveStats.processed++;

                // AI extraction
                const aiResult = await this.processSearchResult(result, pageFetchService);

                if (!aiResult) {
                  braveStats.errors++;
                  continue;
                }

                if (aiResult.is_event && aiResult.event) {
                  // Only store events with sufficient relevance
                  if (aiResult.event.relevance_score >= 60) {
                    await this.storeEvent(aiResult, result.url, 'brave_search');
                    braveStats.accepted++;
                  }
                }

                pageFetchService.markProcessed(result.url);

                // Rate limiting
                await sleep(200);
              } catch (error) {
                console.error(`Error processing Brave result ${result.url}:`, error);
                braveStats.errors++;
              }
            }

            // Delay between queries
            await sleep(1000);
          } catch (error) {
            console.error(`Error in Brave query "${query}":`, error);
          }
        }

        onProgress?.(`Brave Search complete: ${braveStats.accepted} events added`);
      } catch (error) {
        console.error('Brave Search pipeline error:', error);
        onProgress?.('Brave Search failed, continuing...');
      }
    }

    // ===== SOURCE A: NewsAPI.ai =====
    if (!skipNewsAPI && process.env.NEWSAPI_AI_KEY) {
      onProgress?.('Starting NewsAPI.ai discovery...');

      try {
        const newsApi = new NewsApiService(process.env.NEWSAPI_AI_KEY!);
        
        // Use event-specific keywords
        const articles = await newsApi.fetchArticlesForCategory(
          { name: 'governance', keywords: NEWSAPI_EVENT_KEYWORDS },
          { articlesCount: 30 }
        );

        // Handle case where API returns unexpected response
        if (!articles || !articles.results) {
          onProgress?.('NewsAPI: No articles found or API error');
          return { brave: braveStats, newsapi: newsapiStats };
        }
        
        onProgress?.(`NewsAPI: ${articles.results.length} articles found`);

        for (const article of articles.results) {
          try {
            // Skip if already processed
            if (await this.isSourceProcessed(article.url)) {
              continue;
            }

            newsapiStats.processed++;

            // AI extraction
            const aiResult = await this.processWithAI(article, 'newsapi');

            if (aiResult.is_event && aiResult.event) {
              if (aiResult.event.relevance_score >= 60) {
                await this.storeEvent(aiResult, article.url, 'newsapi');
                newsapiStats.accepted++;
              }
            }

            // Rate limiting
            await sleep(200);
          } catch (error) {
            console.error(`Error processing NewsAPI article ${article.uri}:`, error);
            newsapiStats.errors++;
          }
        }

        onProgress?.(`NewsAPI.ai complete: ${newsapiStats.accepted} events added`);
      } catch (error) {
        console.error('NewsAPI.ai pipeline error:', error);
        onProgress?.('NewsAPI.ai failed, continuing...');
        // Continue with other sources - newsapiStats will have zeros
      }
    }

    // Run expiration job
    onProgress?.('Running expiration job...');
    await this.runExpirationJob();

    return { brave: braveStats, newsapi: newsapiStats };
  }

  /**
   * Run expiration job to mark old events as expired
   */
  async runExpirationJob(): Promise<number> {
    const { data, error } = await this.supabase.rpc('expire_old_events');

    if (error) {
      console.error('Error running expiration job:', error);
      throw error;
    }

    return data as number;
  }

  // ==================== Query Methods ====================

  /**
   * Get discovered events with filters
   */
  async getDiscoveredEvents(options: {
    upcoming?: boolean;
    type?: string[];
    tags?: string[];
    city?: string;
    country?: string;
    online?: boolean;
    min_relevance?: number;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ events: DiscoveredEvent[]; total: number }> {
    const {
      upcoming = true,
      type,
      tags,
      city,
      country,
      online,
      min_relevance = 60,
      limit = 50,
      offset = 0,
    } = options;

    let query = this.supabase
      .from('discovered_events')
      .select('*', { count: 'exact' })
      .eq('status', 'active')
      .gte('relevance_score', min_relevance);

    if (upcoming) {
      query = query.gte('start_date', new Date().toISOString().split('T')[0]);
    }

    if (type && type.length > 0) {
      query = query.in('event_type', type);
    }

    if (tags && tags.length > 0) {
      query = query.overlaps('tags', tags);
    }

    if (city) {
      query = query.ilike('location_city', `%${city}%`);
    }

    if (country) {
      query = query.ilike('location_country', `%${country}%`);
    }

    if (online !== undefined) {
      query = query.eq('is_online', online);
    }

    const { data, error, count } = await query
      .order('start_date', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching discovered events:', error);
      throw error;
    }

    return {
      events: (data || []) as DiscoveredEvent[],
      total: count || 0,
    };
  }

  /**
   * Get discovered events within bounding box for map
   */
  async getEventsInBounds(
    bounds: BoundingBox,
    options: {
      types?: string[];
      min_relevance?: number;
      limit?: number;
    } = {}
  ): Promise<DiscoveredEvent[]> {
    const { types, min_relevance = 60, limit = 100 } = options;

    let query = this.supabase
      .from('discovered_events')
      .select('*')
      .eq('status', 'active')
      .gte('relevance_score', min_relevance)
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .gte('latitude', bounds.south)
      .lte('latitude', bounds.north)
      .gte('longitude', bounds.west)
      .lte('longitude', bounds.east);

    if (types && types.length > 0) {
      query = query.in('event_type', types);
    }

    const { data, error } = await query
      .order('relevance_score', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching events in bounds:', error);
      throw error;
    }

    return (data || []) as DiscoveredEvent[];
  }

  /**
   * Get a single discovered event by ID
   */
  async getEventById(id: string): Promise<DiscoveredEvent | null> {
    const { data, error } = await this.supabase
      .from('discovered_events')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      console.error('Error fetching discovered event:', error);
      throw error;
    }

    return data as DiscoveredEvent;
  }

  /**
   * Get combined events (user + discovered)
   */
  async getCombinedEvents(options: {
    upcoming?: boolean;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ events: unknown[]; total: number }> {
    const { upcoming = true, limit = 50, offset = 0 } = options;

    let query = this.supabase
      .from('combined_events')
      .select('*', { count: 'exact' });

    if (upcoming) {
      query = query.gte('start_datetime', new Date().toISOString());
    }

    const { data, error, count } = await query
      .order('start_datetime', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching combined events:', error);
      throw error;
    }

    return {
      events: data || [],
      total: count || 0,
    };
  }

  /**
   * Get stats for discovered events
   */
  async getStats(): Promise<DiscoveredEventsStats> {
    const { data, error } = await this.supabase
      .from('discovered_events_stats')
      .select('*')
      .single();

    if (error) {
      console.error('Error fetching discovered events stats:', error);
      throw error;
    }

    return data as DiscoveredEventsStats;
  }

  // ==================== EventsEye Integration (Source C) ====================

  /**
   * Store a filtered EventsEye event
   */
  async storeEventsEyeEvent(event: FilteredEventsEyeEvent): Promise<DiscoveredEvent | null> {
    // Check for duplicates first
    const existing = await this.findDuplicate(
      event.name,
      event.start_date,
      event.city,
      event.detail_url
    );

    if (existing) {
      // Merge: EventsEye data might fill in gaps (venue name, duration, etc.)
      return this.mergeEventsEyeIntoExisting(existing, event);
    }

    // Check against user-submitted events
    const isUserEvent = await this.findDuplicateInUserEvents(
      event.name,
      event.start_date,
      event.city
    );

    if (isUserEvent) {
      console.log('EventsEye event matches user-submitted event, skipping:', event.name);
      return null;
    }

    // Geocode the location
    let coordinates: { lat: number; lng: number; display_name: string } | null = null;
    if (event.city && event.country) {
      const geocodeQuery = event.venue_name
        ? `${event.venue_name}, ${event.city}, ${event.country}`
        : `${event.city}, ${event.country}`;

      const nominatim = createNominatimService();
      coordinates = await nominatim.geocodeWithCache(
        geocodeQuery,
        (q) => this.getGeocodeCache(q),
        (e) => this.setGeocodeCache(e),
        { city: event.city, country: event.country }
      );
    }

    // Map event type to base type for database
    const baseEventType = EventsEyeFilterService.mapToBaseEventType(event.event_type);

    // Insert new event
    const { data, error } = await this.supabase
      .from('discovered_events')
      .insert({
        name: event.name,
        description: event.description,
        event_type: baseEventType,
        tags: event.civic_tags,
        start_date: event.start_date,
        end_date: event.end_date,
        start_time: null,
        end_time: null,
        timezone: null, // EventsEye doesn't provide timezone
        location_name: event.venue_name,
        location_city: event.city,
        location_country: event.country,
        latitude: coordinates?.lat ?? null,
        longitude: coordinates?.lng ?? null,
        is_online: false, // EventsEye lists physical trade shows
        is_hybrid: false,
        event_url: event.detail_url,
        registration_url: null, // Not available from listing page
        source_url: event.detail_url || `https://www.eventseye.com/fairs/t1_trade-shows_${event.source_category}.html`,
        source_type: 'eventseye',
        source_urls: [event.detail_url].filter(Boolean) as string[],
        organizer: null, // Not on listing page
        cost: 'unknown',
        cost_details: null,
        relevance_score: event.relevance_score,
        relevance_reason: event.relevance_reason,
        ai_confidence: 'listing_only', // Flag that we only have listing data, not detail page
        status: 'active',
        // name_normalized is auto-set by database trigger
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        console.log('EventsEye event already exists:', event.name);
        return null;
      }
      console.error('Error storing EventsEye event:', error);
      throw error;
    }

    return data as DiscoveredEvent;
  }

  /**
   * Merge EventsEye data into existing event
   */
  private async mergeEventsEyeIntoExisting(
    existing: DiscoveredEvent,
    newEvent: FilteredEventsEyeEvent
  ): Promise<DiscoveredEvent> {
    const updates: Partial<DiscoveredEvent> = {};

    // EventsEye often has better venue information
    if (!existing.location_name && newEvent.venue_name) {
      updates.location_name = newEvent.venue_name;
    }

    // Fill in missing end dates
    if (!existing.end_date && newEvent.end_date) {
      updates.end_date = newEvent.end_date;
    }

    // Add source URL if different
    if (newEvent.detail_url) {
      const sourceUrls = existing.source_urls || [];
      if (!sourceUrls.includes(newEvent.detail_url)) {
        updates.source_urls = [...sourceUrls, newEvent.detail_url];
      }
    }

    // Update relevance if EventsEye score is higher
    if ((existing.relevance_score || 0) < newEvent.relevance_score) {
      updates.relevance_score = newEvent.relevance_score;
      updates.relevance_reason = newEvent.relevance_reason;
    }

    // Only update if there are changes
    if (Object.keys(updates).length === 0) {
      return existing;
    }

    const { data, error } = await this.supabase
      .from('discovered_events')
      .update(updates)
      .eq('id', existing.id)
      .select()
      .single();

    if (error) {
      console.error('Error merging EventsEye event:', error);
      return existing;
    }

    return data as DiscoveredEvent;
  }

  /**
   * Run the full EventsEye discovery pipeline
   */
  async runEventsEyePipeline(options: {
    onProgress?: (message: string) => void;
  } = {}): Promise<{
    scraped: number;
    filtered: number;
    stored: number;
    errors: number;
    stats: { category: string; pagesScraped: number; eventsFound: number; errors: string[] }[];
  }> {
    const { onProgress } = options;
    let scraped = 0;
    let filtered = 0;
    let stored = 0;
    let errors = 0;
    let scrapeStats: { category: string; pagesScraped: number; eventsFound: number; errors: string[] }[] = [];

    // Check for required OpenRouter key
    if (!process.env.OPENROUTER_API_KEY) {
      throw new Error('OPENROUTER_API_KEY environment variable is required');
    }

    try {
      // Step 1: Scrape all categories
      onProgress?.('Starting EventsEye scrape...');
      const scraper = createEventsEyeScraperService();
      const { events: rawEvents, stats } = await scraper.scrapeAllCategories(onProgress);
      scraped = rawEvents.length;
      scrapeStats = stats;

      onProgress?.(`Scraped ${scraped} raw events from EventsEye`);

      // Step 2: Deduplicate across categories
      const uniqueEvents = scraper.deduplicateEvents(rawEvents);
      onProgress?.(`${uniqueEvents.length} unique events after cross-category dedup`);

      // Step 3: Filter to future events only
      const futureEvents = scraper.filterFutureEvents(uniqueEvents);
      onProgress?.(`${futureEvents.length} future events`);

      // Step 4: AI relevance filtering
      onProgress?.('Starting AI relevance filtering...');
      const filterService = createEventsEyeFilterService();
      const { relevantEvents, stats: filterStats } = await filterService.filterForCivicRelevance(
        futureEvents,
        onProgress
      );
      filtered = relevantEvents.length;

      onProgress?.(`${filtered} events passed civic relevance filter (processed ${filterStats.totalProcessed} in ${filterStats.batchesProcessed} batches)`);

      // Step 5: Geocode and store
      onProgress?.('Storing relevant events...');
      for (const event of relevantEvents) {
        try {
          await this.storeEventsEyeEvent(event);
          stored++;

          // Rate limit geocoding
          await sleep(1100);
        } catch (error) {
          console.error(`Error storing EventsEye event ${event.name}:`, error);
          errors++;
        }
      }

      // Run expiration job
      onProgress?.('Running expiration job...');
      await this.runExpirationJob();

      onProgress?.(`EventsEye discovery complete: ${stored} events stored`);

    } catch (error) {
      console.error('EventsEye pipeline error:', error);
      throw error;
    }

    return { scraped, filtered, stored, errors, stats: scrapeStats };
  }

  // ==================== Helper Methods ====================

  /**
   * Normalize URL for deduplication
   */
  private normalizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'gclid'];
      trackingParams.forEach(param => urlObj.searchParams.delete(param));
      return urlObj.toString().toLowerCase();
    } catch {
      return url.toLowerCase();
    }
  }

  /**
   * Add days to a date string
   */
  private addDays(dateStr: string, days: number): string {
    const date = new Date(dateStr);
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}


