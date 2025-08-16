'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  User,
  Calendar,
  Key,
  Settings as SettingsIcon,
  Save,
  ArrowLeft,
  ExternalLink,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  EyeOff,
  Clock,
  Globe,
  Filter,
  Palette,
  Bell,
  Layout,
  File,
  Folder,
  HardDrive,
  Zap,
  StickyNote
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { calendarAPI, userAPI } from '@/services/api';
import { useRouter } from 'next/navigation';
import { 
  CalendarSettings as CalendarSettingsType, 
  CalendarPreferences,
  DEFAULT_CALENDAR_PREFERENCES,
  HolidayCalendar
} from '@/types/calendar';
import { 
  validateCalendarPreferences, 
  getHolidayCountryOptions, 
  getCommonTimezones 
} from '@/utils/calendar';
import {
  LayoutSettings,
  DEFAULT_LAYOUT_SETTINGS,
  WIDGET_INFO,
  WidgetPreferences
} from '@/types/layout';

interface CalendarSettings {
  enabled: boolean;
  calendarId: string;
  preferences: {
    showOnDashboard: boolean;
    maxEvents: number;
    daysToShow: number;
  };
  hasApiKey: boolean;
  hasTokens: boolean;
}

export default function SettingsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', content: '' });
  
  // Profile state
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    email: ''
  });

  // Calendar state - using comprehensive preferences
  const [calendarSettings, setCalendarSettings] = useState<CalendarSettingsType>({
    enabled: false,
    calendarId: 'primary',
    preferences: DEFAULT_CALENDAR_PREFERENCES,
    hasApiKey: false,
    hasTokens: false
  });

  // Holiday calendars state
  const [holidayCalendars, setHolidayCalendars] = useState<HolidayCalendar[]>([]);
  const [holidayCalendarsLoading, setHolidayCalendarsLoading] = useState(false);
  
  // Layout state
  const [layoutSettings, setLayoutSettings] = useState<LayoutSettings>(DEFAULT_LAYOUT_SETTINGS);
  const [layoutLoading, setLayoutLoading] = useState(false);
  
  // Get utility dropdown options
  const countryOptions = getHolidayCountryOptions();
  const timezoneOptions = getCommonTimezones();

  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [calendarLoading, setCalendarLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setProfileData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || ''
      });
      loadCalendarSettings();
      loadLayoutSettings();
    }
  }, [user]);

  const loadCalendarSettings = async () => {
    try {
      const response = await calendarAPI.getSettings();
      if (response.data.success) {
        setCalendarSettings(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load calendar settings:', error);
    }
  };

  const handleProfileSave = async () => {
    if (!profileData.firstName || !profileData.lastName) {
      setMessage({ type: 'error', content: 'Please fill in all required fields' });
      return;
    }

    try {
      setLoading(true);
      await userAPI.updateProfile(profileData);
      setMessage({ type: 'success', content: 'Profile updated successfully!' });
    } catch (error) {
      setMessage({ type: 'error', content: 'Failed to update profile' });
    } finally {
      setLoading(false);
    }
  };

  const handleCalendarSettingsSave = async () => {
    try {
      setCalendarLoading(true);
      
      const updateData: any = {
        enabled: calendarSettings.enabled,
        calendarId: calendarSettings.calendarId,
        preferences: calendarSettings.preferences
      };

      if (apiKey.trim()) {
        updateData.apiKey = apiKey.trim();
      }

      const response = await calendarAPI.updateSettings(updateData);
      
      if (response.data.success) {
        setCalendarSettings(response.data.data);
        setMessage({ type: 'success', content: 'Calendar settings updated successfully!' });
        if (apiKey.trim()) {
          setApiKey(''); // Clear API key field after saving
        }
      }
    } catch (error) {
      setMessage({ type: 'error', content: 'Failed to update calendar settings' });
    } finally {
      setCalendarLoading(false);
    }
  };

  const handleConnectCalendar = async () => {
    if (!calendarSettings.hasApiKey) {
      setMessage({ type: 'error', content: 'Please save your Google Calendar API key first' });
      return;
    }

    try {
      setCalendarLoading(true);
      const response = await calendarAPI.initAuth();
      
      if (response.data.success && response.data.authUrl) {
        // Open Google OAuth in a new window
        window.open(response.data.authUrl, 'google-auth', 'width=500,height=600');
        
        // Listen for the auth completion
        const handleAuthMessage = (event: MessageEvent) => {
          if (event.origin === window.location.origin && event.data.type === 'CALENDAR_AUTH_SUCCESS') {
            loadCalendarSettings();
            setMessage({ type: 'success', content: 'Calendar connected successfully!' });
            window.removeEventListener('message', handleAuthMessage);
          }
        };

        window.addEventListener('message', handleAuthMessage);
      }
    } catch (error) {
      setMessage({ type: 'error', content: 'Failed to initialize calendar authentication' });
    } finally {
      setCalendarLoading(false);
    }
  };

  const handleDisconnectCalendar = async () => {
    if (!confirm('Are you sure you want to disconnect your Google Calendar?')) {
      return;
    }

    try {
      setCalendarLoading(true);
      await calendarAPI.disconnect();
      loadCalendarSettings();
      setMessage({ type: 'success', content: 'Calendar disconnected successfully!' });
    } catch (error) {
      setMessage({ type: 'error', content: 'Failed to disconnect calendar' });
    } finally {
      setCalendarLoading(false);
    }
  };

  const handleLayoutSettingsSave = async () => {
    try {
      setLayoutLoading(true);
      
      // For now, save to localStorage (in a real app, you'd save to backend)
      const updatedSettings = {
        ...layoutSettings,
        lastModified: new Date().toISOString()
      };
      
      localStorage.setItem('dashboardLayout', JSON.stringify(updatedSettings));
      setLayoutSettings(updatedSettings);
      setMessage({ type: 'success', content: 'Layout settings saved successfully!' });
    } catch (error) {
      setMessage({ type: 'error', content: 'Failed to save layout settings' });
    } finally {
      setLayoutLoading(false);
    }
  };

  const loadLayoutSettings = () => {
    try {
      const saved = localStorage.getItem('dashboardLayout');
      if (saved) {
        const parsedSettings = JSON.parse(saved);
        setLayoutSettings(parsedSettings);
      }
    } catch (error) {
      console.error('Failed to load layout settings:', error);
    }
  };

  const resetLayoutSettings = () => {
    if (confirm('Are you sure you want to reset all layout settings to default?')) {
      setLayoutSettings(DEFAULT_LAYOUT_SETTINGS);
      localStorage.removeItem('dashboardLayout');
      setMessage({ type: 'success', content: 'Layout settings reset to default!' });
    }
  };

  const getWidgetIcon = (iconName: string) => {
    const icons = {
      File: <File className="w-5 h-5" />,
      Folder: <Folder className="w-5 h-5" />,
      HardDrive: <HardDrive className="w-5 h-5" />,
      Calendar: <Calendar className="w-5 h-5" />,
      Zap: <Zap className="w-5 h-5" />,
      StickyNote: <StickyNote className="w-5 h-5" />
    };
    return icons[iconName as keyof typeof icons] || <File className="w-5 h-5" />;
  };

  const clearMessage = () => {
    setMessage({ type: '', content: '' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800 transition-colors">
      {/* Header */}
      <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-lg shadow-sm border-b border-gray-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center space-x-2">
                <SettingsIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Settings</h1>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg overflow-hidden transition-colors">
          {/* Tabs */}
          <div className="border-b border-gray-200 dark:border-slate-600">
            <div className="flex">
              <button
                onClick={() => setActiveTab('profile')}
                className={`flex-1 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'profile'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-slate-500'
                }`}
              >
                <div className="flex items-center justify-center space-x-2">
                  <User className="w-4 h-4" />
                  <span>Profile</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('calendar')}
                className={`flex-1 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'calendar'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-slate-500'
                }`}
              >
                <div className="flex items-center justify-center space-x-2">
                  <Calendar className="w-4 h-4" />
                  <span>Google Calendar</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('layout')}
                className={`flex-1 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'layout'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-slate-500'
                }`}
              >
                <div className="flex items-center justify-center space-x-2">
                  <Layout className="w-4 h-4" />
                  <span>Dashboard Layout</span>
                </div>
              </button>
            </div>
          </div>

          {/* Message */}
          {message.content && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`mx-6 mt-6 p-4 rounded-lg flex items-center space-x-3 ${
                message.type === 'success'
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : message.type === 'error'
                  ? 'bg-red-50 text-red-700 border border-red-200'
                  : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
              }`}
            >
              {message.type === 'success' && <CheckCircle className="w-5 h-5" />}
              {message.type === 'error' && <XCircle className="w-5 h-5" />}
              {message.type === 'warning' && <AlertCircle className="w-5 h-5" />}
              <span className="flex-1">{message.content}</span>
              <button onClick={clearMessage} className="text-current hover:opacity-75">
                <XCircle className="w-4 h-4" />
              </button>
            </motion.div>
          )}

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'profile' && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">Profile Information</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      First Name
                    </label>
                    <input
                      type="text"
                      id="firstName"
                      value={profileData.firstName}
                      onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="Enter your first name"
                    />
                  </div>

                  <div>
                    <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Last Name
                    </label>
                    <input
                      type="text"
                      id="lastName"
                      value={profileData.lastName}
                      onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="Enter your last name"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      id="email"
                      value={profileData.email}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-500 dark:text-gray-400 transition-colors"
                      placeholder="Your email address"
                    />
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Email cannot be changed</p>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    onClick={handleProfileSave}
                    disabled={loading}
                    className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Save className="w-4 h-4" />
                    <span>{loading ? 'Saving...' : 'Save Changes'}</span>
                  </button>
                </div>
              </motion.div>
            )}

            {activeTab === 'calendar' && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">Google Calendar Integration</h2>
                  <div className="flex items-center space-x-2">
                    {calendarSettings.hasTokens ? (
                      <div className="flex items-center space-x-2 text-green-600">
                        <CheckCircle className="w-4 h-4" />
                        <span className="text-sm font-medium">Connected</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400">
                        <XCircle className="w-4 h-4" />
                        <span className="text-sm font-medium">Not Connected</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* API Key Section */}
                <div className="bg-gray-50 dark:bg-slate-700 p-4 rounded-lg transition-colors">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3 flex items-center space-x-2">
                    <Key className="w-4 h-4" />
                    <span>Google Calendar API Key</span>
                    {calendarSettings.hasApiKey && <CheckCircle className="w-4 h-4 text-green-500" />}
                  </h3>
                  
                  <div className="space-y-3">
                    <div className="relative">
                      <input
                        type={showApiKey ? "text" : "password"}
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        placeholder={calendarSettings.hasApiKey ? "API key configured (enter new key to update)" : "Enter your Google Calendar API key"}
                      />
                      <button
                        type="button"
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                      >
                        {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    
                    <div className="text-xs text-gray-600 dark:text-gray-300 space-y-1">
                      <p>• Go to <a href="https://console.developers.google.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center space-x-1">
                        <span>Google Cloud Console</span>
                        <ExternalLink className="w-3 h-3" />
                      </a></p>
                      <p>• Create a project and enable the Google Calendar API</p>
                      <p>• Create credentials (API key) and paste it here</p>
                    </div>
                  </div>
                </div>

                {/* Calendar Settings */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Enable Calendar Integration</label>
                    <input
                      type="checkbox"
                      checked={calendarSettings.enabled}
                      onChange={(e) => setCalendarSettings({
                        ...calendarSettings,
                        enabled: e.target.checked
                      })}
                      className="w-4 h-4 text-blue-600 bg-gray-100 dark:bg-slate-700 border-gray-300 dark:border-slate-500 rounded focus:ring-blue-500 focus:ring-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Calendar ID</label>
                    <input
                      type="text"
                      value={calendarSettings.calendarId}
                      onChange={(e) => setCalendarSettings({
                        ...calendarSettings,
                        calendarId: e.target.value
                      })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="primary"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Use 'primary' for your main calendar or enter a specific calendar ID</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Max Events</label>
                      <input
                        type="number"
                        min="1"
                        max="50"
                        value={calendarSettings.preferences.maxEvents}
                        onChange={(e) => setCalendarSettings({
                          ...calendarSettings,
                          preferences: {
                            ...calendarSettings.preferences,
                            maxEvents: parseInt(e.target.value) || 10
                          }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Days to Show</label>
                      <input
                        type="number"
                        min="1"
                        max="30"
                        value={calendarSettings.preferences.daysToShow}
                        onChange={(e) => setCalendarSettings({
                          ...calendarSettings,
                          preferences: {
                            ...calendarSettings.preferences,
                            daysToShow: parseInt(e.target.value) || 7
                          }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      />
                    </div>

                    <div className="flex items-center justify-center">
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={calendarSettings.preferences.showOnDashboard}
                          onChange={(e) => setCalendarSettings({
                            ...calendarSettings,
                            preferences: {
                              ...calendarSettings.preferences,
                              showOnDashboard: e.target.checked
                            }
                          })}
                          className="w-4 h-4 text-blue-600 bg-gray-100 dark:bg-slate-700 border-gray-300 dark:border-slate-500 rounded focus:ring-blue-500 focus:ring-2"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">Show on Dashboard</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Event Filtering Preferences */}
                <div className="bg-gray-50 dark:bg-slate-700 p-4 rounded-lg transition-colors">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-4 flex items-center space-x-2">
                    <Filter className="w-4 h-4" />
                    <span>Event Filtering</span>
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={calendarSettings.preferences.showHolidays}
                        onChange={(e) => setCalendarSettings({
                          ...calendarSettings,
                          preferences: {
                            ...calendarSettings.preferences,
                            showHolidays: e.target.checked
                          }
                        })}
                        className="w-4 h-4 text-blue-600 bg-gray-100 dark:bg-slate-700 border-gray-300 dark:border-slate-500 rounded focus:ring-blue-500 focus:ring-2"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Show Holidays</span>
                    </label>

                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={calendarSettings.preferences.showSecondaryCalendars}
                        onChange={(e) => setCalendarSettings({
                          ...calendarSettings,
                          preferences: {
                            ...calendarSettings.preferences,
                            showSecondaryCalendars: e.target.checked
                          }
                        })}
                        className="w-4 h-4 text-blue-600 bg-gray-100 dark:bg-slate-700 border-gray-300 dark:border-slate-500 rounded focus:ring-blue-500 focus:ring-2"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Secondary Calendars</span>
                    </label>

                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={calendarSettings.preferences.showAllDayEvents}
                        onChange={(e) => setCalendarSettings({
                          ...calendarSettings,
                          preferences: {
                            ...calendarSettings.preferences,
                            showAllDayEvents: e.target.checked
                          }
                        })}
                        className="w-4 h-4 text-blue-600 bg-gray-100 dark:bg-slate-700 border-gray-300 dark:border-slate-500 rounded focus:ring-blue-500 focus:ring-2"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">All-Day Events</span>
                    </label>

                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={calendarSettings.preferences.showPastEvents}
                        onChange={(e) => setCalendarSettings({
                          ...calendarSettings,
                          preferences: {
                            ...calendarSettings.preferences,
                            showPastEvents: e.target.checked
                          }
                        })}
                        className="w-4 h-4 text-blue-600 bg-gray-100 dark:bg-slate-700 border-gray-300 dark:border-slate-500 rounded focus:ring-blue-500 focus:ring-2"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Past Events</span>
                    </label>

                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={calendarSettings.preferences.showOngoingEvents}
                        onChange={(e) => setCalendarSettings({
                          ...calendarSettings,
                          preferences: {
                            ...calendarSettings.preferences,
                            showOngoingEvents: e.target.checked
                          }
                        })}
                        className="w-4 h-4 text-blue-600 bg-gray-100 dark:bg-slate-700 border-gray-300 dark:border-slate-500 rounded focus:ring-blue-500 focus:ring-2"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Ongoing Events</span>
                    </label>

                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={calendarSettings.preferences.showUpcomingEvents}
                        onChange={(e) => setCalendarSettings({
                          ...calendarSettings,
                          preferences: {
                            ...calendarSettings.preferences,
                            showUpcomingEvents: e.target.checked
                          }
                        })}
                        className="w-4 h-4 text-blue-600 bg-gray-100 dark:bg-slate-700 border-gray-300 dark:border-slate-500 rounded focus:ring-blue-500 focus:ring-2"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Upcoming Events</span>
                    </label>
                  </div>
                </div>

                {/* Event Status Filtering */}
                <div className="bg-gray-50 dark:bg-slate-700 p-4 rounded-lg transition-colors">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-4 flex items-center space-x-2">
                    <XCircle className="w-4 h-4" />
                    <span>Hide Events by Status</span>
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={calendarSettings.preferences.hideDeclinedEvents}
                        onChange={(e) => setCalendarSettings({
                          ...calendarSettings,
                          preferences: {
                            ...calendarSettings.preferences,
                            hideDeclinedEvents: e.target.checked
                          }
                        })}
                        className="w-4 h-4 text-blue-600 bg-gray-100 dark:bg-slate-700 border-gray-300 dark:border-slate-500 rounded focus:ring-blue-500 focus:ring-2"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Hide Declined Events</span>
                    </label>

                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={calendarSettings.preferences.hideCancelledEvents}
                        onChange={(e) => setCalendarSettings({
                          ...calendarSettings,
                          preferences: {
                            ...calendarSettings.preferences,
                            hideCancelledEvents: e.target.checked
                          }
                        })}
                        className="w-4 h-4 text-blue-600 bg-gray-100 dark:bg-slate-700 border-gray-300 dark:border-slate-500 rounded focus:ring-blue-500 focus:ring-2"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Hide Cancelled Events</span>
                    </label>
                  </div>
                </div>

                {/* Display Preferences */}
                <div className="bg-gray-50 dark:bg-slate-700 p-4 rounded-lg transition-colors">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-4 flex items-center space-x-2">
                    <Palette className="w-4 h-4" />
                    <span>Display Options</span>
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={calendarSettings.preferences.showEventDescriptions}
                        onChange={(e) => setCalendarSettings({
                          ...calendarSettings,
                          preferences: {
                            ...calendarSettings.preferences,
                            showEventDescriptions: e.target.checked
                          }
                        })}
                        className="w-4 h-4 text-blue-600 bg-gray-100 dark:bg-slate-700 border-gray-300 dark:border-slate-500 rounded focus:ring-blue-500 focus:ring-2"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Show Descriptions</span>
                    </label>

                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={calendarSettings.preferences.showEventLocations}
                        onChange={(e) => setCalendarSettings({
                          ...calendarSettings,
                          preferences: {
                            ...calendarSettings.preferences,
                            showEventLocations: e.target.checked
                          }
                        })}
                        className="w-4 h-4 text-blue-600 bg-gray-100 dark:bg-slate-700 border-gray-300 dark:border-slate-500 rounded focus:ring-blue-500 focus:ring-2"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Show Locations</span>
                    </label>

                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={calendarSettings.preferences.showAttendeeCount}
                        onChange={(e) => setCalendarSettings({
                          ...calendarSettings,
                          preferences: {
                            ...calendarSettings.preferences,
                            showAttendeeCount: e.target.checked
                          }
                        })}
                        className="w-4 h-4 text-blue-600 bg-gray-100 dark:bg-slate-700 border-gray-300 dark:border-slate-500 rounded focus:ring-blue-500 focus:ring-2"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Show Attendee Counts</span>
                    </label>

                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={calendarSettings.preferences.showEventReminders}
                        onChange={(e) => setCalendarSettings({
                          ...calendarSettings,
                          preferences: {
                            ...calendarSettings.preferences,
                            showEventReminders: e.target.checked
                          }
                        })}
                        className="w-4 h-4 text-blue-600 bg-gray-100 dark:bg-slate-700 border-gray-300 dark:border-slate-500 rounded focus:ring-blue-500 focus:ring-2"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Show Event Reminders</span>
                    </label>

                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={calendarSettings.preferences.useCalendarColors}
                        onChange={(e) => setCalendarSettings({
                          ...calendarSettings,
                          preferences: {
                            ...calendarSettings.preferences,
                            useCalendarColors: e.target.checked
                          }
                        })}
                        className="w-4 h-4 text-blue-600 bg-gray-100 dark:bg-slate-700 border-gray-300 dark:border-slate-500 rounded focus:ring-blue-500 focus:ring-2"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Use Calendar Colors</span>
                    </label>
                  </div>
                </div>

                {/* Time & Timezone Settings */}
                <div className="bg-gray-50 dark:bg-slate-700 p-4 rounded-lg transition-colors">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-4 flex items-center space-x-2">
                    <Clock className="w-4 h-4" />
                    <span>Time & Timezone Settings</span>
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Time Format</label>
                      <select
                        value={calendarSettings.preferences.timeFormat}
                        onChange={(e) => setCalendarSettings({
                          ...calendarSettings,
                          preferences: {
                            ...calendarSettings.preferences,
                            timeFormat: e.target.value as '12h' | '24h'
                          }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      >
                        <option value="12h">12-hour (2:30 PM)</option>
                        <option value="24h">24-hour (14:30)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Timezone</label>
                      <select
                        value={calendarSettings.preferences.timezone}
                        onChange={(e) => setCalendarSettings({
                          ...calendarSettings,
                          preferences: {
                            ...calendarSettings.preferences,
                            timezone: e.target.value
                          }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      >
                        {timezoneOptions.map((tz) => (
                          <option key={tz.value} value={tz.value}>
                            {tz.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Holiday Calendar Settings */}
                <div className="bg-gray-50 dark:bg-slate-700 p-4 rounded-lg transition-colors">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-4 flex items-center space-x-2">
                    <Globe className="w-4 h-4" />
                    <span>Holiday Calendar Settings</span>
                  </h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Holiday Country</label>
                      <select
                        value={calendarSettings.preferences.holidayCountry}
                        onChange={(e) => setCalendarSettings({
                          ...calendarSettings,
                          preferences: {
                            ...calendarSettings.preferences,
                            holidayCountry: e.target.value
                          }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      >
                        {countryOptions.map((country) => (
                          <option key={country.value} value={country.value}>
                            {country.label}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 transition-colors">Select your country to display relevant holidays</p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <button
                    onClick={handleCalendarSettingsSave}
                    disabled={calendarLoading}
                    className="flex-1 flex items-center justify-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Save className="w-4 h-4" />
                    <span>{calendarLoading ? 'Saving...' : 'Save Settings'}</span>
                  </button>

                  {calendarSettings.hasTokens ? (
                    <button
                      onClick={handleDisconnectCalendar}
                      disabled={calendarLoading}
                      className="flex-1 flex items-center justify-center space-x-2 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Disconnect Calendar</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleConnectCalendar}
                      disabled={calendarLoading || !calendarSettings.hasApiKey}
                      className="flex-1 flex items-center justify-center space-x-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Calendar className="w-4 h-4" />
                      <span>Connect Calendar</span>
                    </button>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'layout' && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">Dashboard Layout & Widgets</h2>
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-2 text-blue-600 dark:text-blue-400">
                      <Layout className="w-4 h-4" />
                      <span className="text-sm font-medium">Customize Your Dashboard</span>
                    </div>
                  </div>
                </div>

                {/* Layout Enable/Disable */}
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-1">Custom Layout</h3>
                      <p className="text-xs text-blue-700 dark:text-blue-400">Enable custom widget configuration for your dashboard</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={layoutSettings.enabled}
                      onChange={(e) => setLayoutSettings({
                        ...layoutSettings,
                        enabled: e.target.checked
                      })}
                      className="w-4 h-4 text-blue-600 bg-gray-100 dark:bg-slate-700 border-gray-300 dark:border-slate-500 rounded focus:ring-blue-500 focus:ring-2"
                    />
                  </div>
                </div>

                {/* Widget Controls */}
                <div className="space-y-6">
                  {/* Main Area Widgets */}
                  <div className="bg-gray-50 dark:bg-slate-700 p-4 rounded-lg transition-colors">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-4 flex items-center space-x-2">
                      <Layout className="w-4 h-4" />
                      <span>Main Dashboard Widgets</span>
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {WIDGET_INFO.filter(widget => widget.category === 'main').map((widget) => (
                        <div key={widget.id} className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-gray-200 dark:border-slate-600 hover:border-blue-300 dark:hover:border-blue-500 transition-colors">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start space-x-3">
                              <div className="text-blue-600 dark:text-blue-400 mt-1">
                                {getWidgetIcon(widget.icon)}
                              </div>
                              <div className="flex-1">
                                <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-1">{widget.name}</h4>
                                <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">{widget.description}</p>
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400">
                                  {widget.category}
                                </span>
                              </div>
                            </div>
                            <input
                              type="checkbox"
                              checked={layoutSettings.widgets[widget.id as keyof WidgetPreferences] as boolean}
                              onChange={(e) => setLayoutSettings({
                                ...layoutSettings,
                                widgets: {
                                  ...layoutSettings.widgets,
                                  [widget.id]: e.target.checked
                                }
                              })}
                              disabled={!layoutSettings.enabled}
                              className="w-5 h-5 text-blue-600 bg-gray-100 dark:bg-slate-700 border-gray-300 dark:border-slate-500 rounded focus:ring-blue-500 focus:ring-2 disabled:opacity-50"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Sidebar Widgets */}
                  <div className="bg-gray-50 dark:bg-slate-700 p-4 rounded-lg transition-colors">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-4 flex items-center space-x-2">
                      <Palette className="w-4 h-4" />
                      <span>Sidebar Widgets</span>
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {WIDGET_INFO.filter(widget => widget.category === 'sidebar').map((widget) => (
                        <div key={widget.id} className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-gray-200 dark:border-slate-600 hover:border-blue-300 dark:hover:border-blue-500 transition-colors">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start space-x-3">
                              <div className="text-blue-600 dark:text-blue-400 mt-1">
                                {getWidgetIcon(widget.icon)}
                              </div>
                              <div className="flex-1">
                                <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-1">{widget.name}</h4>
                                <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">{widget.description}</p>
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400">
                                  {widget.category}
                                </span>
                              </div>
                            </div>
                            <input
                              type="checkbox"
                              checked={layoutSettings.widgets[widget.id as keyof WidgetPreferences] as boolean}
                              onChange={(e) => setLayoutSettings({
                                ...layoutSettings,
                                widgets: {
                                  ...layoutSettings.widgets,
                                  [widget.id]: e.target.checked
                                }
                              })}
                              disabled={!layoutSettings.enabled}
                              className="w-5 h-5 text-blue-600 bg-gray-100 dark:bg-slate-700 border-gray-300 dark:border-slate-500 rounded focus:ring-blue-500 focus:ring-2 disabled:opacity-50"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* General Settings */}
                  <div className="bg-gray-50 dark:bg-slate-700 p-4 rounded-lg transition-colors">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-4 flex items-center space-x-2">
                      <SettingsIcon className="w-4 h-4" />
                      <span>General Layout Settings</span>
                    </h3>
                    
                    <div className="space-y-4">
                      {/* Quick Actions Toggle */}
                      {WIDGET_INFO.filter(widget => widget.category === 'general').map((widget) => (
                        <div key={widget.id} className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-gray-200 dark:border-slate-600 transition-colors">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start space-x-3">
                              <div className="text-blue-600 dark:text-blue-400 mt-1">
                                {getWidgetIcon(widget.icon)}
                              </div>
                              <div className="flex-1">
                                <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-1">{widget.name}</h4>
                                <p className="text-sm text-gray-600 dark:text-gray-300">{widget.description}</p>
                              </div>
                            </div>
                            <input
                              type="checkbox"
                              checked={layoutSettings.widgets[widget.id as keyof WidgetPreferences] as boolean}
                              onChange={(e) => setLayoutSettings({
                                ...layoutSettings,
                                widgets: {
                                  ...layoutSettings.widgets,
                                  [widget.id]: e.target.checked
                                }
                              })}
                              disabled={!layoutSettings.enabled}
                              className="w-5 h-5 text-blue-600 bg-gray-100 dark:bg-slate-700 border-gray-300 dark:border-slate-500 rounded focus:ring-blue-500 focus:ring-2 disabled:opacity-50"
                            />
                          </div>
                        </div>
                      ))}

                      {/* Sidebar Position */}
                      <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-gray-200 dark:border-slate-600 transition-colors">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-1">Sidebar Position</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-300">Choose where to display the sidebar widgets</p>
                          </div>
                        </div>
                        <div className="flex space-x-4">
                          <label className="flex items-center space-x-2">
                            <input
                              type="radio"
                              name="sidebarPosition"
                              value="left"
                              checked={layoutSettings.widgets.sidebarPosition === 'left'}
                              onChange={(e) => setLayoutSettings({
                                ...layoutSettings,
                                widgets: {
                                  ...layoutSettings.widgets,
                                  sidebarPosition: 'left'
                                }
                              })}
                              disabled={!layoutSettings.enabled}
                              className="w-4 h-4 text-blue-600 bg-gray-100 dark:bg-slate-700 border-gray-300 dark:border-slate-500 focus:ring-blue-500 focus:ring-2 disabled:opacity-50"
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300">Left Side</span>
                          </label>
                          <label className="flex items-center space-x-2">
                            <input
                              type="radio"
                              name="sidebarPosition"
                              value="right"
                              checked={layoutSettings.widgets.sidebarPosition === 'right'}
                              onChange={(e) => setLayoutSettings({
                                ...layoutSettings,
                                widgets: {
                                  ...layoutSettings.widgets,
                                  sidebarPosition: 'right'
                                }
                              })}
                              disabled={!layoutSettings.enabled}
                              className="w-4 h-4 text-blue-600 bg-gray-100 dark:bg-slate-700 border-gray-300 dark:border-slate-500 focus:ring-blue-500 focus:ring-2 disabled:opacity-50"
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300">Right Side</span>
                          </label>
                        </div>
                      </div>

                      {/* File Browser Size */}
                      <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-gray-200 dark:border-slate-600 transition-colors">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-1">File Browser Size</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-300">Choose the size of the embedded file browser widget</p>
                          </div>
                        </div>
                        <select
                          value={layoutSettings.widgets.widgetSizes.fileBrowser}
                          onChange={(e) => setLayoutSettings({
                            ...layoutSettings,
                            widgets: {
                              ...layoutSettings.widgets,
                              widgetSizes: {
                                ...layoutSettings.widgets.widgetSizes,
                                fileBrowser: e.target.value as 'small' | 'medium' | 'large'
                              }
                            }
                          })}
                          disabled={!layoutSettings.enabled || !layoutSettings.widgets.fileBrowserWidget}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:bg-gray-100 dark:disabled:bg-slate-700 transition-colors"
                        >
                          <option value="small">Small (5 items, minimal features)</option>
                          <option value="medium">Medium (10 items, basic toolbar)</option>
                          <option value="large">Large (unlimited items, full features)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <button
                    onClick={handleLayoutSettingsSave}
                    disabled={layoutLoading}
                    className="flex-1 flex items-center justify-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Save className="w-4 h-4" />
                    <span>{layoutLoading ? 'Saving...' : 'Save Layout Settings'}</span>
                  </button>

                  <button
                    onClick={resetLayoutSettings}
                    disabled={layoutLoading}
                    className="flex-1 flex items-center justify-center space-x-2 px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Reset to Default</span>
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
