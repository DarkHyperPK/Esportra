import { useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/apiClient';

export interface AnalyticsEvent {
  event_type: string;
  event_data: any;
  session_id?: string;
  ip_address?: string;
  user_agent?: string;
}

export const useAnalytics = () => {
  const { user } = useAuth();

  const trackEvent = useCallback(async (eventType: string, eventData: any = {}) => {
    try {
      await apiClient.post('/api/analytics/events', {
        eventType,
        eventData: JSON.stringify(eventData),
        sessionId: sessionStorage.getItem('session_id') || undefined,
        userAgent: navigator.userAgent,
      });
    } catch (error) {
      console.error('Error tracking analytics event:', error);
    }
  }, []);

  const trackPageView = useCallback((page: string, additionalData: any = {}) => {
    trackEvent('page_view', { page, timestamp: new Date().toISOString(), ...additionalData });
  }, [trackEvent]);

  const trackUserAction = useCallback((action: string, target: string, additionalData: any = {}) => {
    trackEvent('user_action', { action, target, timestamp: new Date().toISOString(), ...additionalData });
  }, [trackEvent]);

  const trackTournamentEvent = useCallback((event: string, tournamentId: string, additionalData: any = {}) => {
    trackEvent('tournament_event', { event, tournament_id: tournamentId, timestamp: new Date().toISOString(), ...additionalData });
  }, [trackEvent]);

  const trackTeamEvent = useCallback((event: string, teamId: string, additionalData: any = {}) => {
    trackEvent('team_event', { event, team_id: teamId, timestamp: new Date().toISOString(), ...additionalData });
  }, [trackEvent]);

  const trackVenueEvent = useCallback((event: string, venueId: string, additionalData: any = {}) => {
    trackEvent('venue_event', { event, venue_id: venueId, timestamp: new Date().toISOString(), ...additionalData });
  }, [trackEvent]);

  const trackPaymentEvent = useCallback((event: string, paymentId: string, amount: number, additionalData: any = {}) => {
    trackEvent('payment_event', { event, payment_id: paymentId, amount, timestamp: new Date().toISOString(), ...additionalData });
  }, [trackEvent]);

  const trackSearch = useCallback((query: string, filters: any = {}, results: number) => {
    trackEvent('search', { query, filters, results_count: results, timestamp: new Date().toISOString() });
  }, [trackEvent]);

  const trackError = useCallback((error: string, context: string, additionalData: any = {}) => {
    trackEvent('error', { error_message: error, context, timestamp: new Date().toISOString(), ...additionalData });
  }, [trackEvent]);

  const trackPerformance = useCallback((metric: string, value: number, additionalData: any = {}) => {
    trackEvent('performance', { metric, value, timestamp: new Date().toISOString(), ...additionalData });
  }, [trackEvent]);

  const trackConversion = useCallback((conversionType: string, value: number, additionalData: any = {}) => {
    trackEvent('conversion', { conversion_type: conversionType, value, timestamp: new Date().toISOString(), ...additionalData });
  }, [trackEvent]);

  const getAnalyticsData = useCallback(async (startDate: string, endDate: string, eventType?: string) => {
    try {
      const params = new URLSearchParams({ startDate, endDate });
      if (eventType) params.set('eventType', eventType);
      return await apiClient.get<any[]>(`/api/analytics/events?${params}`);
    } catch (error) {
      console.error('Error fetching analytics data:', error);
      return null;
    }
  }, []);

  const getUserAnalytics = useCallback(async (userId: string, startDate: string, endDate: string) => {
    try {
      const params = new URLSearchParams({ startDate, endDate });
      return await apiClient.get<{ data: any[]; summary: any }>(`/api/analytics/user/${userId}?${params}`);
    } catch (error) {
      console.error('Error fetching user analytics:', error);
      return null;
    }
  }, []);

  const getPopularPages = useCallback(async (startDate: string, endDate: string, limit: number = 10) => {
    try {
      const events = await getAnalyticsData(startDate, endDate, 'page_view');
      if (!events) return [];
      const pageCounts: { [key: string]: number } = {};
      events.forEach((event: any) => {
        const page = typeof event.event_data === 'string' ? JSON.parse(event.event_data)?.page : event.event_data?.page;
        if (page) pageCounts[page] = (pageCounts[page] || 0) + 1;
      });
      return Object.entries(pageCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, limit)
        .map(([page, count]) => ({ page, count }));
    } catch (error) {
      console.error('Error fetching popular pages:', error);
      return [];
    }
  }, [getAnalyticsData]);

  const getEngagementMetrics = useCallback(async (startDate: string, endDate: string) => {
    try {
      const params = new URLSearchParams({ startDate, endDate });
      const events = await apiClient.get<any[]>(`/api/analytics/events?${params}`);
      if (!events) return null;

      const uniqueUsers = new Set(events.map((e: any) => e.user_id).filter(Boolean)).size;
      const totalEvents = events.length;
      const eventsPerUser = uniqueUsers > 0 ? totalEvents / uniqueUsers : 0;

      const dailyUsers: { [key: string]: Set<string> } = {};
      events.forEach((event: any) => {
        if (event.user_id) {
          const date = event.created_at.split('T')[0];
          if (!dailyUsers[date]) dailyUsers[date] = new Set();
          dailyUsers[date].add(event.user_id);
        }
      });

      return {
        unique_users: uniqueUsers,
        total_events: totalEvents,
        events_per_user: Math.round(eventsPerUser * 100) / 100,
        daily_active_users: Object.entries(dailyUsers).map(([date, users]) => ({ date, count: users.size })),
      };
    } catch (error) {
      console.error('Error fetching engagement metrics:', error);
      return null;
    }
  }, []);

  return {
    trackEvent,
    trackPageView,
    trackUserAction,
    trackTournamentEvent,
    trackTeamEvent,
    trackVenueEvent,
    trackPaymentEvent,
    trackSearch,
    trackError,
    trackPerformance,
    trackConversion,
    getAnalyticsData,
    getUserAnalytics,
    getPopularPages,
    getEngagementMetrics,
  };
};
