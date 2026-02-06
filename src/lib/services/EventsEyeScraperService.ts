// EventsEye Scraper Service
// Scrapes global trade show directory (eventseye.com) for civic-relevant conferences
// Uses cheerio for HTML parsing - no headless browser needed for this server-rendered site

import * as cheerio from 'cheerio';

const EVENTSEYE_BASE = 'https://www.eventseye.com/fairs/';
const EVENTSEYE_HOST = 'https://www.eventseye.com';

// Target categories for civic tech relevance
export const EVENTSEYE_CATEGORIES: EventsEyeCategory[] = [
  // Primary categories (use 't1' prefix)
  { slug: 'environmental', type: 'primary', prefix: 't1' },
  { slug: 'ict-information-communications-technologies', type: 'primary', prefix: 't1' },
  { slug: 'education-training-employment', type: 'primary', prefix: 't1' },
  { slug: 'quality-security', type: 'primary', prefix: 't1' },
  // Secondary subcategories (use 'st1' prefix)
  { slug: 'urban-equipment-engineering', type: 'subcategory', prefix: 'st1' },
  { slug: 'clean-energies-renewable-energies', type: 'subcategory', prefix: 'st1' },
  { slug: 'environmental-protection', type: 'subcategory', prefix: 'st1' },
  { slug: 'water-management-and-treatment', type: 'subcategory', prefix: 'st1' },
  { slug: 'knowledge-based-systems-artificial-intelligence', type: 'subcategory', prefix: 'st1' },
];

export interface EventsEyeCategory {
  slug: string;
  type: 'primary' | 'subcategory';
  prefix: 't1' | 'st1';
}

export interface RawEventsEyeEvent {
  name: string;
  description: string | null;
  detail_url: string | null;
  cycle: string | null;
  city: string | null;
  country: string | null;
  venue_name: string | null;
  start_date: string | null;  // ISO format: YYYY-MM-DD
  end_date: string | null;    // ISO format: YYYY-MM-DD
  duration_days: number | null;
  source_category: string;
}

interface ScrapedPageResult {
  events: RawEventsEyeEvent[];
  hasNextPage: boolean;
  currentPage: number;
  totalPages: number;
}

export interface EventsEyeScrapeStats {
  category: string;
  pagesScraped: number;
  eventsFound: number;
  errors: string[];
}

export class EventsEyeScraperService {
  private userAgent: string;
  private delayMs: number;
  private maxPagesPerCategory: number;

  constructor(options: {
    userAgent?: string;
    delayMs?: number;
    maxPagesPerCategory?: number;
  } = {}) {
    this.userAgent = options.userAgent || 'CivicMatchBot/1.0 (contact@civicmatch.com)';
    this.delayMs = options.delayMs || 2000; // 2 seconds between requests
    this.maxPagesPerCategory = options.maxPagesPerCategory || 30;
  }

  /**
   * Build URL for a category page
   */
  private buildPageUrl(category: EventsEyeCategory, pageNum: number): string {
    const suffix = pageNum === 1 ? '' : `_${pageNum}`;
    return `${EVENTSEYE_BASE}${category.prefix}_trade-shows_${category.slug}${suffix}.html`;
  }

  /**
   * Sleep helper for rate limiting
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Scrape a single listing page
   */
  async scrapeListingPage(url: string, categorySlug: string): Promise<ScrapedPageResult> {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          // Page doesn't exist - no more pages
          return { events: [], hasNextPage: false, currentPage: 1, totalPages: 1 };
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      const $ = cheerio.load(html);
      const events: RawEventsEyeEvent[] = [];

      // Parse pagination from page text
      // EventsEye shows "Page X / Y" at the top
      const paginationText = $('body').text().match(/Page\s*(\d+)\s*\/\s*(\d+)/i);
      const currentPage = paginationText ? parseInt(paginationText[1]) : 1;
      const totalPages = paginationText ? parseInt(paginationText[2]) : 1;

      // Find the events table - EventsEye uses a table with event rows
      // The table has rows where each event is a <tr> with 4 <td> cells
      $('table tr').each((_, row) => {
        const cells = $(row).find('td');
        if (cells.length < 4) return; // Skip header rows or non-event rows

        const nameCell = $(cells[0]);
        const cycleCell = $(cells[1]);
        const venueCell = $(cells[2]);
        const dateCell = $(cells[3]);

        // Extract event name from bold text
        const name = nameCell.find('b').first().text().trim();
        if (!name) return; // Skip if no event name

        // Extract description from italic text
        const description = nameCell.find('i').first().text().trim() || null;

        // Extract detail URL
        const detailPath = nameCell.find('a').first().attr('href');
        const detailUrl = detailPath 
          ? (detailPath.startsWith('http') ? detailPath : `${EVENTSEYE_HOST}${detailPath.startsWith('/') ? '' : '/fairs/'}${detailPath}`)
          : null;

        // Extract cycle (e.g., "once a year")
        const cycle = cycleCell.text().trim() || null;

        // Extract city and country from venue cell
        const cityLink = venueCell.find('a').first();
        const city = cityLink.text().trim() || null;
        
        const venueText = venueCell.text();
        const countryMatch = venueText.match(/\(([^)]+)\)/);
        const country = countryMatch ? countryMatch[1].trim() : null;

        // Venue name is usually the second link in the cell
        const venueLinks = venueCell.find('a');
        const venueName = venueLinks.length > 1 
          ? $(venueLinks[1]).text().trim() 
          : null;

        // Parse date: "MM/DD/YYYY" format with optional duration
        const dateText = dateCell.text().trim();
        const dateMatch = dateText.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
        const durationMatch = dateText.match(/(\d+)\s*days?/i);

        let startDate: string | null = null;
        let endDate: string | null = null;
        let durationDays: number | null = null;

        if (dateMatch) {
          const [, month, day, year] = dateMatch;
          // Pad with leading zeros if needed
          const paddedMonth = month.padStart(2, '0');
          const paddedDay = day.padStart(2, '0');
          startDate = `${year}-${paddedMonth}-${paddedDay}`;

          if (durationMatch) {
            durationDays = parseInt(durationMatch[1]);
            const start = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
            const end = new Date(start.getTime() + (durationDays - 1) * 86400000);
            endDate = end.toISOString().split('T')[0];
          }
        }

        events.push({
          name: this.toTitleCase(name),
          description,
          detail_url: detailUrl,
          cycle,
          city,
          country,
          venue_name: venueName,
          start_date: startDate,
          end_date: endDate,
          duration_days: durationDays,
          source_category: categorySlug,
        });
      });

      return {
        events,
        hasNextPage: currentPage < totalPages,
        currentPage,
        totalPages,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Error scraping ${url}:`, errorMessage);
      return {
        events: [],
        hasNextPage: false,
        currentPage: 1,
        totalPages: 1,
      };
    }
  }

  /**
   * Scrape all pages for a category
   */
  async scrapeCategory(category: EventsEyeCategory): Promise<{
    events: RawEventsEyeEvent[];
    stats: EventsEyeScrapeStats;
  }> {
    const allEvents: RawEventsEyeEvent[] = [];
    const stats: EventsEyeScrapeStats = {
      category: category.slug,
      pagesScraped: 0,
      eventsFound: 0,
      errors: [],
    };

    let page = 1;

    while (page <= this.maxPagesPerCategory) {
      const url = this.buildPageUrl(category, page);
      
      try {
        const result = await this.scrapeListingPage(url, category.slug);
        allEvents.push(...result.events);
        stats.pagesScraped++;

        // If no events found on this page, something might be wrong
        if (result.events.length === 0 && page === 1) {
          stats.errors.push(`No events found on first page of ${category.slug}`);
        }

        if (!result.hasNextPage) break;
        page++;

        // Rate limiting delay
        await this.sleep(this.delayMs);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        stats.errors.push(`Page ${page}: ${errorMessage}`);
        break;
      }
    }

    stats.eventsFound = allEvents.length;
    return { events: allEvents, stats };
  }

  /**
   * Scrape all configured categories
   */
  async scrapeAllCategories(
    onProgress?: (message: string) => void
  ): Promise<{
    events: RawEventsEyeEvent[];
    stats: EventsEyeScrapeStats[];
  }> {
    const allEvents: RawEventsEyeEvent[] = [];
    const allStats: EventsEyeScrapeStats[] = [];

    for (const category of EVENTSEYE_CATEGORIES) {
      onProgress?.(`Scraping EventsEye: ${category.slug}`);
      
      const { events, stats } = await this.scrapeCategory(category);
      allEvents.push(...events);
      allStats.push(stats);

      onProgress?.(`Found ${events.length} raw events in ${category.slug}`);

      // Brief pause between categories
      await this.sleep(this.delayMs);
    }

    return { events: allEvents, stats: allStats };
  }

  /**
   * Deduplicate events across categories (same event may appear in multiple categories)
   */
  deduplicateEvents(events: RawEventsEyeEvent[]): RawEventsEyeEvent[] {
    const seen = new Map<string, RawEventsEyeEvent>();

    for (const event of events) {
      // Key: normalized name + start date
      const key = `${event.name.toLowerCase().replace(/[^a-z0-9]/g, '')}|${event.start_date}`;

      if (!seen.has(key)) {
        seen.set(key, event);
      } else {
        // Merge: keep the entry with the longer description
        const existing = seen.get(key)!;
        const existingDescLen = existing.description?.length || 0;
        const newDescLen = event.description?.length || 0;

        if (newDescLen > existingDescLen) {
          seen.set(key, { ...existing, ...event, description: event.description });
        }
      }
    }

    return Array.from(seen.values());
  }

  /**
   * Filter out past events
   */
  filterFutureEvents(events: RawEventsEyeEvent[]): RawEventsEyeEvent[] {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return events.filter(event => {
      if (!event.start_date) return false;
      const eventDate = new Date(event.start_date);
      return eventDate >= today;
    });
  }

  /**
   * Convert ALL CAPS event names to title case
   * Preserves known acronyms
   */
  private toTitleCase(str: string): string {
    // Common acronyms to preserve in uppercase
    const acronyms = new Set([
      'AI', 'ICT', 'IT', 'IoT', 'IIoT', 'UN', 'EU', 'US', 'UK', 'UAE', 'USA',
      'COP', 'SDG', 'PPP', 'IFAT', 'MWC', 'CES', 'GIS', 'BIM', 'EV', 'VR', 'AR',
      'MR', 'XR', 'NFT', 'DeFi', 'WiFi', 'API', 'SaaS', 'PaaS', 'IaaS', 'HR',
      'CEO', 'CFO', 'CTO', 'CDO', 'CIO', 'GDPR', 'CCPA', 'HIPAA', 'ISO',
      'LED', 'LCD', 'OLED', 'HD', '4K', '8K', '3D', '2D', 'GPS', 'RFID',
      'NFC', 'USB', 'HDMI', 'SQL', 'NoSQL', 'HTML', 'CSS', 'JS', 'TS',
      'PHP', 'SQL', 'AIoT', 'M2M', 'LTE', '5G', '4G', '3G', 'Wi-Fi',
      'IP', 'TV', 'CCTV', 'HVAC', 'BMS', 'ERP', 'CRM', 'SCADA',
      'EMEA', 'APAC', 'LATAM', 'NAFTA', 'WTO', 'WHO', 'UNESCO',
      'NATO', 'OPEC', 'APEC', 'G7', 'G20', 'B2B', 'B2C', 'D2C',
      'P2P', 'C2C', 'O2O', 'AEC', 'BIM', 'CAD', 'CAM', 'CAE',
      'PLM', 'PDM', 'MES', 'WMS', 'TMS', 'OMS', 'YMS', 'APS',
      'MRP', 'ERP', 'EAM', 'CMMS', 'QMS', 'LIMS', 'ELN', 'SDMS',
    ]);

    // Split on word boundaries and spaces
    return str
      .toLowerCase()
      .replace(/[^\w\s-]|_/g, ' ') // Replace punctuation with space, except hyphens
      .replace(/\s+/g, ' ')        // Collapse multiple spaces
      .trim()
      .split(/[\s-]+/)             // Split on spaces and hyphens
      .map((word, index) => {
        const upper = word.toUpperCase();
        // Keep acronyms uppercase, but lowercase small words unless first word
        if (acronyms.has(upper)) {
          return upper;
        }
        // Small words to lowercase unless first word
        const smallWords = new Set(['a', 'an', 'the', 'and', 'but', 'or', 'for', 'nor', 'on', 'at', 'to', 'from', 'by', 'in', 'of']);
        if (index > 0 && smallWords.has(word)) {
          return word;
        }
        return word.charAt(0).toUpperCase() + word.slice(1);
      })
      .join(' ');
  }
}

// Factory function for server-side usage
export function createEventsEyeScraperService(): EventsEyeScraperService {
  return new EventsEyeScraperService({
    userAgent: process.env.EVENTSEYE_USER_AGENT || 'CivicMatchBot/1.0 (contact@civicmatch.com)',
    delayMs: parseInt(process.env.EVENTSEYE_DELAY_MS || '2000'),
    maxPagesPerCategory: parseInt(process.env.EVENTSEYE_MAX_PAGES || '30'),
  });
}
