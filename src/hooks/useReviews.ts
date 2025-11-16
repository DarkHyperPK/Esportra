import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

export interface Review {
  id: string;
  reviewer_id: string;
  reviewee_id?: string;
  venue_id?: string;
  tournament_id?: string;
  rating: number;
  title?: string;
  comment?: string;
  review_type: 'user' | 'venue' | 'tournament';
  is_verified: boolean;
  created_at: string;
  updated_at: string;
  reviewer?: {
    id: string;
    username: string;
    full_name?: string;
    avatar_url?: string;
  };
  reviewee?: {
    id: string;
    username: string;
    full_name?: string;
    avatar_url?: string;
  };
  venue?: {
    id: string;
    name: string;
    city: string;
  };
  tournament?: {
    id: string;
    name: string;
    game: string;
  };
}

export interface ReviewStats {
  average_rating: number;
  total_reviews: number;
  rating_breakdown: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
}

export const useReviews = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [reviews, setReviews] = useState<Review[]>([]);
  const [userReviews, setUserReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Fetch reviews for a specific entity
  const fetchReviews = useCallback(async (entityType: 'user' | 'venue' | 'tournament', entityId: string) => {
    try {
      const query = supabase
        .from('reviews')
        .select(`
          *,
          reviewer:profiles!reviews_reviewer_id_fkey(id, username, full_name, avatar_url),
          reviewee:profiles!reviews_reviewee_id_fkey(id, username, full_name, avatar_url),
          venue:venues(id, name, city),
          tournament:tournaments(id, name, game)
        `)
        .eq('review_type', entityType)
        .order('created_at', { ascending: false });

      let finalQuery;
      switch (entityType) {
        case 'user':
          finalQuery = query.eq('reviewee_id', entityId);
          break;
        case 'venue':
          finalQuery = query.eq('venue_id', entityId);
          break;
        case 'tournament':
          finalQuery = query.eq('tournament_id', entityId);
          break;
      }

      const { data, error } = await finalQuery;

      if (error) throw error;
      setReviews(data || []);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    }
  }, []);

  // Fetch user's own reviews
  const fetchUserReviews = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          *,
          reviewee:profiles!reviews_reviewee_id_fkey(id, username, full_name, avatar_url),
          venue:venues(id, name, city),
          tournament:tournaments(id, name, game)
        `)
        .eq('reviewer_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUserReviews(data || []);
    } catch (error) {
      console.error('Error fetching user reviews:', error);
    }
  }, [user]);

  // Get review statistics
  const getReviewStats = useCallback(async (entityType: 'user' | 'venue' | 'tournament', entityId: string): Promise<ReviewStats | null> => {
    try {
      const query = supabase
        .from('reviews')
        .select('rating')
        .eq('review_type', entityType);

      let finalQuery;
      switch (entityType) {
        case 'user':
          finalQuery = query.eq('reviewee_id', entityId);
          break;
        case 'venue':
          finalQuery = query.eq('venue_id', entityId);
          break;
        case 'tournament':
          finalQuery = query.eq('tournament_id', entityId);
          break;
      }

      const { data, error } = await finalQuery;

      if (error) throw error;

      if (!data || data.length === 0) {
        return {
          average_rating: 0,
          total_reviews: 0,
          rating_breakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
        };
      }

      const totalReviews = data.length;
      const averageRating = data.reduce((sum, review) => sum + review.rating, 0) / totalReviews;
      
      const ratingBreakdown = data.reduce((acc, review) => {
        acc[review.rating as keyof typeof acc]++;
        return acc;
      }, { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 });

      return {
        average_rating: Math.round(averageRating * 10) / 10,
        total_reviews: totalReviews,
        rating_breakdown: ratingBreakdown,
      };
    } catch (error) {
      console.error('Error fetching review stats:', error);
      return null;
    }
  }, []);

  // Create a review
  const createReview = async (reviewData: {
    reviewee_id?: string;
    venue_id?: string;
    tournament_id?: string;
    rating: number;
    title?: string;
    comment?: string;
    review_type: 'user' | 'venue' | 'tournament';
  }) => {
    if (!user) return null;

    try {
      setSubmitting(true);

      // Check if user has already reviewed this entity
      const existingReview = await supabase
        .from('reviews')
        .select('id')
        .eq('reviewer_id', user.id)
        .eq('review_type', reviewData.review_type);

      let existingQuery;
      switch (reviewData.review_type) {
        case 'user':
          existingQuery = existingReview.eq('reviewee_id', reviewData.reviewee_id);
          break;
        case 'venue':
          existingQuery = existingReview.eq('venue_id', reviewData.venue_id);
          break;
        case 'tournament':
          existingQuery = existingReview.eq('tournament_id', reviewData.tournament_id);
          break;
      }

      const { data: existing } = await existingQuery;

      if (existing && existing.length > 0) {
        toast({
          title: 'Already Reviewed',
          description: 'You have already reviewed this item.',
          variant: 'destructive',
        });
        return null;
      }

      const { data, error } = await supabase
        .from('reviews')
        .insert({
          reviewer_id: user.id,
          ...reviewData,
          is_verified: false, // Will be verified by admin or system
        })
        .select(`
          *,
          reviewer:profiles!reviews_reviewer_id_fkey(id, username, full_name, avatar_url),
          reviewee:profiles!reviews_reviewee_id_fkey(id, username, full_name, avatar_url),
          venue:venues(id, name, city),
          tournament:tournaments(id, name, game)
        `)
        .single();

      if (error) throw error;

      toast({
        title: 'Review Submitted',
        description: 'Your review has been submitted successfully.',
        variant: 'default',
      });

      // Refresh reviews
      if (reviewData.reviewee_id) {
        await fetchReviews('user', reviewData.reviewee_id);
      } else if (reviewData.venue_id) {
        await fetchReviews('venue', reviewData.venue_id);
      } else if (reviewData.tournament_id) {
        await fetchReviews('tournament', reviewData.tournament_id);
      }

      await fetchUserReviews();

      return data;
    } catch (error: any) {
      console.error('Error creating review:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit review.',
        variant: 'destructive',
      });
      return null;
    } finally {
      setSubmitting(false);
    }
  };

  // Update a review
  const updateReview = async (reviewId: string, updates: {
    rating?: number;
    title?: string;
    comment?: string;
  }) => {
    if (!user) return null;

    try {
      setSubmitting(true);

      const { data, error } = await supabase
        .from('reviews')
        .update(updates)
        .eq('id', reviewId)
        .eq('reviewer_id', user.id)
        .select(`
          *,
          reviewer:profiles!reviews_reviewer_id_fkey(id, username, full_name, avatar_url),
          reviewee:profiles!reviews_reviewee_id_fkey(id, username, full_name, avatar_url),
          venue:venues(id, name, city),
          tournament:tournaments(id, name, game)
        `)
        .single();

      if (error) throw error;

      toast({
        title: 'Review Updated',
        description: 'Your review has been updated successfully.',
        variant: 'default',
      });

      // Refresh reviews
      await fetchUserReviews();

      return data;
    } catch (error: any) {
      console.error('Error updating review:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update review.',
        variant: 'destructive',
      });
      return null;
    } finally {
      setSubmitting(false);
    }
  };

  // Delete a review
  const deleteReview = async (reviewId: string) => {
    if (!user) return false;

    try {
      setSubmitting(true);

      const { error } = await supabase
        .from('reviews')
        .delete()
        .eq('id', reviewId)
        .eq('reviewer_id', user.id);

      if (error) throw error;

      toast({
        title: 'Review Deleted',
        description: 'Your review has been deleted successfully.',
        variant: 'default',
      });

      // Refresh reviews
      await fetchUserReviews();

      return true;
    } catch (error: any) {
      console.error('Error deleting review:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete review.',
        variant: 'destructive',
      });
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  // Check if user can review an entity
  const canReview = async (entityType: 'user' | 'venue' | 'tournament', entityId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      // Check if user has already reviewed
      const existingReview = await supabase
        .from('reviews')
        .select('id')
        .eq('reviewer_id', user.id)
        .eq('review_type', entityType);

      let existingQuery;
      switch (entityType) {
        case 'user':
          existingQuery = existingReview.eq('reviewee_id', entityId);
          break;
        case 'venue':
          existingQuery = existingReview.eq('venue_id', entityId);
          break;
        case 'tournament':
          existingQuery = existingReview.eq('tournament_id', entityId);
          break;
      }

      const { data: existing } = await existingQuery;

      if (existing && existing.length > 0) {
        return false; // Already reviewed
      }

      // Check if user has interacted with the entity (e.g., booked venue, participated in tournament)
      switch (entityType) {
        case 'venue':
          const { data: venueBooking } = await supabase
            .from('venue_bookings')
            .select('id')
            .eq('venue_id', entityId)
            .eq('user_id', user.id)
            .eq('status', 'completed')
            .limit(1);
          return venueBooking && venueBooking.length > 0;

        case 'tournament':
          const { data: tournamentParticipation } = await supabase
            .from('tournament_participants')
            .select('id')
            .eq('tournament_id', entityId)
            .eq('user_id', user.id)
            .eq('status', 'approved')
            .limit(1);
          return tournamentParticipation && tournamentParticipation.length > 0;

        case 'user':
          // For user reviews, check if they've been in the same team or tournament
          const { data: teamInteraction } = await supabase
            .from('team_members')
            .select('team_id')
            .eq('user_id', user.id)
            .eq('is_active', true)
            .limit(1);
          
          if (teamInteraction && teamInteraction.length > 0) {
            const { data: sharedTeam } = await supabase
              .from('team_members')
              .select('id')
              .eq('team_id', teamInteraction[0].team_id)
              .eq('user_id', entityId)
              .eq('is_active', true)
              .limit(1);
            return sharedTeam && sharedTeam.length > 0;
          }
          return false;

        default:
          return false;
      }
    } catch (error) {
      console.error('Error checking review eligibility:', error);
      return false;
    }
  };

  // Initialize data
  useEffect(() => {
    if (user) {
      fetchUserReviews().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [user, fetchUserReviews]);

  return {
    reviews,
    userReviews,
    loading,
    submitting,
    
    // Actions
    fetchReviews,
    fetchUserReviews,
    getReviewStats,
    createReview,
    updateReview,
    deleteReview,
    canReview,
  };
};
