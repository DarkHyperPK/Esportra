import { useParams, Link } from 'react-router-dom';
import { useSeason } from '@/hooks/useSeasons';
import { useSeasonStandings, useSeasonPointRules, useSeasonAdvancementRules, useRecalculateStandings } from '@/hooks/useSeasonStandings';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Calendar, Trophy, RefreshCw, Plus, Settings } from 'lucide-react';
import { StandingsCard } from '@/components/organizer/season/StandingsCard';
import { PointRulesCard } from '@/components/organizer/season/PointRulesCard';
import { AdvancementRulesCard } from '@/components/organizer/season/AdvancementRulesCard';

const SeasonManage = () => {
  const { id } = useParams<{ id: string }>();
  const { data: season, isLoading } = useSeason(id || '');
  const { data: standings, isLoading: standingsLoading } = useSeasonStandings(id || '');
  const { data: pointRules, isLoading: pointRulesLoading } = useSeasonPointRules(id || '');
  const { data: advancementRules, isLoading: advancementRulesLoading } = useSeasonAdvancementRules(id || '');
  const recalculateStandings = useRecalculateStandings();

  if (isLoading || !season) {
    return (
      <div className="min-h-screen bg-transparent text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <p>Loading season...</p>
          </div>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-500';
      case 'published':
        return 'bg-blue-500';
      case 'live':
        return 'bg-green-500';
      case 'completed':
        return 'bg-purple-500';
      case 'archived':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="min-h-screen bg-transparent text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link to="/organizer/seasons">
            <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Seasons
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-2">{season.name}</h1>
            <div className="flex items-center gap-4">
              <Badge className={getStatusColor(season.status)}>{season.status}</Badge>
              <span className="text-gray-400">{season.game}</span>
            </div>
          </div>
          <Link to={`/organizer/seasons/${id}/settings`}>
            <Button variant="outline" className="border-gray-700 hover:bg-white/10">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button>
          </Link>
        </div>

        {/* Season Info */}
        <Card className="bg-[#0d0d10] border border-white/10 mb-6">
          <CardHeader>
            <CardTitle className="text-xl">Season Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-500/10 rounded-lg">
                  <Trophy className="w-6 h-6 text-emerald-500" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Tournaments</p>
                  <p className="text-2xl font-bold">{season.tournament_count}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-500/10 rounded-lg">
                  <Calendar className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Date Range</p>
                  <p className="text-sm font-medium">
                    {season.start_date ? new Date(season.start_date).toLocaleDateString() : 'Not set'}
                    {' - '}
                    {season.end_date ? new Date(season.end_date).toLocaleDateString() : 'Not set'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-500/10 rounded-lg">
                  <Trophy className="w-6 h-6 text-purple-500" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Point Rules</p>
                  <p className="text-2xl font-bold">{season.point_rules_count}</p>
                </div>
              </div>
            </div>
            {season.description && (
              <div className="mt-6 pt-6 border-t border-white/10">
                <p className="text-gray-300">{season.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="standings" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="standings">Standings</TabsTrigger>
            <TabsTrigger value="point-rules">Point Rules</TabsTrigger>
            <TabsTrigger value="advancement-rules">Advancement Rules</TabsTrigger>
            <TabsTrigger value="tournaments">Tournaments</TabsTrigger>
          </TabsList>

          <TabsContent value="standings">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Season Standings</h2>
              <Button
                onClick={() => recalculateStandings.mutate(id || '')}
                disabled={recalculateStandings.isPending}
                variant="outline"
                className="border-gray-700 hover:bg-white/10"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${recalculateStandings.isPending ? 'animate-spin' : ''}`} />
                Recalculate
              </Button>
            </div>
            <StandingsCard seasonId={id || ''} />
          </TabsContent>

          <TabsContent value="point-rules">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Point Rules</h2>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Point Rule
              </Button>
            </div>
            <PointRulesCard seasonId={id || ''} />
          </TabsContent>

          <TabsContent value="advancement-rules">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Advancement Rules</h2>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Advancement Rule
              </Button>
            </div>
            <AdvancementRulesCard seasonId={id || ''} />
          </TabsContent>

          <TabsContent value="tournaments">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Season Tournaments</h2>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Link Tournament
              </Button>
            </div>
            <Card className="bg-[#0d0d10] border border-white/10">
              <CardContent className="p-8">
                <p className="text-gray-400 text-center">Tournament management coming soon</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default SeasonManage;
