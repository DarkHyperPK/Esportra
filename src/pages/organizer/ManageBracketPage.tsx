import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import BracketVisualization from '@/pages/tournaments/brackets/BracketVisualization';
import Footer from '@/components/Footer';
import { useBracketRealtime } from '@/hooks/useBracketRealtime';

const ManageBracketPage = () => {
    const { slug, stageId } = useParams<{ slug: string; stageId: string }>();
    const navigate = useNavigate();
    const { toast } = useToast();
    const { user, loading: authLoading } = useAuth();

    const [tournament, setTournament] = useState<any>(null);
    const [stage, setStage] = useState<any>(null);
    const [versionId, setVersionId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [isOrganizer, setIsOrganizer] = useState(false);

    const fetchData = useCallback(async () => {
        if (!slug || !stageId) return;

        try {
            setLoading(true);
            console.log('ManageBracketPage: Fetching data for slug:', slug, 'stageId:', stageId);

            // Fetch tournament
            let query = supabase.from('tournaments').select('*');

            // Check if slug is a valid UUID
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);

            if (isUuid) {
                query = query.or(`slug.eq.${slug},id.eq.${slug}`);
            } else {
                query = query.eq('slug', slug);
            }

            const { data: tournamentData, error: tournamentError } = await query.single();

            if (tournamentError) {
                console.error('ManageBracketPage: Error fetching tournament:', tournamentError);
            }

            if (!tournamentData) {
                console.error('ManageBracketPage: Tournament not found for slug:', slug);
                toast({ title: 'Error', description: 'Tournament not found', variant: 'destructive' });
                navigate('/');
                return;
            }

            console.log('ManageBracketPage: Tournament found:', tournamentData);
            setTournament(tournamentData);
            setIsOrganizer(user?.id === tournamentData.organizer_id);

            // Fetch stage
            const { data: stageData } = await supabase
                .from('tournament_stages')
                .select('*')
                .eq('id', stageId)
                .single();

            setStage(stageData);

            // Fetch bracket version for this stage
            const { data: versionData } = await (supabase as any)
                .from('brkt_versions')
                .select('id')
                .eq('stage_id', stageId)
                .in('status', ['active', 'draft'])
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (versionData) {
                setVersionId(versionData.id);
            } else {
                toast({ title: 'No Bracket', description: 'No bracket found for this stage', variant: 'destructive' });
            }

        } catch (error: any) {
            console.error('Error fetching data:', error);
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    }, [slug, stageId, user?.id, navigate, toast]);

    useEffect(() => {
        if (!authLoading) {
            fetchData();
        }
    }, [authLoading, fetchData]);

    // Enable realtime updates
    useBracketRealtime({
        tournamentId: tournament?.id,
        versionId: versionId || undefined,
        slug: slug,
        enabled: !!tournament?.id && !!versionId
    });

    if (loading || authLoading) {
        return (
            <div className="min-h-screen bg-esports-dark flex items-center justify-center">
                <div className="text-white">Loading...</div>
            </div>
        );
    }

    if (!tournament || !versionId) {
        return (
            <div className="min-h-screen bg-esports-dark flex flex-col items-center justify-center text-white">
                <p className="text-gray-400 mb-4">Bracket not found</p>
                <Button onClick={() => navigate(-1)} variant="outline">
                    Go Back
                </Button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-esports-dark text-white">
            <main className="w-full px-4 py-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/organizer/tournament/${slug}`)}
                            className="text-gray-400 hover:text-white"
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back to Dashboard
                        </Button>
                        <div>
                            <h1 className="text-2xl font-bold">{tournament.name}</h1>
                            <p className="text-gray-400 text-sm">
                                {stage?.name || 'Bracket'} Management
                            </p>
                        </div>
                    </div>
                </div>

                {/* Bracket Visualization with Management Controls */}
                <div className="w-full">
                    <BracketVisualization
                        versionId={versionId}
                        tournamentId={tournament.id}
                        isOrganizer={isOrganizer}
                        onRefresh={fetchData}
                    />
                </div>
            </main>
            <Footer />
        </div>
    );
};

export default ManageBracketPage;
