import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LoadingSpinner } from '@/components/effects/LoadingSpinner';
import { apiClient } from '@/lib/apiClient';
import { PublicBracketView } from './PublicBracketView';
import { DraggableContainer } from '@/components/DraggableContainer';
import { useBracketRealtime } from '@/hooks/useBracketRealtime';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

const FullscreenBracketPage = () => {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();
    const [tournament, setTournament] = useState<any | null>(null);
    const [activeVersionId, setActiveVersionId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchTournamentData = useCallback(async () => {
        try {
            setLoading(true);

            // Fetch tournament — returns wrapped { tournament, participants, stages, ... }
            const response = await apiClient.get<any>(`/api/tournaments/${slug}`);
            if (!response?.tournament) throw new Error('Tournament not found');

            const tournamentData = response.tournament;
            setTournament(tournamentData);

            // Fetch bracket version (active or draft)
            const versionsData = await apiClient.get(`/api/tournaments/${tournamentData.id}/bracket-versions?status=active,draft`);
            if (versionsData && versionsData.length > 0) {
                setActiveVersionId(versionsData[0].id);
            } else {
                setActiveVersionId(null);
            }

        } catch (error: any) {
            console.error('Error fetching tournament:', error);
        } finally {
            setLoading(false);
        }
    }, [slug]);

    useEffect(() => {
        if (slug) {
            fetchTournamentData();
        }
    }, [slug, fetchTournamentData]);

    // Realtime updates
    useBracketRealtime({
        tournamentId: tournament?.id,
        versionId: activeVersionId || undefined,
        slug: slug,
        enabled: !!tournament?.id && !!activeVersionId
    });

    if (loading) {
        return (
            <div className="min-h-screen bg-transparent flex items-center justify-center text-white">
                <div className="p-8 rounded-2xl bg-black/80 backdrop-blur-xl border border-white/10 shadow-2xl">
                    <LoadingSpinner size={80} text="Loading Bracket..." />
                </div>
            </div>
        );
    }

    if (!tournament || !activeVersionId) {
        return (
            <div className="min-h-screen bg-transparent flex items-center justify-center text-white">
                <div className="p-8 rounded-2xl bg-black/80 backdrop-blur-xl border border-white/10 text-center">
                    <div className="text-6xl mb-4">🏆</div>
                    <h3 className="text-xl font-semibold text-zinc-300 mb-2">Bracket Not Found</h3>
                    <p className="text-zinc-500">The tournament bracket is not available yet.</p>
                </div>
            </div>
        );
    }



    const handleBack = () => {
        // Navigate back to the tournament management page (Stages tab usually)
        if (tournament?.slug) {
            navigate(`/organizer/tournament/${tournament.slug}`);
        } else if (tournament?.id) {
            navigate(`/organizer/tournament/${tournament.id}`);
        } else {
            navigate(-1);
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] bg-[#050505] overflow-hidden font-sans">
            {/* Back Navigation */}
            <div className="absolute top-6 left-6 z-50">
                <Button
                    onClick={handleBack}
                    variant="outline"
                    className="bg-black/60 border-white/10 text-white hover:bg-black/80 hover:border-white/30 backdrop-blur-md gap-2"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Stages
                </Button>
            </div>

            <DraggableContainer className="w-full h-full bg-black/30 backdrop-blur-sm border border-white/5">
                <div className="min-w-[2000px] min-h-[1500px] p-20">
                    <PublicBracketView
                        versionId={activeVersionId}
                        tournamentId={tournament.id}
                    />
                </div>
            </DraggableContainer>
        </div>
    );
};

export default FullscreenBracketPage;
