import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/apiClient';
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

  const fetchReviews = useCallback(async (entityType: 'user' | 'venue' | 'tournament', entityId: string) => {
    try {
      const data = await apiClient.get<Review[]>(`/api/reviews/${entityType}/${entityId}`);
      setReviews(data ?? []);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    }
  }, []);

  const fetchUserReviews = useCallback(async () => {
    if (!user) return;
    try {
      const data = await apiClient.get<Review[]>('/api/reviews/mine');
      setUserReviews(data ?? []);
    } catch (error) {
      console.error('Error fetching user reviews:', error);
    }
  }, [user]);

  const getReviewStats = useCallback(async (entityType: 'user' | 'venue' | 'tournament', entityId: string): Promise<ReviewStats | null> => {
    try {
      const stats = await apiClient.get<{
        average_rating: number;
        total_reviews: number;
        rating_breakdown: { five: number; four: number; three: number; two: number; one: number };
      }>(`/api/reviews/stats/${entityType}/${entityId}`);

      return {
        average_rating: stats.average_rating,
        total_reviews: stats.total_reviews,
        rating_breakdown: {
          5: stats.rating_breakdown.five,
          4: stats.rating_breakdown.four,
          3: stats.rating_breakdown.three,
          2: stats.rating_breakdown.two,
          1: stats.rating_breakdown.one,
        },
      };
    } catch (error) {
      console.error('Error fetching review stats:', error);
      return null;
    }
  }, []);

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

      const data = await apiClient.post<Review>('/api/reviews', {
        reviewType:   reviewData.review_type,
        rating:       reviewData.rating,
        title:        reviewData.title,
        comment:      reviewData.comment,
        venueId:      reviewData.venue_id,
        revieweeId:   reviewData.reviewee_id,
        tournamentId: reviewData.tournament_id,
      });

      toast({
        title: 'Review Submitted',
        description: 'Your review has been submitted successfully.',
        variant: 'default',
      });

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
      const msg = error.status === 409
        ? 'You have already reviewed this item.'
        : error.message || 'Failed to submit review.';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
      return null;
    } finally {
      setSubmitting(false);
    }
  };

  const updateReview = async (reviewId: string, updates: {
    rating?: number;
    title?: string;
    comment?: string;
  }) => {
    if (!user) return null;

    try {
      setSubmitting(true);
      const data = await apiClient.put<Review>(`/api/reviews/${reviewId}`, updates);

      toast({
        title: 'Review Updated',
        description: 'Your review has been updated successfully.',
        variant: 'default',
      });

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

  const deleteReview = async (reviewId: string) => {
    if (!user) return false;

    try {
      setSubmitting(true);
      await apiClient.delete(`/api/reviews/${reviewId}`);

      toast({
        title: 'Review Deleted',
        description: 'Your review has been deleted successfully.',
        variant: 'default',
      });

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

  // canReview — check eligibility via API
  const canReview = async (entityType: 'user' | 'venue' | 'tournament', entityId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const result = await apiClient.get<{ canReview: boolean }>(
        `/api/reviews/can-review?entityType=${entityType}&entityId=${entityId}`
      );
      return result.canReview;
    } catch (error) {
      console.error('Error checking review eligibility:', error);
      return false;
    }
  };

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
    
    fetchReviews,
    fetchUserReviews,
    getReviewStats,
    createReview,
    updateReview,
    deleteReview,
    canReview,
  };
};
