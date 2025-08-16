import { 
  CalendarPreferences, 
  DEFAULT_CALENDAR_PREFERENCES, 
  CalendarEvent,
  COUNTRY_NAMES
} from '@/types/calendar';

// Validate calendar preferences and fill missing values with defaults
export function validateCalendarPreferences(preferences: Partial<CalendarPreferences>): CalendarPreferences {
  return {
    ...DEFAULT_CALENDAR_PREFERENCES,
    ...preferences,
  };
}

// Format event time based on user preferences
export function formatEventTime(
  event: CalendarEvent, 
  timeFormat: '12h' | '24h' = '12h'
): string {
  const start = event.start.dateTime || event.start.date;
  const end = event.end.dateTime || event.end.date;

  if (!start) return 'No time specified';

  const startDate = new Date(start);
  const endDate = new Date(end || start);

  // All-day event
  if (event.isAllDay) {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    if (startDate.toDateString() === today.toDateString()) {
      return 'Today (All day)';
    } else if (startDate.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow (All day)';
    } else {
      return `${startDate.toLocaleDateString()} (All day)`;
    }
  }

  // Timed event
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  let dateStr = '';
  if (startDate.toDateString() === today.toDateString()) {
    dateStr = 'Today';
  } else if (startDate.toDateString() === tomorrow.toDateString()) {
    dateStr = 'Tomorrow';
  } else {
    dateStr = startDate.toLocaleDateString();
  }

  const timeOptions: Intl.DateTimeFormatOptions = timeFormat === '24h' 
    ? { hour: '2-digit', minute: '2-digit', hour12: false }
    : { hour: '2-digit', minute: '2-digit', hour12: true };

  const startTimeStr = startDate.toLocaleTimeString([], timeOptions);
  const endTimeStr = endDate.toLocaleTimeString([], timeOptions);

  return `${dateStr} ${startTimeStr} - ${endTimeStr}`;
}

// Get event status details for UI display
export function getEventStatusDetails(event: CalendarEvent) {
  if (event.status === 'cancelled') {
    return { 
      color: 'text-red-500 dark:text-red-400', 
      bgColor: 'bg-red-50 dark:bg-red-900/20', 
      borderColor: 'border-red-200 dark:border-red-800/50',
      label: 'Cancelled',
      showStrikethrough: true
    };
  }
  if (event.status === 'tentative') {
    return { 
      color: 'text-yellow-600 dark:text-yellow-400', 
      bgColor: 'bg-yellow-50 dark:bg-yellow-900/20', 
      borderColor: 'border-yellow-200 dark:border-yellow-800/50',
      label: 'Tentative',
      showStrikethrough: false
    };
  }
  if (event.isHoliday) {
    return { 
      color: 'text-green-600 dark:text-green-400', 
      bgColor: 'bg-green-50 dark:bg-green-900/20', 
      borderColor: 'border-green-200 dark:border-green-800/50',
      label: 'Holiday',
      showStrikethrough: false
    };
  }
  if (event.isUpcoming) {
    return { 
      color: 'text-blue-600 dark:text-blue-400', 
      bgColor: 'bg-blue-50 dark:bg-blue-900/20', 
      borderColor: 'border-blue-200 dark:border-blue-800/50',
      label: 'Upcoming',
      showStrikethrough: false
    };
  }
  if (event.isOngoing) {
    return { 
      color: 'text-purple-600 dark:text-purple-400', 
      bgColor: 'bg-purple-50 dark:bg-purple-900/20', 
      borderColor: 'border-purple-200 dark:border-purple-800/50',
      label: 'Ongoing',
      showStrikethrough: false
    };
  }
  return { 
    color: 'text-gray-600 dark:text-gray-400', 
    bgColor: 'bg-gray-50 dark:bg-gray-800/50', 
    borderColor: 'border-gray-200 dark:border-gray-700',
    label: 'Confirmed',
    showStrikethrough: false
  };
}

// Get calendar type badge properties
export function getCalendarTypeBadge(calendarType: CalendarEvent['calendarType']) {
  switch (calendarType) {
    case 'primary':
      return { color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400', label: 'Primary' };
    case 'secondary':
      return { color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400', label: 'Secondary' };
    case 'holiday':
      return { color: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400', label: 'Holiday' };
    default:
      return { color: 'bg-gray-100 dark:bg-gray-800/50 text-gray-800 dark:text-gray-400', label: 'Unknown' };
  }
}

// Filter events based on preferences (client-side fallback)
export function filterEventsByPreferences(
  events: CalendarEvent[], 
  preferences: CalendarPreferences
): CalendarEvent[] {
  return events.filter(event => {
    // Filter by event types
    if (!preferences.showHolidays && event.isHoliday) return false;
    if (!preferences.showSecondaryCalendars && event.calendarType === 'secondary') return false;
    if (!preferences.showAllDayEvents && event.isAllDay) return false;
    if (!preferences.showPastEvents && event.isPast) return false;
    if (!preferences.showOngoingEvents && event.isOngoing) return false;
    if (!preferences.showUpcomingEvents && event.isUpcoming) return false;
    
    // Filter by status
    if (preferences.hideDeclinedEvents && event.attendanceStatus === 'declined') return false;
    if (preferences.hideCancelledEvents && event.status === 'cancelled') return false;
    
    return true;
  });
}

// Apply display preferences to events (client-side)
export function applyDisplayPreferences(
  events: CalendarEvent[], 
  preferences: CalendarPreferences
): CalendarEvent[] {
  return events.map(event => ({
    ...event,
    description: preferences.showEventDescriptions ? event.description : '',
    location: preferences.showEventLocations ? event.location : '',
    attendees: preferences.showAttendeeCount ? event.attendees : 0,
    timeFormat: preferences.timeFormat,
    userTimezone: preferences.timezone,
  }));
}

// Get available timezones for selection
export function getCommonTimezones(): { value: string; label: string }[] {
  return [
    { value: 'UTC', label: 'UTC' },
    { value: 'America/New_York', label: 'Eastern Time' },
    { value: 'America/Chicago', label: 'Central Time' },
    { value: 'America/Denver', label: 'Mountain Time' },
    { value: 'America/Los_Angeles', label: 'Pacific Time' },
    { value: 'Europe/London', label: 'London' },
    { value: 'Europe/Paris', label: 'Paris' },
    { value: 'Europe/Berlin', label: 'Berlin' },
    { value: 'Asia/Tokyo', label: 'Tokyo' },
    { value: 'Asia/Shanghai', label: 'Shanghai' },
    { value: 'Asia/Kolkata', label: 'Mumbai/Delhi' },
    { value: 'Australia/Sydney', label: 'Sydney' },
  ];
}

// Get country options for holiday calendar selection
export function getHolidayCountryOptions(): { value: string; label: string }[] {
  return Object.entries(COUNTRY_NAMES).map(([code, name]) => ({
    value: code,
    label: name,
  }));
}

// Calculate time until next event
export function getTimeUntilEvent(event: CalendarEvent): string | null {
  if (!event.isUpcoming) return null;
  
  const startTime = event.start.dateTime || event.start.date;
  if (!startTime) return null;
  
  const eventDate = new Date(startTime);
  const now = new Date();
  const diffMs = eventDate.getTime() - now.getTime();
  
  if (diffMs <= 0) return null;
  
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays > 0) {
    return `in ${diffDays} day${diffDays !== 1 ? 's' : ''}`;
  } else if (diffHours > 0) {
    return `in ${diffHours} hour${diffHours !== 1 ? 's' : ''}`;
  } else if (diffMinutes > 0) {
    return `in ${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''}`;
  } else {
    return 'starting soon';
  }
}

// Sort events by start time
export function sortEventsByTime(events: CalendarEvent[]): CalendarEvent[] {
  return [...events].sort((a, b) => {
    const aTime = new Date(a.start.dateTime || a.start.date || '').getTime();
    const bTime = new Date(b.start.dateTime || b.start.date || '').getTime();
    return aTime - bTime;
  });
}

// Group events by date
export function groupEventsByDate(events: CalendarEvent[]): Record<string, CalendarEvent[]> {
  return events.reduce((groups, event) => {
    const startTime = event.start.dateTime || event.start.date;
    if (!startTime) return groups;
    
    const date = new Date(startTime).toDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(event);
    return groups;
  }, {} as Record<string, CalendarEvent[]>);
}

// Validate if user preferences have required fields
export function validatePreferencesComplete(preferences: Partial<CalendarPreferences>): boolean {
  const required: (keyof CalendarPreferences)[] = [
    'holidayCountry',
    'timeFormat', 
    'timezone'
  ];
  
  return required.every(field => preferences[field] !== undefined);
}
