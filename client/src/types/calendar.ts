// Calendar Event Interface
export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  isAllDay: boolean;
  status: 'confirmed' | 'cancelled' | 'tentative';
  calendarType: 'primary' | 'secondary' | 'holiday';
  calendarName: string;
  calendarColor?: string;
  isHoliday: boolean;
  isUpcoming: boolean;
  isOngoing: boolean;
  isPast: boolean;
  attendees: number;
  organizer?: {
    email: string;
    displayName?: string;
  };
  htmlLink?: string;
  created?: string;
  updated?: string;
  attendanceStatus?: 'accepted' | 'declined' | 'tentative' | 'needsAction';
  timeFormat?: '12h' | '24h';
  userTimezone?: string;
}

// Calendar Preferences Interface
export interface CalendarPreferences {
  showOnDashboard: boolean;
  maxEvents: number;
  daysToShow: number;
  
  // Event type toggles
  showHolidays: boolean;
  showSecondaryCalendars: boolean;
  showAllDayEvents: boolean;
  showPastEvents: boolean;
  showOngoingEvents: boolean;
  showUpcomingEvents: boolean;
  
  // Holiday country preference
  holidayCountry: string; // US, GB, CA, AU, DE, FR, ES, IT, JP, IN, CN, BR, RU, KR, NL
  
  // Display preferences
  showEventDescriptions: boolean;
  showEventLocations: boolean;
  showAttendeeCount: boolean;
  
  // Time preferences
  timeFormat: '12h' | '24h';
  timezone: string;
  
  // Event filtering
  hideDeclinedEvents: boolean;
  hideCancelledEvents: boolean;
  
  // Calendar color preferences
  useCalendarColors: boolean;
  
  // Notification preferences
  showEventReminders: boolean;
}

// Calendar Settings Interface
export interface CalendarSettings {
  enabled: boolean;
  calendarId: string;
  preferences: CalendarPreferences;
  hasApiKey: boolean;
  hasTokens: boolean;
}

// Holiday Calendar Interface
export interface HolidayCalendar {
  id: string;
  country: string;
  countryCode: string;
  language: string;
  name: string;
}

// Calendar Events Response Interface
export interface CalendarEventsResponse {
  events: CalendarEvent[];
  rawSummary: {
    total: number;
    upcoming: number;
    ongoing: number;
    past: number;
    holidays: number;
    allDay: number;
    byCalendar: {
      primary: number;
      holiday: number;
      secondary: number;
    };
  };
  summary: {
    total: number;
    upcoming: number;
    ongoing: number;
    past: number;
    holidays: number;
    allDay: number;
    byCalendar: {
      primary: number;
      holiday: number;
      secondary: number;
    };
    filters: {
      applied: boolean;
      totalBeforeFilters: number;
      totalAfterFilters: number;
      preferences: {
        showHolidays: boolean;
        showSecondaryCalendars: boolean;
        showAllDayEvents: boolean;
        showPastEvents: boolean;
        showOngoingEvents: boolean;
        showUpcomingEvents: boolean;
        hideDeclinedEvents: boolean;
        hideCancelledEvents: boolean;
      };
    };
  };
  timeRange: {
    from: string;
    to: string;
    days: number;
  };
  preferences: {
    timeFormat: '12h' | '24h';
    timezone: string;
    holidayCountry: string;
  };
}

// Default Calendar Preferences
export const DEFAULT_CALENDAR_PREFERENCES: CalendarPreferences = {
  showOnDashboard: true,
  maxEvents: 10,
  daysToShow: 7,
  
  // Event type toggles
  showHolidays: true,
  showSecondaryCalendars: true,
  showAllDayEvents: true,
  showPastEvents: false,
  showOngoingEvents: true,
  showUpcomingEvents: true,
  
  // Holiday country preference
  holidayCountry: 'US',
  
  // Display preferences
  showEventDescriptions: true,
  showEventLocations: true,
  showAttendeeCount: false,
  
  // Time preferences
  timeFormat: '12h',
  timezone: 'UTC',
  
  // Event filtering
  hideDeclinedEvents: true,
  hideCancelledEvents: true,
  
  // Calendar color preferences
  useCalendarColors: true,
  
  // Notification preferences
  showEventReminders: false,
};

// Country Code to Name Mapping
export const COUNTRY_NAMES: Record<string, string> = {
  'US': 'United States',
  'GB': 'United Kingdom',
  'CA': 'Canada',
  'AU': 'Australia',
  'DE': 'Germany',
  'FR': 'France',
  'ES': 'Spain',
  'IT': 'Italy',
  'JP': 'Japan',
  'IN': 'India',
  'CN': 'China',
  'BR': 'Brazil',
  'RU': 'Russia',
  'KR': 'South Korea',
  'NL': 'Netherlands',
};

// Calendar Event Status Colors
export const EVENT_STATUS_COLORS = {
  confirmed: 'text-green-600',
  cancelled: 'text-red-600',
  tentative: 'text-yellow-600',
} as const;

// Calendar Type Colors
export const CALENDAR_TYPE_COLORS = {
  primary: 'bg-blue-100 text-blue-800',
  secondary: 'bg-purple-100 text-purple-800',
  holiday: 'bg-green-100 text-green-800',
} as const;
