import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageIntro } from '@/components/ui/kit';
import { RecordTimeline } from '@/components/competitive/RecordTimeline';
import { CompetitivePageShell } from '@/components/competitive/CompetitivePageShell';

const GAME_OPTIONS = [
  { value: '', label: 'All Games' },
  { value: 'valorant', label: 'Valorant' },
  { value: 'cs2', label: 'CS2' },
  { value: 'apex', label: 'Apex Legends' },
  { value: 'fortnite', label: 'Fortnite' },
];

export default function CareerTimelinePage() {
  const { userId = '' } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [game, setGame] = useState('');

  return (
    <CompetitivePageShell>
      <div className="px-4 pt-6 pb-2 lg:px-8">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="mb-4 -ml-2 text-white/50 hover:text-white/90 hover:bg-white/[0.04] rounded-none h-8 text-[13px] gap-1.5"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Back
        </Button>
        <PageIntro eyebrow="COMPETITIVE" title="Career Timeline" />
      </div>

      <div className="px-4 lg:px-8 pb-4">
        <label htmlFor="game-filter" className="sr-only">
          Filter by game
        </label>
        <select
          id="game-filter"
          value={game}
          onChange={(e) => setGame(e.target.value)}
          className="bg-white/[0.04] border border-white/[0.08] rounded-none text-white/90 text-[13px] px-3 h-9 focus:outline-none focus:border-white/20"
        >
          {GAME_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-[#0A0A0A]">
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="px-4 lg:px-8 pb-12">
        <RecordTimeline userId={userId} game={game || undefined} />
      </div>
    </CompetitivePageShell>
  );
}
