// Page fetching service for extracting content from event pages
// Uses simple HTTP fetch with HTML-to-text conversion

interface FetchOptions {
  timeout?: number;
  maxRetries?: number;
  userAgent?: string;
}

export class PageFetchService {
  private userAgent: string;
  private defaultTimeout: number;
  private maxRetries: number;

  constructor(options: {
    userAgent?: string;
    timeout?: number;
    maxRetries?: number;
  } = {}) {
    this.userAgent = options.userAgent || 'CivicMatchBot/1.0 (contact@civicmatch.com)';
    this.defaultTimeout = options.timeout || 10000;
    this.maxRetries = options.maxRetries || 2;
  }

  /**
   * Fetch and extract text content from a URL
   * Returns null if fetch fails or content is not useful
   */
  async fetchAndExtract(url: string, options: FetchOptions = {}): Promise<string | null> {
    const timeout = options.timeout || this.defaultTimeout;
    
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(url, {
          headers: {
            'User-Agent': options.userAgent || this.userAgent,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'keep-alive',
          },
          signal: controller.signal,
          redirect: 'follow',
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          if (response.status === 403 || response.status === 429) {
            console.warn(`Page fetch blocked (${response.status}): ${url}`);
            return null; // Don't retry on 403/429
          }
          throw new Error(`HTTP ${response.status}`);
        }

        const contentType = response.headers.get('content-type');
        if (contentType && !contentType.includes('text/html')) {
          console.warn(`Non-HTML content type for ${url}: ${contentType}`);
          return null;
        }

        const html = await response.text();
        return this.extractText(html, url);

      } catch (error) {
        const isLastAttempt = attempt === this.maxRetries - 1;
        
        if (error instanceof Error) {
          if (error.name === 'AbortError') {
            console.warn(`Page fetch timeout: ${url}`);
          } else {
            console.warn(`Page fetch error (attempt ${attempt + 1}): ${error.message}`);
          }
        }

        if (isLastAttempt) {
          return null;
        }

        // Wait before retry with exponential backoff
        await sleep(1000 * Math.pow(2, attempt));
      }
    }

    return null;
  }

  /**
   * Extract readable text from HTML
   * Simple implementation without external dependencies
   */
  private extractText(html: string, url: string): string {
    // Remove script and style tags with their content
    let text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, ' ')
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, ' ')
      .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, ' ')
      .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, ' ');

    // Try to extract from main content areas first
    const mainContent = this.extractFromMainTags(text);
    if (mainContent && mainContent.length > 200) {
      text = mainContent;
    }

    // Convert remaining HTML to text
    text = text
      .replace(/<\/?[^>]+(>|$)/g, ' ')  // Remove HTML tags
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')              // Normalize whitespace
      .trim();

    // Truncate to reasonable size for AI processing (keep first 4000 chars)
    // Focus on the beginning which usually contains event details
    const maxLength = 4000;
    if (text.length > maxLength) {
      // Try to end at a sentence boundary
      const truncated = text.substring(0, maxLength);
      const lastSentence = truncated.lastIndexOf('. ');
      if (lastSentence > maxLength * 0.8) {
        text = truncated.substring(0, lastSentence + 1);
      } else {
        text = truncated;
      }
    }

    return text;
  }

  /**
   * Extract content from main/article/event tags if present
   */
  private extractFromMainTags(html: string): string | null {
    // Try common content containers
    const selectors = [
      /<main[^>]*>([\s\S]*?)<\/main>/i,
      /<article[^>]*>([\s\S]*?)<\/article>/i,
      /<div[^>]*class="[^"]*(?:event|content|main)[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
      /<div[^>]*id="[^"]*(?:event|content|main)[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    ];

    for (const selector of selectors) {
      const match = html.match(selector);
      if (match && match[1] && match[1].length > 500) {
        return match[1];
      }
    }

    return null;
  }

  /**
   * Check if a URL has already been processed (to avoid duplicates)
   * Simple in-memory cache for a single discovery run
   */
  private processedUrls: Set<string> = new Set();

  markProcessed(url: string): void {
    this.processedUrls.add(this.normalizeUrl(url));
  }

  isProcessed(url: string): boolean {
    return this.processedUrls.has(this.normalizeUrl(url));
  }

  clearProcessed(): void {
    this.processedUrls.clear();
  }

  /**
   * Normalize URL for deduplication
   */
  private normalizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      // Remove common tracking parameters
      const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'gclid'];
      trackingParams.forEach(param => urlObj.searchParams.delete(param));
      return urlObj.toString().toLowerCase();
    } catch {
      return url.toLowerCase();
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Factory function
export function createPageFetchService(): PageFetchService {
  return new PageFetchService({
    userAgent: process.env.NOMINATIM_USER_AGENT || 'CivicMatch/1.0 (contact@civicmatch.com)',
    timeout: 10000,
    maxRetries: 2,
  });
}
