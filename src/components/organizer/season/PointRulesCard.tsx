import { useSeasonPointRules, useDeletePointRule } from '@/hooks/useSeasonStandings';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2, Plus } from 'lucide-react';

interface PointRulesCardProps {
  seasonId: string;
}

const PointRulesCard: React.FC<PointRulesCardProps> = ({ seasonId }) => {
  const { data: pointRules, isLoading } = useSeasonPointRules(seasonId);
  const deletePointRule = useDeletePointRule();

  if (isLoading) {
    return (
      <Card className="bg-[#0d0d10] border border-white/10">
        <CardContent className="p-8">
          <p className="text-gray-400 text-center">Loading point rules...</p>
        </CardContent>
      </Card>
    );
  }

  if (!pointRules || pointRules.length === 0) {
    return (
      <Card className="bg-[#0d0d10] border border-white/10">
        <CardContent className="p-8">
          <div className="text-center">
            <p className="text-gray-400 mb-4">No point rules configured</p>
            <Button variant="outline" className="border-gray-700 hover:bg-white/10">
              <Plus className="w-4 h-4 mr-2" />
              Add First Point Rule
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleDelete = (ruleId: string) => {
    deletePointRule.mutate({ id: seasonId, ruleId });
  };

  return (
    <Card className="bg-[#0d0d10] border border-white/10">
      <CardContent className="p-6">
        <div className="space-y-4">
          {pointRules.map((rule) => (
            <div
              key={rule.id}
              className="bg-black/30 border border-white/10 rounded-lg p-4 flex justify-between items-start"
            >
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-2">
                  <div className="bg-emerald-500/10 px-3 py-1 rounded-lg">
                    <span className="text-emerald-400 font-semibold">{rule.points} pts</span>
                  </div>
                  <div className="text-gray-300">
                    <span className="font-medium">Rank {rule.placement_start}</span>
                    {rule.placement_start !== rule.placement_end && (
                      <span> - {rule.placement_end}</span>
                    )}
                  </div>
                </div>
                {rule.qualification_status && (
                  <div className="text-sm text-gray-400">
                    Qualification: {rule.qualification_status}
                  </div>
                )}
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleDelete(rule.id)}
                disabled={deletePointRule.isPending}
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

export default PointRulesCard;
