// OpenRouter AI client for processing news articles and events
// Uses LLM to filter, classify, and extract civic challenges and events from content
// Supports model fallback cascade for reliability

import type { NewsApiArticle, AIChallengeAnalysis } from '@/types/challenge';
import type { AIEventExtraction } from '@/types/discoveredEvent';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Model cascade configuration (primary -> fallback 1 -> fallback 2)
// Using fast, reliable models for event extraction
const MODEL_CASCADE = [
  'mistralai/ministral-8b-2512',     // Primary - fast 8B model
  'openrouter/pony-alpha',           // Fallback 1 - good performance
  'z-ai/glm-4.5-air:free'            // Fallback 2 - reliable free model
];

// System prompt for civic challenge analysis
const CHALLENGE_SYSTEM_PROMPT = `You are a civic challenge analyzer for CivicMatch, a platform connecting civic tech volunteers with real-world problems. Your job is to analyze news articles and determine if they represent an actionable civic challenge that local volunteers or civic tech projects could help address.

Respond ONLY with a JSON object. No other text.

If the article IS a relevant civic challenge, respond with:
{
  "is_civic_challenge": true,
  "location": {
    "specific": "Nowa Huta, Kraków",
    "city": "Kraków",
    "country": "Poland",
    "geocode_query": "Nowa Huta, Kraków, Poland"
  },
  "category": "environment",
  "subcategory": "water_pollution",
  "title": "River contamination near Nowa Huta industrial zone",
  "summary": "Industrial discharge detected in a Vistula tributary near Nowa Huta, with pollution levels exceeding safe limits. Local authorities have issued a water quality warning.",
  "call_to_action": "Water quality monitoring volunteers needed. Community data collection could help document the extent of contamination and pressure authorities to act.",
  "severity": "high",
  "skills_needed": ["environmental monitoring", "data collection", "community organizing", "GIS mapping"]
}

If the article is NOT a civic challenge (opinion piece, international politics without local action, corporate news, sports, entertainment, etc.), respond with:
{
  "is_civic_challenge": false,
  "reason": "Brief explanation why this isn't actionable"
}

Rules:
- "category" must be one of: environment, housing, transport, public_safety, governance, education, health, climate
- "severity" must be one of: low, medium, high, critical
- "location" must be as specific as possible. Extract the PLACE WHERE THE PROBLEM IS HAPPENING, not just any location mentioned.
- "geocode_query" should be a string optimized for geocoding — include city and country, use common English names.
- "summary" should be 1-3 sentences, factual, focused on the problem.
- "call_to_action" should suggest what a civic tech volunteer or local community member could realistically do.
- "skills_needed" should be an array of 2-5 relevant skills.
- Filter aggressively. Only real, localized, actionable civic problems should pass. Reject vague global think-pieces, opinion articles, or news about other countries' problems unless they have local impact.`;

interface OpenRouterOptions {
  apiKey: string;
  models?: string[];  // Model cascade - tries each in order
  referer?: string;
  title?: string;
}

interface OpenRouterResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  error?: {
    message: string;
  };
}

export class OpenRouterService {
  private apiKey: string;
  private models: string[];
  private referer: string;
  private title: string;

  constructor(options: OpenRouterOptions) {
    this.apiKey = options.apiKey;
    this.models = options.models || MODEL_CASCADE;
    this.referer = options.referer || 'https://civicmatch.com';
    this.title = options.title || 'CivicMatch AI Module';
  }

  /**
   * Make a request to OpenRouter with model fallback
   */
  private async makeRequestWithFallback(
    messages: Array<{ role: string; content: string }>,
    responseFormat?: { type: string }
  ): Promise<string> {
    const errors: Array<{ model: string; error: string }> = [];

    for (const model of this.models) {
      try {
        console.log(`Trying model: ${model}`);
        
        const response = await fetch(OPENROUTER_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': this.referer,
            'X-Title': this.title,
          },
          body: JSON.stringify({
            model,
            response_format: responseFormat,
            temperature: 0.1,
            max_tokens: 1000,
            messages,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          const error = `HTTP ${response.status}: ${errorText}`;
          console.warn(`Model ${model} failed: ${error}`);
          errors.push({ model, error });
          continue; // Try next model
        }

        const data: OpenRouterResponse = await response.json();
        
        // Check for API-level errors
        if (data.error) {
          const error = data.error.message;
          console.warn(`Model ${model} returned error: ${error}`);
          errors.push({ model, error });
          continue; // Try next model
        }

        const content = data.choices?.[0]?.message?.content;

        if (!content) {
          const error = 'Empty response content';
          console.warn(`Model ${model} returned empty content`);
          errors.push({ model, error });
          continue; // Try next model
        }

        console.log(`Model ${model} succeeded`);
        return content;

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.warn(`Model ${model} threw exception: ${errorMessage}`);
        errors.push({ model, error: errorMessage });
        // Continue to next model
      }
    }

    // All models failed
    const errorSummary = errors.map(e => `${e.model}: ${e.error}`).join('; ');
    throw new Error(`All models failed. Errors: ${errorSummary}`);
  }

  /**
   * Analyze a single news article for civic challenges
   */
  async analyzeArticle(article: NewsApiArticle): Promise<AIChallengeAnalysis> {
    const locationConcepts = article.concepts
      ?.filter(c => c.type === 'loc')
      .map(c => c.label.eng || c.label.pol || Object.values(c.label)[0])
      .filter(Boolean) || [];

    const userContent = `Analyze this news article:

Title: ${article.title}

Body: ${article.body.substring(0, 3000)}

Source: ${article.source?.title || 'Unknown'}

Published: ${article.dateTimePub}

Detected concepts: ${JSON.stringify(locationConcepts)}

Sentiment: ${article.sentiment ?? 'unknown'}`;

    const content = await this.makeRequestWithFallback(
      [
        { role: 'system', content: CHALLENGE_SYSTEM_PROMPT },
        { role: 'user', content: userContent },
      ],
      { type: 'json_object' }
    );

    try {
      const parsed = JSON.parse(content) as AIChallengeAnalysis;
      return parsed;
    } catch (error) {
      console.error('Failed to parse OpenRouter response:', content);
      throw new Error('Invalid JSON response from OpenRouter');
    }
  }

  /**
   * Analyze content for event extraction
   */
  async analyzeForEvent(
    content: string,
    sourceType: string,
    today: string
  ): Promise<AIEventExtraction> {
    const EVENT_EXTRACTION_PROMPT = `You are an event extractor for CivicMatch, a platform connecting civic tech volunteers. Your job is to analyze web content (search results, event pages) and extract structured event information.

Respond ONLY with a JSON object. No other text.

If the content describes a REAL, UPCOMING event related to civic technology, open government, democracy, social impact, or civic innovation, respond with:
{
  "is_event": true,
  "event": {
    "name": "Code for All Summit 2026",
    "start_date": "2026-06-15",
    "end_date": "2026-06-17",
    "start_time": "09:00",
    "end_time": "18:00",
    "timezone": "Europe/Lisbon",
    "location_name": "Centro de Congressos de Lisboa",
    "location_city": "Lisbon",
    "location_country": "Portugal",
    "geocode_query": "Centro de Congressos de Lisboa, Lisbon, Portugal",
    "is_online": false,
    "is_hybrid": false,
    "registration_url": "https://codeforall.org/summit-2026/register",
    "event_url": "https://codeforall.org/summit-2026",
    "organizer": "Code for All",
    "description": "Annual global gathering of civic technologists from 40+ countries. Three days of talks, workshops, and collaboration on open source civic tech projects.",
    "cost": "free",
    "cost_details": "Free for community members, $200 for organizations",
    "event_type": "conference",
    "tags": ["civic tech", "open source", "international", "networking"],
    "relevance_score": 95,
    "relevance_reason": "Core civic tech conference, directly serves CivicMatch's community"
  }
}

If the content is NOT a relevant upcoming event, respond with:
{
  "is_event": false,
  "reason": "Brief explanation — e.g., 'Past event (was held in 2024)', 'Blog post about civic tech, not an event', 'Product launch, not a community event'"
}

Rules:
- "event_type" must be one of: conference, hackathon, meetup, workshop, summit, webinar, training, festival, other
- "cost" must be one of: free, paid, donation, unknown
- Dates must be in ISO format: YYYY-MM-DD. If only a month is mentioned, use the 1st of the month.
- If the event has ALREADY HAPPENED (date is in the past relative to today), set is_event to false.
- "relevance_score" is 0-100. Score based on how relevant this event is to civic tech, open government, democracy, and social impact communities.
  - 90-100: Core civic tech event (Code for America Summit, Open Government Partnership, civic hackathon)
  - 70-89: Strongly related (GovTech conference, social innovation summit, open data event)
  - 50-69: Tangentially related (general tech conference with civic track, NGO annual meeting)
  - Below 50: Not relevant enough — set is_event to false
- "geocode_query" should be a string optimized for Nominatim geocoding — include venue name, city, and country.
- For ONLINE events: set is_online to true, set location_city and location_country to null, set geocode_query to null.
- For HYBRID events: set is_hybrid to true, provide the physical location.
- If you cannot determine the exact dates, include what you can and leave unknown fields as null. An event with at least a name, approximate date (month + year), and location/online status is still valuable.
- Include the registration_url if available. This is the most valuable field — it's what CivicMatch users will click to sign up.
- If the snippet doesn't contain enough information to determine if it's an event, respond with is_event: false and reason: "need more info"`;

    const userContent = `Analyze this content (source: ${sourceType}). Today's date is ${today}.\n\n${content}`;

    const responseContent = await this.makeRequestWithFallback(
      [
        { role: 'system', content: EVENT_EXTRACTION_PROMPT },
        { role: 'user', content: userContent },
      ],
      { type: 'json_object' }
    );

    return this.parseEventExtractionResponse(responseContent);
  }

  /**
   * Parse event extraction response with handling for truncated JSON
   */
  private parseEventExtractionResponse(content: string): AIEventExtraction {
    // Try direct parsing first
    try {
      return JSON.parse(content) as AIEventExtraction;
    } catch {
      // Try to extract valid JSON from truncated response
      // Common truncation happens at the end of the JSON
      
      // Try adding missing closing braces
      let fixed = content;
      const openBraces = (content.match(/\{/g) || []).length;
      const closeBraces = (content.match(/\}/g) || []).length;
      
      // Add missing closing braces
      for (let i = 0; i < openBraces - closeBraces; i++) {
        fixed += '}';
      }
      
      try {
        return JSON.parse(fixed) as AIEventExtraction;
      } catch {
        // Try extracting just the is_event field
        const isEventMatch = content.match(/"is_event"\s*:\s*(true|false)/);
        if (isEventMatch) {
          const isEvent = isEventMatch[1] === 'true';
          if (!isEvent) {
            // Extract reason if available
            const reasonMatch = content.match(/"reason"\s*:\s*"([^"]*)"/);
            return {
              is_event: false,
              reason: reasonMatch?.[1] || 'Unable to parse full response',
            };
          } else {
            // is_event is true but JSON is truncated - try to extract what we can
            const nameMatch = content.match(/"name"\s*:\s*"([^"]*)"/);
            const descMatch = content.match(/"description"\s*:\s*"([^"]*)"/);
            const startDateMatch = content.match(/"start_date"\s*:\s*"?([^",\}]*)"?/);
            const endDateMatch = content.match(/"end_date"\s*:\s*"?([^",\}]*)"?/);
            const locationCityMatch = content.match(/"location_city"\s*:\s*"([^"]*)"/);
            const eventUrlMatch = content.match(/"event_url"\s*:\s*"([^"]*)"/);
            
            if (nameMatch) {
              return {
                is_event: true,
                event: {
                  name: nameMatch[1],
                  description: descMatch?.[1] || 'No description available',
                  start_date: startDateMatch?.[1] && startDateMatch[1] !== 'null' ? startDateMatch[1] : null,
                  end_date: endDateMatch?.[1] && endDateMatch[1] !== 'null' ? endDateMatch[1] : null,
                  start_time: null,
                  end_time: null,
                  timezone: null,
                  location_name: null,
                  location_city: locationCityMatch?.[1] || null,
                  location_country: null,
                  geocode_query: locationCityMatch?.[1] || null,
                  is_online: false,
                  is_hybrid: false,
                  registration_url: null,
                  event_url: eventUrlMatch?.[1] || null,
                  organizer: null,
                  cost: 'unknown' as const,
                  cost_details: null,
                  event_type: 'conference' as const,
                  tags: [],
                  relevance_score: 70,
                  relevance_reason: 'Partial match from truncated AI response',
                },
              };
            }
          }
        }
        
        console.error('Failed to parse OpenRouter response:', content);
        throw new Error('Invalid JSON response from OpenRouter');
      }
    }
  }

  /**
   * Analyze multiple articles with rate limiting
   */
  async analyzeArticles(
    articles: NewsApiArticle[],
    options: {
      delayMs?: number;
      onProgress?: (index: number, total: number, result: AIChallengeAnalysis) => void;
    } = {}
  ): Promise<Array<{ article: NewsApiArticle; analysis: AIChallengeAnalysis }>> {
    const { delayMs = 200, onProgress } = options;
    const results: Array<{ article: NewsApiArticle; analysis: AIChallengeAnalysis }> = [];

    for (let i = 0; i < articles.length; i++) {
      const article = articles[i];
      
      try {
        const analysis = await this.analyzeArticle(article);
        results.push({ article, analysis });
        
        if (onProgress) {
          onProgress(i + 1, articles.length, analysis);
        }
      } catch (error) {
        console.error(`Failed to analyze article ${article.uri}:`, error);
        // Continue with other articles
      }

      // Rate limiting
      if (i < articles.length - 1) {
        await sleep(delayMs);
      }
    }

    return results;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Factory function for server-side usage (challenges)
export function createOpenRouterService(): OpenRouterService {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY environment variable is required');
  }
  
  // Use model cascade from environment or default cascade
  const models = process.env.OPENROUTER_MODELS_CASCADE?.split(',') || MODEL_CASCADE;
  
  return new OpenRouterService({
    apiKey,
    models,
    referer: process.env.NEXT_PUBLIC_APP_URL || 'https://civicmatch.com',
    title: 'CivicMatch News Module',
  });
}

// Factory function for event extraction
export function createOpenRouterServiceForEvents(): OpenRouterService {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY environment variable is required');
  }
  
  // Use model cascade from environment or default cascade
  const models = process.env.OPENROUTER_MODELS_CASCADE?.split(',') || MODEL_CASCADE;
  
  return new OpenRouterService({
    apiKey,
    models,
    referer: process.env.NEXT_PUBLIC_APP_URL || 'https://civicmatch.com',
    title: 'CivicMatch Event Discovery',
  });
}
