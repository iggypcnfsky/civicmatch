// EventsEye Service - Main entry point
// Re-exports scraper and filter services for EventsEye integration

export { 
  EventsEyeScraperService, 
  createEventsEyeScraperService,
  EVENTSEYE_CATEGORIES,
  type RawEventsEyeEvent,
  type EventsEyeCategory,
  type EventsEyeScrapeStats 
} from './EventsEyeScraperService';

export { 
  EventsEyeFilterService, 
  createEventsEyeFilterService,
  type FilteredEventsEyeEvent,
  type EventsEyeFilterStats 
} from './EventsEyeFilterService';
