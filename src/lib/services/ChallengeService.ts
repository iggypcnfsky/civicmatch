// Challenge Service - coordinates ingestion pipeline and database operations

import { SupabaseClient } from '@supabase/supabase-js';
import type { 
  Challenge, 
  ChallengeForMap, 
  ChallengeCategory,
  ChallengeSeverity,
  ChallengeCategoryStats,
  BoundingBox,
  GeocodeCacheEntry,
  AIChallengeAnalysis,
  NewsApiArticle 
} from '@/types/challenge';
import { createNewsApiService, NEWS_CATEGORIES } from './NewsApiService';
import { createOpenRouterService } from './OpenRouterService';
import { createNominatimService } from './NominatimService';

export class ChallengeService {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  // ==================== Database Operations ====================

  /**
   * Check if an article has already been processed
   */
  async isArticleProcessed(sourceUri: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('challenges')
      .select('id')
      .eq('source_uri', sourceUri)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
      console.error('Error checking article:', error);
    }

    return !!data;
  }

  /**
   * Store a challenge in the database
   */
  async createChallenge(
    article: NewsApiArticle,
    analysis: AIChallengeAnalysis,
    coordinates: { lat: number; lng: number; display_name: string }
  ): Promise<Challenge | null> {
    if (!analysis.is_civic_challenge || !analysis.location) {
      return null;
    }

    const { data, error } = await this.supabase
      .from('challenges')
      .insert({
        source_uri: article.uri,
        source_url: article.url,
        source_title: article.source?.title || null,
        article_title: article.title,
        article_image: article.image || null,
        published_at: article.dateTimePub,
        title: analysis.title || article.title,
        summary: analysis.summary || '',
        call_to_action: analysis.call_to_action || null,
        category: analysis.category || 'environment',
        subcategory: analysis.subcategory || null,
        severity: analysis.severity || 'medium',
        skills_needed: analysis.skills_needed || [],
        location_name: analysis.location.specific || analysis.location.city,
        location_city: analysis.location.city || null,
        location_country: analysis.location.country || null,
        latitude: coordinates.lat,
        longitude: coordinates.lng,
        geocode_query: analysis.location.geocode_query,
        sentiment: article.sentiment || null,
        language: article.lang || null,
        status: 'active',
      })
      .select()
      .single();

    if (error) {
      // Check for duplicate key violation
      if (error.code === '23505') {
        console.log('Article already exists:', article.uri);
        return null;
      }
      console.error('Error storing challenge:', error);
      throw error;
    }

    return data as Challenge;
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

    return data as GeocodeCacheEntry | null;
  }

  /**
   * Store geocode cache entry
   */
  async setGeocodeCache(
    entry: Omit<GeocodeCacheEntry, 'cached_at'>
  ): Promise<void> {
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
   * Get all active challenges (for map display without bounds)
   */
  async getAllChallenges(
    options: {
      categories?: ChallengeCategory[];
      severity?: ChallengeSeverity | null;
      limit?: number;
    } = {}
  ): Promise<ChallengeForMap[]> {
    const { categories, severity, limit = 500 } = options;

    let query = this.supabase
      .from('challenges')
      .select('*')
      .eq('status', 'active');

    if (categories && categories.length > 0) {
      query = query.in('category', categories);
    }

    if (severity) {
      const severityOrder = { critical: 1, high: 2, medium: 3, low: 4 };
      const maxOrder = severityOrder[severity];
      const allowedSeverities = Object.entries(severityOrder)
        .filter(([, order]) => order <= maxOrder)
        .map(([sev]) => sev);
      query = query.in('severity', allowedSeverities);
    }

    const { data, error } = await query
      .order('severity', { ascending: false })
      .order('published_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching all challenges:', error);
      throw error;
    }

    return (data || []) as ChallengeForMap[];
  }

  /**
   * Get challenges within bounding box for map display
   */
  async getChallengesInBounds(
    bounds: BoundingBox,
    options: {
      categories?: ChallengeCategory[];
      severity?: ChallengeSeverity | null;
      limit?: number;
    } = {}
  ): Promise<ChallengeForMap[]> {
    const { categories, severity, limit = 100 } = options;

    let query = this.supabase
      .from('challenges')
      .select('*')
      .eq('status', 'active')
      .gte('latitude', bounds.south)
      .lte('latitude', bounds.north)
      .gte('longitude', bounds.west)
      .lte('longitude', bounds.east);

    if (categories && categories.length > 0) {
      query = query.in('category', categories);
    }

    if (severity) {
      // Filter for this severity or higher
      const severityOrder = { critical: 1, high: 2, medium: 3, low: 4 };
      const maxOrder = severityOrder[severity];
      const allowedSeverities = Object.entries(severityOrder)
        .filter(([, order]) => order <= maxOrder)
        .map(([sev]) => sev);
      query = query.in('severity', allowedSeverities);
    }

    const { data, error } = await query
      .order('severity', { ascending: false })
      .order('published_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching challenges:', error);
      throw error;
    }

    return (data || []) as ChallengeForMap[];
  }

  /**
   * Get a single challenge by ID
   */
  async getChallengeById(id: string): Promise<Challenge | null> {
    const { data, error } = await this.supabase
      .from('challenges')
      .select('*')
      .eq('id', id)
      .eq('status', 'active')
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      console.error('Error fetching challenge:', error);
      throw error;
    }

    return data as Challenge;
  }

  /**
   * Get category stats for filter UI
   */
  async getCategoryStats(): Promise<ChallengeCategoryStats[]> {
    const { data, error } = await this.supabase
      .from('challenge_category_stats')
      .select('*');

    if (error) {
      console.error('Error fetching category stats:', error);
      throw error;
    }

    return (data || []) as ChallengeCategoryStats[];
  }

  /**
   * Run expiration job to mark old challenges as expired
   */
  async runExpirationJob(): Promise<number> {
    const { data, error } = await this.supabase
      .rpc('expire_old_challenges');

    if (error) {
      console.error('Error running expiration job:', error);
      throw error;
    }

    return data as number;
  }

  /**
   * Clean old geocode cache entries
   */
  async cleanGeocodeCache(): Promise<number> {
    const { data, error } = await this.supabase
      .rpc('clean_geocode_cache');

    if (error) {
      console.error('Error cleaning geocode cache:', error);
      throw error;
    }

    return data as number;
  }

  // ==================== Ingestion Pipeline ====================

  /**
   * Run the full ingestion pipeline for all categories
   */
  async runIngestionPipeline(options: {
    onProgress?: (message: string) => void;
    maxArticlesPerCategory?: number;
  } = {}): Promise<{
    processed: number;
    accepted: number;
    rejected: number;
    errors: number;
    byCategory: Record<string, { processed: number; accepted: number }>;
  }> {
    const { onProgress, maxArticlesPerCategory = 30 } = options;
    
    const newsApi = createNewsApiService();
    const openRouter = createOpenRouterService();
    const nominatim = createNominatimService();

    let totalProcessed = 0;
    let totalAccepted = 0;
    let totalRejected = 0;
    let totalErrors = 0;
    const byCategory: Record<string, { processed: number; accepted: number }> = {};

    for (const categoryConfig of NEWS_CATEGORIES) {
      const categoryName = categoryConfig.name;
      onProgress?.(`Fetching ${categoryName} articles...`);

      try {
        // 1. Fetch articles
        const articles = await newsApi.fetchArticlesForCategory(categoryConfig, {
          articlesCount: maxArticlesPerCategory,
        });

        let categoryProcessed = 0;
        let categoryAccepted = 0;

        onProgress?.(`Processing ${articles.results.length} ${categoryName} articles...`);

        // 2. Process each article
        for (const article of articles.results) {
          try {
            // Skip if already processed
            const exists = await this.isArticleProcessed(article.uri);
            if (exists) {
              continue;
            }

            totalProcessed++;
            categoryProcessed++;

            // 3. AI analysis
            const analysis = await openRouter.analyzeArticle(article);

            if (!analysis.is_civic_challenge) {
              totalRejected++;
              continue;
            }

            if (!analysis.location) {
              totalRejected++;
              continue;
            }

            // 4. Geocode location
            const coordinates = await nominatim.geocodeWithCache(
              analysis.location.geocode_query,
              (q) => this.getGeocodeCache(q),
              (e) => this.setGeocodeCache(e),
              { city: analysis.location.city, country: analysis.location.country }
            );

            if (!coordinates) {
              console.warn('Could not geocode:', analysis.location.geocode_query);
              totalRejected++;
              continue;
            }

            // 5. Store challenge
            await this.createChallenge(article, analysis, coordinates);
            totalAccepted++;
            categoryAccepted++;

          } catch (error) {
            console.error(`Error processing article ${article.uri}:`, error);
            totalErrors++;
          }

          // Small delay to respect rate limits
          await sleep(100);
        }

        byCategory[categoryName] = { processed: categoryProcessed, accepted: categoryAccepted };
        onProgress?.(`Completed ${categoryName}: ${categoryAccepted} challenges added`);

      } catch (error) {
        console.error(`Error processing category ${categoryName}:`, error);
        onProgress?.(`Error in ${categoryName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      // Delay between categories
      await sleep(500);
    }

    // Run expiration job
    onProgress?.('Running expiration job...');
    await this.runExpirationJob();

    return {
      processed: totalProcessed,
      accepted: totalAccepted,
      rejected: totalRejected,
      errors: totalErrors,
      byCategory,
    };
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
