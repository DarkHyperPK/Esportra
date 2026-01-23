import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { LoadingSpinner } from '@/components/effects/LoadingSpinner';
import { supabase } from '@/lib/supabase';
import { PublicBracketView } from './PublicBracketView';
import { DraggableContainer } from '@/components/DraggableContainer';
import { useBracketRealtime } from '@/hooks/useBracketRealtime';

const FullscreenBracketPage = () => {
    const { slug } = useParams<{ slug: string }>();
    const [tournament, setTournament] = useState<any | null>(null);
    const [activeVersionId, setActiveVersionId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchTournamentData = useCallback(async () => {
        try {
            setLoading(true);

            // Fetch tournament
            let tournamentData: any = null;
            const { data: bySlug } = await supabase.from('tournaments').select('*').eq('slug', slug).single();
            if (bySlug) tournamentData = bySlug;
            else {
                const { data: byId } = await supabase.from('tournaments').select('*').eq('id', slug).single();
                if (byId) tournamentData = byId;
            }

            if (!tournamentData) throw new Error('Tournament not found');
            setTournament(tournamentData);

            // Fetch bracket version (active or draft)
            const { data: versionData } = await (supabase as any)
                .from('brkt_versions')
                .select('id')
                .eq('tournament_id', tournamentData.id)
                .in('status', ['active', 'draft'])
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (versionData) {
                setActiveVersionId(versionData.id);
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



    return (
        <div className="w-screen h-screen bg-transparent overflow-hidden relative font-sans">
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
