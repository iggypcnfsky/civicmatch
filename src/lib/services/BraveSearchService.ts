// Brave Search API client for discovering civic tech events
// Docs: https://api.search.brave.com/res/v1/web/search

import type { BraveSearchResponse, BraveSearchResult } from '@/types/discoveredEvent';

const BRAVE_SEARCH_URL = 'https://api.search.brave.com/res/v1/web/search';

export interface BraveSearchOptions {
  count?: number;           // 1-20, default 10
  offset?: number;          // 0-9
  freshness?: 'pd' | 'pw' | 'pm' | 'py' | string;  // past day/week/month/year or date range
  country?: string;         // 2-letter code: US, PL, GB, DE, ALL
  search_lang?: string;     // en, pl, etc.
}

export class BraveSearchService {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Execute a search query
   */
  async search(query: string, options: BraveSearchOptions = {}): Promise<BraveSearchResult[]> {
    const {
      count = 20,
      offset = 0,
      freshness = 'pm',  // past month by default
      country = 'ALL',
      search_lang = 'en',
    } = options;

    const params = new URLSearchParams({
      q: query,
      count: Math.min(count, 20).toString(),
      offset: offset.toString(),
      freshness,
      country,
      search_lang,
    });

    const response = await fetch(`${BRAVE_SEARCH_URL}?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'X-Subscription-Token': this.apiKey,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Brave Search API error: ${response.status} ${errorText}`);
    }

    const data: BraveSearchResponse = await response.json();
    return data.web?.results || [];
  }

  /**
   * Search for events using multiple queries
   */
  async searchWithQueries(
    queries: string[],
    options: BraveSearchOptions & { delayMs?: number } = {}
  ): Promise<Map<string, BraveSearchResult[]>> {
    const { delayMs = 1000, ...searchOptions } = options;
    const results = new Map<string, BraveSearchResult[]>();

    for (const query of queries) {
      try {
        const searchResults = await this.search(query, searchOptions);
        results.set(query, searchResults);
        
        // Rate limiting - be nice to the API
        if (delayMs > 0 && query !== queries[queries.length - 1]) {
          await sleep(delayMs);
        }
      } catch (error) {
        console.error(`Brave Search failed for query "${query}":`, error);
        results.set(query, []);
      }
    }

    return results;
  }

  /**
   * Get today's query groups based on day of week
   */
  getTodaysQueries(allGroups: { name: string; queries: string[]; runDays: number[] }[]): string[] {
    const today = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.
    const queries: string[] = [];

    for (const group of allGroups) {
      if (group.runDays.includes(today)) {
        queries.push(...group.queries);
      }
    }

    return [...new Set(queries)]; // Remove duplicates
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Factory function for server-side usage
export function createBraveSearchService(): BraveSearchService {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY;
  if (!apiKey) {
    throw new Error('BRAVE_SEARCH_API_KEY environment variable is required');
  }
  return new BraveSearchService(apiKey);
}
