import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Target, Crosshair } from 'lucide-react';
import type { BRScoringPreset } from '@/types/battleRoyale';

interface BRScoringConfigProps {
  preset: BRScoringPreset;
  killCap: number | null;
}

const BRScoringConfig: React.FC<BRScoringConfigProps> = ({ preset, killCap }) => {
  return (
    <Card className="bg-black/20 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden">
      <CardHeader className="pb-3 border-b border-white/5">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-bold text-white flex items-center gap-2">
            <Target className="w-5 h-5 text-emerald-400" />
            Scoring System
          </CardTitle>
          <Badge variant="outline" className="text-xs">{preset.name}</Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        {/* Placement Points */}
        <div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Placement Points</p>
          <div className="grid grid-cols-5 sm:grid-cols-7 md:grid-cols-10 gap-1.5">
            {preset.placements.map((pts, i) => (
              <div
                key={i}
                className={cn(
                  "text-center p-1.5 rounded-lg border",
                  i === 0 ? "bg-amber-500/10 border-amber-500/20" :
                  i <= 2 ? "bg-white/[0.03] border-white/10" :
                  "bg-white/[0.01] border-white/5"
                )}
              >
                <div className="text-[9px] text-gray-500 font-bold">#{i + 1}</div>
                <div className={cn(
                  "text-xs font-bold",
                  i === 0 ? "text-amber-400" : i <= 2 ? "text-white" : "text-gray-400"
                )}>
                  {pts}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Kill Points */}
        <div className="flex items-center gap-6 p-3 rounded-lg bg-white/[0.02] border border-white/5">
          <div className="flex items-center gap-2">
            <Crosshair className="w-4 h-4 text-rose-400" />
            <span className="text-sm text-gray-400">Per Kill:</span>
            <span className="text-sm font-bold text-white">{preset.killPoints} point{preset.killPoints !== 1 ? 's' : ''}</span>
          </div>
          {killCap && (
            <div className="text-sm text-gray-400">
              Cap: <span className="font-bold text-amber-400">{killCap}</span> per game
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default BRScoringConfig;
