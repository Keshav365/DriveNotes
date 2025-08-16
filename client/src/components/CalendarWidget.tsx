'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  ExternalLink,
  RefreshCw,
  Settings,
  AlertCircle,
  CheckCircle,
  XCircle,
  CalendarDays,
  Star,
  Clock4
} from 'lucide-react';
import { calendarAPI } from '@/services/api';
import { useRouter } from 'next/navigation';
import { 
  CalendarEvent,
  CalendarEventsResponse,
  CalendarSettings as CalendarSettingsType
} from '@/types/calendar';
import {
  formatEventTime,
  getEventStatusDetails,
  getCalendarTypeBadge,
  getTimeUntilEvent,
  sortEventsByTime
} from '@/utils/calendar';

interface CalendarWidgetProps {
  className?: string;
}

export default function CalendarWidget({ className = '' }: CalendarWidgetProps) {
  const router = useRouter();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Check calendar settings first
      const settingsResponse = await calendarAPI.getSettings();
      
      if (!settingsResponse.data.success) {
        setError('Failed to load calendar settings');
        setIsConnected(false);
        return;
      }

      const settings = settingsResponse.data.data;
      
      if (!settings.enabled || !settings.hasTokens) {
        setIsConnected(false);
        setEvents([]);
        return;
      }

      setIsConnected(true);

      // Load events
      const eventsResponse = await calendarAPI.getEvents({
        daysToShow: settings.preferences?.daysToShow || 7,
        maxResults: settings.preferences?.maxEvents || 10
      });

      if (eventsResponse.data.success) {
        setEvents(eventsResponse.data.data.events || []);
      } else {
        setError('Failed to load calendar events');
      }

    } catch (error: any) {
      console.error('Error loading calendar events:', error);
      
      if (error.response?.status === 401) {
        setError('Calendar authentication expired. Please reconnect in settings.');
        setIsConnected(false);
      } else if (error.response?.status === 400) {
        setError('Calendar not configured. Please check your settings.');
        setIsConnected(false);
      } else {
        setError('Failed to load calendar events');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (refreshing) return;
    
    setRefreshing(true);
    await loadEvents();
    setRefreshing(false);
  };

  // Use utility functions for event processing
  const sortedEvents = sortEventsByTime(events);

  if (loading) {
    return (
      <div className={`bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 transition-colors ${className}`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span>Upcoming Events</span>
          </h2>
        </div>
        
        <div className="flex items-center justify-center py-8">
          <div className="w-8 h-8 border-4 border-blue-600 dark:border-blue-400 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className={`bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 transition-colors ${className}`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span>Calendar</span>
          </h2>
          <button
            onClick={() => router.push('/settings?tab=calendar')}
            className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            title="Calendar Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
        
        <div className="text-center py-8">
          <Calendar className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-600 dark:text-gray-300 mb-2">Connect Your Calendar</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Connect your Google Calendar to see your upcoming events here.
          </p>
          <button
            onClick={() => router.push('/settings?tab=calendar')}
            className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
          >
            Setup Calendar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 transition-colors ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center space-x-2">
          <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <span>Upcoming Events</span>
        </h2>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
            title="Refresh Events"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          
          <button
            onClick={() => router.push('/settings?tab=calendar')}
            className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            title="Calendar Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-lg flex items-start space-x-2">
          <AlertCircle className="w-5 h-5 text-red-500 dark:text-red-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
            {error.includes('reconnect') && (
              <button
                onClick={() => router.push('/settings?tab=calendar')}
                className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 text-sm font-medium underline mt-1"
              >
                Go to Settings
              </button>
            )}
          </div>
        </div>
      )}

      <div className="space-y-3 max-h-96 overflow-y-auto">
        <AnimatePresence>
          {sortedEvents.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-8 text-gray-500 dark:text-gray-400"
            >
              <Calendar className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p>No upcoming events</p>
            </motion.div>
          ) : (
            sortedEvents.map((event, index) => {
              const statusDetails = getEventStatusDetails(event);
              const calendarBadge = getCalendarTypeBadge(event.calendarType);
              const timeUntil = getTimeUntilEvent(event);

              return (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.1 }}
                  className={`p-4 border rounded-lg hover:shadow-md transition-shadow group ${
                    statusDetails.borderColor
                  } ${statusDetails.bgColor} ${statusDetails.showStrikethrough ? 'opacity-70' : ''}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      {/* Title and Status Indicator */}
                      <div className="flex items-start space-x-2 mb-2">
                        <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${event.isHoliday ? 'bg-green-500' : event.isUpcoming ? 'bg-blue-500' : 'bg-gray-400'}`} />
                        <div className="flex-1 min-w-0">
                          <h3 className={`font-medium text-gray-900 dark:text-gray-100 leading-tight mb-1 ${
                            statusDetails.showStrikethrough ? 'line-through' : ''
                          }`}>
                            {event.summary || 'Untitled Event'}
                          </h3>
                          {/* Tags Row */}
                          <div className="flex flex-wrap gap-1 mb-2">
                            {event.isHoliday && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400">
                                <Star className="w-3 h-3 mr-1" />
                                Holiday
                              </span>
                            )}
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${calendarBadge.color}`}>
                              {calendarBadge.label}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-1 text-sm text-gray-600 dark:text-gray-300 mb-2">
                        <Clock className="w-3 h-3" />
                        <span>{formatEventTime(event, event.timeFormat)}</span>
                        {timeUntil && (
                          <span className="text-blue-600 dark:text-blue-400 font-medium ml-2">({timeUntil})</span>
                        )}
                      </div>

                      {event.location && (
                        <div className="flex items-center space-x-1 text-sm text-gray-600 dark:text-gray-300 mb-2">
                          <MapPin className="w-3 h-3" />
                          <span className="truncate">{event.location}</span>
                        </div>
                      )}

                      {event.attendees > 0 && (
                        <div className="flex items-center space-x-1 text-sm text-gray-600 dark:text-gray-300">
                          <Users className="w-3 h-3" />
                          <span>{event.attendees} attendee{event.attendees !== 1 ? 's' : ''}</span>
                        </div>
                      )}
                    </div>

                    {event.htmlLink && (
                      <button
                        onClick={() => window.open(event.htmlLink, '_blank')}
                        className="ml-3 p-2 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                        title="Open in Google Calendar"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {event.description && (
                    <div className="mt-2 pt-2 border-t border-gray-200 dark:border-slate-600">
                      <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                        {event.description}
                      </p>
                    </div>
                  )}
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>

      {sortedEvents.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-600 text-center">
          <button
            onClick={() => window.open('https://calendar.google.com', '_blank')}
            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium inline-flex items-center space-x-1 transition-colors"
          >
            <span>View all events</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}
