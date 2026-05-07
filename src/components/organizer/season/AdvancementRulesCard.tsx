import { useSeasonAdvancementRules, useDeleteAdvancementRule } from '@/hooks/useSeasonStandings';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2, Plus, ArrowRight } from 'lucide-react';

interface AdvancementRulesCardProps {
  seasonId: string;
}

const AdvancementRulesCard: React.FC<AdvancementRulesCardProps> = ({ seasonId }) => {
  const { data: advancementRules, isLoading } = useSeasonAdvancementRules(seasonId);
  const deleteAdvancementRule = useDeleteAdvancementRule();

  if (isLoading) {
    return (
      <Card className="bg-[#0d0d10] border border-white/10">
        <CardContent className="p-8">
          <p className="text-gray-400 text-center">Loading advancement rules...</p>
        </CardContent>
      </Card>
    );
  }

  if (!advancementRules || advancementRules.length === 0) {
    return (
      <Card className="bg-[#0d0d10] border border-white/10">
        <CardContent className="p-8">
          <div className="text-center">
            <p className="text-gray-400 mb-4">No advancement rules configured</p>
            <Button variant="outline" className="border-gray-700 hover:bg-white/10">
              <Plus className="w-4 h-4 mr-2" />
              Add First Advancement Rule
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleDelete = (ruleId: string) => {
    deleteAdvancementRule.mutate({ id: seasonId, ruleId });
  };

  return (
    <Card className="bg-[#0d0d10] border border-white/10">
      <CardContent className="p-6">
        <div className="space-y-4">
          {advancementRules.map((rule) => (
            <div
              key={rule.id}
              className="bg-black/30 border border-white/10 rounded-lg p-4 flex justify-between items-start"
            >
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-2">
                  <div className="bg-purple-500/10 px-3 py-1 rounded-lg">
                    <span className="text-purple-400 font-semibold">Top {rule.advancement_count}</span>
                  </div>
                  <div className="text-gray-300">
                    <span className="font-medium">Rank {rule.placement_start}</span>
                    {rule.placement_start !== rule.placement_end && (
                      <span> - {rule.placement_end}</span>
                    )}
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-500" />
                  <div className="text-gray-400 text-sm">
                    {rule.target_tournament_id ? 'Target Tournament' : 'No target'}
                  </div>
                </div>
                {rule.seed_mode && (
                  <div className="text-sm text-gray-400">
                    Seed mode: {rule.seed_mode}
                  </div>
                )}
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleDelete(rule.id)}
                disabled={deleteAdvancementRule.isPending}
                className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default AdvancementRulesCard;
