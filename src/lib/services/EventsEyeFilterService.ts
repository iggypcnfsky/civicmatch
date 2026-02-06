// EventsEye AI Filter Service
// Uses OpenRouter to filter EventsEye events for civic relevance
// Processes events in batches for efficiency

import { RawEventsEyeEvent } from './EventsEyeScraperService';
import type { EventType } from '@/types/discoveredEvent';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Model cascade for reliability
const MODEL_CASCADE = [
  'mistralai/ministral-8b-2512',       // Primary - fast, cheap, good for batch processing
  'google/gemini-3-flash-preview',     // Fallback 1 - latest Gemini preview
  'z-ai/glm-4.5-air:free',             // Fallback 2 - reliable free model
];

// System prompt for civic relevance filtering
const EVENTSEYE_FILTER_PROMPT = `You are a relevance filter for CivicMatch, a platform connecting civic technology founders with volunteers. Your job is to evaluate a batch of trade shows and conferences and determine which ones would be valuable for people working in civic technology, open government, smart cities, democracy, social impact, climate action, and public interest technology.

Respond ONLY with a JSON object. No other text.

For each event in the batch, assess whether it's relevant and score it:

{
  "events": [
    {
      "index": 0,
      "relevant": true,
      "score": 85,
      "reason": "Major smart city conference bringing together urban tech innovators and city officials",
      "tags": ["smart cities", "urban tech", "govtech"],
      "event_type": "conference"
    },
    {
      "index": 3,
      "relevant": false,
      "score": 15,
      "reason": "Commercial kitchen equipment trade show, no civic tech relevance"
    }
  ]
}

SCORING GUIDE (0-100):

90-100: CORE civic tech / open government / democracy event
  Examples: Smart City Expo, Open Government Partnership Summit, Code for All Summit,
  Digital Government World, GovTech Summit, Civic Tech Festival, World Urban Forum

75-89: STRONG civic relevance — conference where civic tech is a major theme
  Examples: World Water Week (water infrastructure = civic concern), COP climate summit,
  International Transport Forum, IFAT (environmental technology),
  Digital Nations Summit, Public Sector Innovation conference, AI ethics summit

55-74: SIGNIFICANT overlap — large industry conference with meaningful civic/public sector tracks
  Examples: Web Summit (has govtech track), MWC (smart city pavilion), CES (smart city area),
  major cybersecurity conferences (public infrastructure security), AI ethics summits,
  renewable energy expos (climate/energy transition = civic priority), education tech conferences

30-54: TANGENTIAL — some loose connection but not directly valuable for civic tech volunteers
  Examples: General construction expos (not smart/sustainable focused), generic IT conferences,
  commercial real estate shows

Below 30: NOT RELEVANT — commercial trade show with no civic dimension
  Examples: Kitchen equipment expo, jewelry trade fair, fashion show, auto parts fair,
  furniture exhibition, food & beverage trade show

IMPORTANT CONTEXT — what makes something relevant for CivicMatch:
- Events where civic tech founders could showcase tools for public benefit
- Events where government/public sector officials attend and could become partners
- Events focused on public infrastructure, civic data, urban challenges, climate resilience
- Events addressing democratic participation, transparency, accountability
- Events about sustainability, environmental protection, clean energy transition
- Large tech conferences that include meaningful govtech/smart city programming
- Events about education technology for public benefit
- Events about cybersecurity in public infrastructure
- Events about water management, waste management, urban planning

NOT relevant:
- Purely commercial/trade exhibitions for buying and selling products
- Industry-specific shows without a public/civic dimension
- Events focused on luxury goods, fashion, entertainment industry
- Consumer electronics shows without civic angle

"event_type" must be one of: conference, summit, expo, trade_show, forum, workshop, congress, convention, other

"tags" should be 2-4 tags from: civic tech, smart cities, govtech, climate, sustainability,
  renewable energy, water, waste management, urban planning, transport, cybersecurity,
  public safety, education, AI governance, digital government, open data, democracy,
  social innovation, public health, housing, infrastructure, environmental protection

Only include events in the output that you've actually evaluated. If an event's start_date is clearly in the past relative to today's date, mark it as not relevant with reason "Past event".

Be somewhat generous in scoring — an event about smart cities, urban planning, environmental technology, or government digital transformation is likely relevant to CivicMatch users even if it's an industry trade show.`;

export interface FilteredEventsEyeEvent extends RawEventsEyeEvent {
  relevance_score: number;
  relevance_reason: string;
  civic_tags: string[];
  event_type: EventType | 'expo' | 'trade_show' | 'forum' | 'congress' | 'convention';
}

interface OpenRouterFilterResponse {
  events: Array<{
    index: number;
    relevant: boolean;
    score: number;
    reason: string;
    tags?: string[];
    event_type?: string;
  }>;
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

export interface EventsEyeFilterStats {
  totalProcessed: number;
  relevantFound: number;
  batchesProcessed: number;
  errors: number;
}

export class EventsEyeFilterService {
  private apiKey: string;
  private models: string[];
  private batchSize: number;
  private minRelevanceScore: number;

  constructor(options: {
    apiKey: string;
    models?: string[];
    batchSize?: number;
    minRelevanceScore?: number;
  }) {
    this.apiKey = options.apiKey;
    this.models = options.models || MODEL_CASCADE;
    this.batchSize = options.batchSize || 40;
    this.minRelevanceScore = options.minRelevanceScore || 55;
  }

  /**
   * Sleep helper for rate limiting
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Make a request to OpenRouter with model fallback
   */
  private async makeRequestWithFallback(
    messages: Array<{ role: string; content: string }>
  ): Promise<string> {
    const errors: Array<{ model: string; error: string }> = [];

    for (const model of this.models) {
      try {
        const response = await fetch(OPENROUTER_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://civicmatch.com',
            'X-Title': 'CivicMatch EventsEye Filter',
          },
          body: JSON.stringify({
            model,
            response_format: { type: 'json_object' },
            temperature: 0.1,
            max_tokens: 2000,
            messages,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          errors.push({ model, error: `HTTP ${response.status}: ${errorText}` });
          continue;
        }

        const data: OpenRouterResponse = await response.json();

        if (data.error) {
          errors.push({ model, error: data.error.message });
          continue;
        }

        const content = data.choices?.[0]?.message?.content;
        if (!content) {
          errors.push({ model, error: 'Empty response' });
          continue;
        }

        return content;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push({ model, error: errorMessage });
      }
    }

    throw new Error(`All models failed: ${errors.map(e => `${e.model}: ${e.error}`).join('; ')}`);
  }

  /**
   * Filter a single batch of events
   */
  private async filterBatch(
    batch: RawEventsEyeEvent[],
    today: string
  ): Promise<FilteredEventsEyeEvent[]> {
    const eventList = batch.map((event, idx) => {
      const dateStr = event.start_date 
        ? `${event.start_date}${event.end_date ? ` to ${event.end_date}` : ''}`
        : 'Date TBD';
      const locationStr = event.city && event.country 
        ? `${event.city}, ${event.country}`
        : (event.city || event.country || 'Location TBD');
      return `[${idx}] ${event.name} — ${event.description || 'No description'} — ${locationStr} — ${dateStr}`;
    }).join('\n');

    const content = await this.makeRequestWithFallback([
      { role: 'system', content: EVENTSEYE_FILTER_PROMPT },
      { role: 'user', content: `Today's date: ${today}\n\nEvents to evaluate:\n${eventList}` },
    ]);

    let parsed: OpenRouterFilterResponse;
    try {
      parsed = JSON.parse(content) as OpenRouterFilterResponse;
    } catch (error) {
      console.error('Failed to parse OpenRouter response:', content);
      throw new Error('Invalid JSON response from OpenRouter');
    }

    const relevantEvents: FilteredEventsEyeEvent[] = [];

    for (const result of parsed.events || []) {
      if (result.relevant && result.score >= this.minRelevanceScore) {
        const original = batch[result.index];
        if (!original) continue;

        relevantEvents.push({
          ...original,
          relevance_score: result.score,
          relevance_reason: result.reason,
          civic_tags: result.tags || [],
          event_type: this.normalizeEventType(result.event_type),
        });
      }
    }

    return relevantEvents;
  }

  /**
   * Normalize event type from AI response to valid EventType
   */
  private normalizeEventType(type?: string): EventType | 'expo' | 'trade_show' | 'forum' | 'congress' | 'convention' {
    if (!type) return 'conference';
    
    const normalized = type.toLowerCase().replace(/[-_]/g, '_');
    
    // Map to valid event types or extended types
    const typeMap: Record<string, EventType | 'expo' | 'trade_show' | 'forum' | 'congress' | 'convention'> = {
      conference: 'conference',
      summit: 'summit',
      expo: 'expo',
      trade_show: 'trade_show',
      tradeshow: 'trade_show',
      forum: 'forum',
      workshop: 'workshop',
      congress: 'congress',
      convention: 'convention',
      webinar: 'webinar',
      hackathon: 'hackathon',
      meetup: 'meetup',
      training: 'training',
      festival: 'festival',
      other: 'other',
    };

    return typeMap[normalized] || 'conference';
  }

  /**
   * Filter events for civic relevance in batches
   */
  async filterForCivicRelevance(
    events: RawEventsEyeEvent[],
    onProgress?: (message: string) => void
  ): Promise<{
    relevantEvents: FilteredEventsEyeEvent[];
    stats: EventsEyeFilterStats;
  }> {
    const relevantEvents: FilteredEventsEyeEvent[] = [];
    const stats: EventsEyeFilterStats = {
      totalProcessed: 0,
      relevantFound: 0,
      batchesProcessed: 0,
      errors: 0,
    };

    const today = new Date().toISOString().split('T')[0];
    const totalBatches = Math.ceil(events.length / this.batchSize);

    for (let i = 0; i < events.length; i += this.batchSize) {
      const batch = events.slice(i, i + this.batchSize);
      const batchNum = Math.floor(i / this.batchSize) + 1;

      onProgress?.(`Filtering batch ${batchNum}/${totalBatches} (${batch.length} events)`);

      try {
        const filtered = await this.filterBatch(batch, today);
        relevantEvents.push(...filtered);

        stats.totalProcessed += batch.length;
        stats.relevantFound += filtered.length;
        stats.batchesProcessed++;

        // Brief pause between batches to be nice to the API
        if (i + this.batchSize < events.length) {
          await this.sleep(200);
        }
      } catch (error) {
        console.error(`Error filtering batch ${batchNum}:`, error);
        stats.errors++;
        // Continue with next batch
      }
    }

    return { relevantEvents, stats };
  }

  /**
   * Map extended event types to base EventType for database storage
   */
  static mapToBaseEventType(type: string): EventType {
    const baseTypes: Record<string, EventType> = {
      conference: 'conference',
      summit: 'summit',
      expo: 'conference',
      trade_show: 'conference',
      forum: 'conference',
      workshop: 'workshop',
      congress: 'conference',
      convention: 'conference',
      webinar: 'webinar',
      hackathon: 'hackathon',
      meetup: 'meetup',
      training: 'training',
      festival: 'festival',
      other: 'other',
    };

    return baseTypes[type.toLowerCase()] || 'conference';
  }
}

// Factory function for server-side usage
export function createEventsEyeFilterService(): EventsEyeFilterService {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY environment variable is required');
  }

  return new EventsEyeFilterService({
    apiKey,
    models: process.env.OPENROUTER_MODELS_CASCADE?.split(',') || MODEL_CASCADE,
    batchSize: parseInt(process.env.EVENTSEYE_BATCH_SIZE || '40'),
    minRelevanceScore: parseInt(process.env.EVENTSEYE_MIN_RELEVANCE || '55'),
  });
}
