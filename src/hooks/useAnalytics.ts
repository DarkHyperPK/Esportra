import { useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

export interface AnalyticsEvent {
  event_type: string;
  event_data: any;
  session_id?: string;
  ip_address?: string;
  user_agent?: string;
}

export const useAnalytics = () => {
  const { user } = useAuth();

  // Track an analytics event
  const trackEvent = useCallback(async (eventType: string, eventData: any = {}) => {
    try {
      const event: AnalyticsEvent = {
        event_type: eventType,
        event_data: eventData,
        session_id: sessionStorage.getItem('session_id') || undefined,
        user_agent: navigator.userAgent,
      };

      await supabase
        .from('analytics_events')
        .insert({
          user_id: user?.id || null,
          ...event,
        });

      console.log('Analytics event tracked:', eventType, eventData);
    } catch (error) {
      console.error('Error tracking analytics event:', error);
    }
  }, [user]);

  // Track page views
  const trackPageView = useCallback((page: string, additionalData: any = {}) => {
    trackEvent('page_view', {
      page,
      timestamp: new Date().toISOString(),
      ...additionalData,
    });
  }, [trackEvent]);

  // Track user actions
  const trackUserAction = useCallback((action: string, target: string, additionalData: any = {}) => {
    trackEvent('user_action', {
      action,
      target,
      timestamp: new Date().toISOString(),
      ...additionalData,
    });
  }, [trackEvent]);

  // Track tournament events
  const trackTournamentEvent = useCallback((event: string, tournamentId: string, additionalData: any = {}) => {
    trackEvent('tournament_event', {
      event,
      tournament_id: tournamentId,
      timestamp: new Date().toISOString(),
      ...additionalData,
    });
  }, [trackEvent]);

  // Track team events
  const trackTeamEvent = useCallback((event: string, teamId: string, additionalData: any = {}) => {
    trackEvent('team_event', {
      event,
      team_id: teamId,
      timestamp: new Date().toISOString(),
      ...additionalData,
    });
  }, [trackEvent]);

  // Track venue events
  const trackVenueEvent = useCallback((event: string, venueId: string, additionalData: any = {}) => {
    trackEvent('venue_event', {
      event,
      venue_id: venueId,
      timestamp: new Date().toISOString(),
      ...additionalData,
    });
  }, [trackEvent]);

  // Track payment events
  const trackPaymentEvent = useCallback((event: string, paymentId: string, amount: number, additionalData: any = {}) => {
    trackEvent('payment_event', {
      event,
      payment_id: paymentId,
      amount,
      timestamp: new Date().toISOString(),
      ...additionalData,
    });
  }, [trackEvent]);

  // Track search events
  const trackSearch = useCallback((query: string, filters: any = {}, results: number) => {
    trackEvent('search', {
      query,
      filters,
      results_count: results,
      timestamp: new Date().toISOString(),
    });
  }, [trackEvent]);

  // Track error events
  const trackError = useCallback((error: string, context: string, additionalData: any = {}) => {
    trackEvent('error', {
      error_message: error,
      context,
      timestamp: new Date().toISOString(),
      ...additionalData,
    });
  }, [trackEvent]);

  // Track performance events
  const trackPerformance = useCallback((metric: string, value: number, additionalData: any = {}) => {
    trackEvent('performance', {
      metric,
      value,
      timestamp: new Date().toISOString(),
      ...additionalData,
    });
  }, [trackEvent]);

  // Track conversion events
  const trackConversion = useCallback((conversionType: string, value: number, additionalData: any = {}) => {
    trackEvent('conversion', {
      conversion_type: conversionType,
      value,
      timestamp: new Date().toISOString(),
      ...additionalData,
    });
  }, [trackEvent]);

  // Get analytics data (for admin use)
  const getAnalyticsData = useCallback(async (startDate: string, endDate: string, eventType?: string) => {
    try {
      let query = supabase
        .from('analytics_events')
        .select('*')
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .order('created_at', { ascending: false });

      if (eventType) {
        query = query.eq('event_type', eventType);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching analytics data:', error);
      return null;
    }
  }, []);

  // Get user analytics summary
  const getUserAnalytics = useCallback(async (userId: string, startDate: string, endDate: string) => {
    try {
      const { data, error } = await supabase
        .from('analytics_events')
        .select('event_type, event_data, created_at')
        .eq('user_id', userId)
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Process data to get summary
      const summary = {
        total_events: data?.length || 0,
        page_views: data?.filter(e => e.event_type === 'page_view').length || 0,
        user_actions: data?.filter(e => e.event_type === 'user_action').length || 0,
        tournament_events: data?.filter(e => e.event_type === 'tournament_event').length || 0,
        team_events: data?.filter(e => e.event_type === 'team_event').length || 0,
        venue_events: data?.filter(e => e.event_type === 'venue_event').length || 0,
        payment_events: data?.filter(e => e.event_type === 'payment_event').length || 0,
        search_events: data?.filter(e => e.event_type === 'search').length || 0,
        error_events: data?.filter(e => e.event_type === 'error').length || 0,
      };

      return { data, summary };
    } catch (error) {
      console.error('Error fetching user analytics:', error);
      return null;
    }
  }, []);

  // Get popular pages
  const getPopularPages = useCallback(async (startDate: string, endDate: string, limit: number = 10) => {
    try {
      const { data, error } = await supabase
        .from('analytics_events')
        .select('event_data')
        .eq('event_type', 'page_view')
        .gte('created_at', startDate)
        .lte('created_at', endDate);

      if (error) throw error;

      // Count page views
      const pageCounts: { [key: string]: number } = {};
      data?.forEach(event => {
        const page = event.event_data?.page;
        if (page) {
          pageCounts[page] = (pageCounts[page] || 0) + 1;
        }
      });

      // Sort by count and return top pages
      return Object.entries(pageCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, limit)
        .map(([page, count]) => ({ page, count }));
    } catch (error) {
      console.error('Error fetching popular pages:', error);
      return [];
    }
  }, []);

  // Get user engagement metrics
  const getEngagementMetrics = useCallback(async (startDate: string, endDate: string) => {
    try {
      const { data, error } = await supabase
        .from('analytics_events')
        .select('user_id, event_type, created_at')
        .gte('created_at', startDate)
        .lte('created_at', endDate);

      if (error) throw error;

      // Calculate metrics
      const uniqueUsers = new Set(data?.map(e => e.user_id).filter(Boolean)).size;
      const totalEvents = data?.length || 0;
      const eventsPerUser = uniqueUsers > 0 ? totalEvents / uniqueUsers : 0;

      // Get daily active users
      const dailyUsers: { [key: string]: Set<string> } = {};
      data?.forEach(event => {
        if (event.user_id) {
          const date = event.created_at.split('T')[0];
          if (!dailyUsers[date]) {
            dailyUsers[date] = new Set();
          }
          dailyUsers[date].add(event.user_id);
        }
      });

      const dailyActiveUsers = Object.entries(dailyUsers).map(([date, users]) => ({
        date,
        count: users.size,
      }));

      return {
        unique_users: uniqueUsers,
        total_events: totalEvents,
        events_per_user: Math.round(eventsPerUser * 100) / 100,
        daily_active_users: dailyActiveUsers,
      };
    } catch (error) {
      console.error('Error fetching engagement metrics:', error);
      return null;
    }
  }, []);

  return {
    // Core tracking functions
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

    // Analytics data functions
    getAnalyticsData,
    getUserAnalytics,
    getPopularPages,
    getEngagementMetrics,
  };
};
