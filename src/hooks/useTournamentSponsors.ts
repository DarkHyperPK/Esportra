import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { useToast } from './use-toast';
import type { Sponsor } from './useSponsors';

export interface TournamentSponsor {
    id: string;
    sponsor_id: string;
    sponsor_type: 'title_sponsor' | 'event_sponsor' | 'media_sponsor';
    placement_zones: string[];
    media_overrides: Record<string, string>;
    priority: number;
    sponsor: {
        id: string;
        name: string;
        tagline: string | null;
        logo_url: string | null;
        banner_image_url: string | null;
        accent_color: string;
        tier: string;
        cta_text: string;
        website_url: string;
        gallery_images: string[];
    };
}

export function useTournamentSponsors(tournamentId: string) {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    const query = useQuery({
        queryKey: ['tournament-sponsors', tournamentId],
        queryFn: () => apiClient.get<TournamentSponsor[]>(`/api/tournaments/${tournamentId}/sponsors`),
        enabled: !!tournamentId,
        staleTime: 30_000,
    });

    const assign = useMutation({
        mutationFn: (data: {
            sponsor_id: string;
            sponsor_type?: string;
            placement_zones?: string[];
            media_overrides?: Record<string, string>;
            priority?: number;
        }) => apiClient.post(`/api/tournaments/${tournamentId}/sponsors`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tournament-sponsors', tournamentId] });
            toast({ title: 'Sponsor assigned to tournament.' });
        },
        onError: (err: Error) => {
            toast({ title: 'Failed to assign sponsor', description: err.message, variant: 'destructive' });
        },
    });

    const update = useMutation({
        mutationFn: ({ sponsorId, ...data }: {
            sponsorId: string;
            sponsor_type?: string;
            placement_zones?: string[];
            media_overrides?: Record<string, string>;
            priority?: number;
            is_active?: boolean;
        }) => apiClient.put(`/api/tournaments/${tournamentId}/sponsors/${sponsorId}`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tournament-sponsors', tournamentId] });
            toast({ title: 'Sponsor placement updated.' });
        },
        onError: (err: Error) => {
            toast({ title: 'Update failed', description: err.message, variant: 'destructive' });
        },
    });

    const remove = useMutation({
        mutationFn: (sponsorId: string) =>
            apiClient.delete(`/api/tournaments/${tournamentId}/sponsors/${sponsorId}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tournament-sponsors', tournamentId] });
            toast({ title: 'Sponsor removed from tournament.' });
        },
        onError: (err: Error) => {
            toast({ title: 'Remove failed', description: err.message, variant: 'destructive' });
        },
    });

    return { ...query, assign, update, remove };
}
