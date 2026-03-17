import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Shield, CheckCircle } from 'lucide-react';

interface QuickResolvePanelProps {
  team1Name: string;
  team2Name: string;
  hasTeam1Reports: boolean;
  hasTeam2Reports: boolean;
}

const QuickResolvePanel: React.FC<QuickResolvePanelProps> = ({
  team1Name,
  team2Name,
  hasTeam1Reports,
  hasTeam2Reports,
}) => {
  const [overrideScores, setOverrideScores] = useState<{
    game: number; t1: string; t2: string; notes: string;
  } | null>(null);

  return (
    <Card className="bg-amber-500/5 border-amber-500/20">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-semibold text-amber-300">Quick Resolve</span>
        </div>

        <div className="flex gap-2 flex-wrap">
          {hasTeam1Reports && (
            <Button
              size="sm"
              variant="outline"
              className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
              onClick={() => setOverrideScores({ game: 1, t1: '', t2: '', notes: `Accepted ${team1Name}'s report` })}
            >
              <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
              Accept {team1Name}'s Report
            </Button>
          )}
          {hasTeam2Reports && (
            <Button
              size="sm"
              variant="outline"
              className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
              onClick={() => setOverrideScores({ game: 1, t1: '', t2: '', notes: `Accepted ${team2Name}'s report` })}
            >
              <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
              Accept {team2Name}'s Report
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
            onClick={() => setOverrideScores({ game: 1, t1: '', t2: '', notes: '' })}
          >
            Override with Custom Score
          </Button>
        </div>

        {overrideScores && (
          <div className="p-3 bg-zinc-900/60 rounded-lg border border-zinc-800 space-y-2">
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={overrideScores.t1}
                onChange={(e) => setOverrideScores({ ...overrideScores, t1: e.target.value })}
                placeholder={team1Name}
                className="w-20 bg-zinc-800 border-zinc-700 text-center"
              />
              <span className="text-zinc-500 text-xs">vs</span>
              <Input
                type="number"
                value={overrideScores.t2}
                onChange={(e) => setOverrideScores({ ...overrideScores, t2: e.target.value })}
                placeholder={team2Name}
                className="w-20 bg-zinc-800 border-zinc-700 text-center"
              />
            </div>
            <Textarea
              value={overrideScores.notes}
              onChange={(e) => setOverrideScores({ ...overrideScores, notes: e.target.value })}
              placeholder="Resolution notes..."
              className="bg-zinc-800 border-zinc-700 text-white min-h-[60px] text-sm"
            />
            <div className="flex gap-2">
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" disabled={!overrideScores.notes.trim()}>
                Submit Resolution
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setOverrideScores(null)} className="text-zinc-400">
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default QuickResolvePanel;
