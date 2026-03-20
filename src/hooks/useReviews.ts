import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  const queryClient = useQueryClient();

  // Track which entity's reviews are currently being viewed
  const [reviewTarget, setReviewTarget] = useState<{
    entityType: 'user' | 'venue' | 'tournament';
    entityId: string;
  } | null>(null);

  const { data: reviews = [], isLoading: reviewsLoading } = useQuery({
    queryKey: ['reviews', reviewTarget?.entityType, reviewTarget?.entityId],
    queryFn: () =>
      apiClient
        .get<Review[]>(`/api/reviews/${reviewTarget!.entityType}/${reviewTarget!.entityId}`)
        .then(d => d ?? []),
    enabled: !!reviewTarget,
    staleTime: 2 * 60 * 1000,
  });

  const { data: userReviews = [], isLoading: userReviewsLoading, refetch: refetchUserReviews } = useQuery({
    queryKey: ['my-reviews'],
    queryFn: () => apiClient.get<Review[]>('/api/reviews/mine').then(d => d ?? []),
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
  });

  const loading = reviewsLoading || userReviewsLoading;

  const fetchReviews = useCallback(async (entityType: 'user' | 'venue' | 'tournament', entityId: string): Promise<void> => {
    setReviewTarget({ entityType, entityId });
    await queryClient.invalidateQueries({ queryKey: ['reviews', entityType, entityId] });
  }, [queryClient]);

  const fetchUserReviews = useCallback(async (): Promise<void> => {
    await refetchUserReviews();
  }, [refetchUserReviews]);

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

  const createMutation = useMutation({
    mutationFn: (reviewData: {
      reviewee_id?: string;
      venue_id?: string;
      tournament_id?: string;
      rating: number;
      title?: string;
      comment?: string;
      review_type: 'user' | 'venue' | 'tournament';
    }) =>
      apiClient.post<Review>('/api/reviews', {
        reviewType:   reviewData.review_type,
        rating:       reviewData.rating,
        title:        reviewData.title,
        comment:      reviewData.comment,
        venueId:      reviewData.venue_id,
        revieweeId:   reviewData.reviewee_id,
        tournamentId: reviewData.tournament_id,
      }),
    onSuccess: (_, reviewData) => {
      toast({
        title: 'Review Submitted',
        description: 'Your review has been submitted successfully.',
        variant: 'default',
      });
      if (reviewData.reviewee_id) {
        queryClient.invalidateQueries({ queryKey: ['reviews', 'user', reviewData.reviewee_id] });
      } else if (reviewData.venue_id) {
        queryClient.invalidateQueries({ queryKey: ['reviews', 'venue', reviewData.venue_id] });
      } else if (reviewData.tournament_id) {
        queryClient.invalidateQueries({ queryKey: ['reviews', 'tournament', reviewData.tournament_id] });
      }
      queryClient.invalidateQueries({ queryKey: ['my-reviews'] });
    },
    onError: (error: any) => {
      console.error('Error creating review:', error);
      const msg = error.status === 409
        ? 'You have already reviewed this item.'
        : error.message || 'Failed to submit review.';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ reviewId, updates }: { reviewId: string; updates: { rating?: number; title?: string; comment?: string } }) =>
      apiClient.put<Review>(`/api/reviews/${reviewId}`, updates),
    onSuccess: () => {
      toast({
        title: 'Review Updated',
        description: 'Your review has been updated successfully.',
        variant: 'default',
      });
      queryClient.invalidateQueries({ queryKey: ['my-reviews'] });
    },
    onError: (error: any) => {
      console.error('Error updating review:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update review.',
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (reviewId: string) => apiClient.delete(`/api/reviews/${reviewId}`),
    onSuccess: () => {
      toast({
        title: 'Review Deleted',
        description: 'Your review has been deleted successfully.',
        variant: 'default',
      });
      queryClient.invalidateQueries({ queryKey: ['my-reviews'] });
    },
    onError: (error: any) => {
      console.error('Error deleting review:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete review.',
        variant: 'destructive',
      });
    },
  });

  const submitting = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  const createReview = useCallback(async (reviewData: {
    reviewee_id?: string;
    venue_id?: string;
    tournament_id?: string;
    rating: number;
    title?: string;
    comment?: string;
    review_type: 'user' | 'venue' | 'tournament';
  }): Promise<Review | null> => {
    if (!user) return null;
    return createMutation.mutateAsync(reviewData).catch(() => null);
  }, [user, createMutation]);

  const updateReview = useCallback(async (reviewId: string, updates: {
    rating?: number;
    title?: string;
    comment?: string;
  }): Promise<Review | null> => {
    if (!user) return null;
    return updateMutation.mutateAsync({ reviewId, updates }).catch(() => null);
  }, [user, updateMutation]);

  const deleteReview = useCallback(async (reviewId: string): Promise<boolean> => {
    if (!user) return false;
    return deleteMutation.mutateAsync(reviewId).then(() => true).catch(() => false);
  }, [user, deleteMutation]);

  // canReview — check eligibility via API
  const canReview = useCallback(async (entityType: 'user' | 'venue' | 'tournament', entityId: string): Promise<boolean> => {
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
  }, [user]);

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
