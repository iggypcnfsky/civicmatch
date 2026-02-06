// NewsAPI.ai (Event Registry) client for fetching news articles
// Docs: https://newsapi.ai/documentation

import type { NewsApiResponse, NewsCategoryConfig } from '@/types/challenge';

const NEWSAPI_BASE_URL = 'https://eventregistry.org/api/v1/article/getArticles';

// Category configurations for civic challenges
export const NEWS_CATEGORIES: NewsCategoryConfig[] = [
  {
    name: 'environment',
    keywords: ['pollution', 'contamination', 'waste dumping', 'water quality', 'deforestation'],
  },
  {
    name: 'housing',
    keywords: ['housing crisis', 'homelessness', 'eviction', 'affordable housing', 'gentrification'],
  },
  {
    name: 'transport',
    keywords: ['transit', 'traffic', 'road safety', 'public transport', 'cycling infrastructure'],
  },
  {
    name: 'public_safety',
    keywords: ['crime', 'public safety', 'emergency services', 'community safety'],
  },
  {
    name: 'governance',
    keywords: ['corruption', 'transparency', 'civic participation', 'public spending', 'accountability'],
  },
  {
    name: 'education',
    keywords: ['school funding', 'education access', 'digital divide', 'literacy'],
  },
  {
    name: 'health',
    keywords: ['healthcare access', 'mental health', 'public health', 'hospital', 'epidemic'],
  },
  {
    name: 'climate',
    keywords: ['flood', 'drought', 'wildfire', 'climate adaptation', 'extreme weather'],
  },
];

export class NewsApiService {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Fetch articles for a specific category
   */
  async fetchArticlesForCategory(
    category: NewsCategoryConfig,
    options: {
      lang?: string[];
      articlesCount?: number;
      sortBy?: 'date' | 'relevance' | 'socialScore';
    } = {}
  ): Promise<NewsApiResponse['articles']> {
    const {
      lang = ['eng', 'pol'],
      articlesCount = 30,
      sortBy = 'date',
    } = options;

    const requestBody = {
      keyword: category.keywords,
      keywordOper: 'or',
      lang: lang,
      articlesSortBy: sortBy,
      articlesCount: Math.min(articlesCount, 100),
      includeArticleConcepts: true,
      includeArticleCategories: true,
      isDuplicateFilter: 'skipDuplicates',
      resultType: 'articles',
      apiKey: this.apiKey,
    };

    const response = await fetch(NEWSAPI_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`NewsAPI.ai error: ${response.status} ${errorText}`);
    }

    const data: NewsApiResponse = await response.json();
    return data.articles;
  }

  /**
   * Fetch articles for all categories
   */
  async fetchAllCategories(
    options: {
      lang?: string[];
      articlesCount?: number;
      onProgress?: (category: string, count: number) => void;
    } = {}
  ): Promise<Map<string, NewsApiResponse['articles']>> {
    const results = new Map<string, NewsApiResponse['articles']>();

    for (const category of NEWS_CATEGORIES) {
      try {
        const articles = await this.fetchArticlesForCategory(category, options);
        results.set(category.name, articles);
        
        if (options.onProgress) {
          options.onProgress(category.name, articles.results.length);
        }

        // Small delay to be nice to the API
        await sleep(100);
      } catch (error) {
        console.error(`Failed to fetch ${category.name}:`, error);
        // Continue with other categories
      }
    }

    return results;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Factory function for server-side usage
export function createNewsApiService(): NewsApiService {
  const apiKey = process.env.NEWSAPI_AI_KEY;
  if (!apiKey) {
    throw new Error('NEWSAPI_AI_KEY environment variable is required');
  }
  return new NewsApiService(apiKey);
}
