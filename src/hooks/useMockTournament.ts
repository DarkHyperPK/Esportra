import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';

interface GenerateMockOptions {
    tournamentId: string;
    slug: string;
    userId?: string;
}

export function useMockTournament({ tournamentId, slug, userId }: GenerateMockOptions) {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    const invalidate = () =>
        queryClient.invalidateQueries({ queryKey: ['tournament-dashboard', slug, userId] });

    const generate = useMutation({
        mutationFn: (count?: number) =>
            apiClient.post<{ generated: number }>(
                `/api/tournaments/${tournamentId}/mock/generate`,
                { count: count ?? null },
            ),
        onSuccess: (data) => {
            toast({
                title: 'Mock teams generated',
                description: `${data.generated} mock teams added as checked-in participants. You can now generate a bracket.`,
            });
            invalidate();
        },
        onError: (error: Error) => {
            toast({
                title: 'Failed to generate mock teams',
                description: error.message,
                variant: 'destructive',
            });
        },
    });

    const clear = useMutation({
        mutationFn: () =>
            apiClient.delete(`/api/tournaments/${tournamentId}/mock`),
        onSuccess: () => {
            toast({
                title: 'Mock data cleared',
                description: 'All mock teams and bracket data have been removed.',
            });
            invalidate();
        },
        onError: (error: Error) => {
            toast({
                title: 'Failed to clear mock data',
                description: error.message,
                variant: 'destructive',
            });
        },
    });

    return { generate, clear };
}
