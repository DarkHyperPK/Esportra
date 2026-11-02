import { ToggleRow } from '@/components/ui/kit';
import { useToast } from '@/hooks/use-toast';
import { useAnalyticsVisibility } from '@/hooks/competitive/useAnalyticsVisibility';

/**
 * A player's choice about the performance stats Esportra builds from their Riot matches. Private by default.
 * Says plainly what is retrieved, what is kept and who sees it, so the choice is informed.
 */
export function AnalyticsVisibilitySection() {
  const { toast } = useToast();
  const { visibility, isLoading, isSaving, save } = useAnalyticsVisibility('valorant');

  const onChange = async (isPublic: boolean) => {
    try {
      await save(isPublic ? 'public' : 'private');
      toast({ title: isPublic ? 'Analytics are public' : 'Analytics are private' });
    } catch {
      toast({ title: 'Could not save', description: 'Your analytics setting was not changed. Try again.', variant: 'destructive' });
    }
  };

  return (
    <section aria-labelledby="analytics-visibility-title" className="space-y-3 pt-2">
      <div>
        <h3 id="analytics-visibility-title" className="text-sm font-semibold text-white">Competitive analytics</h3>
        <p className="mt-1 text-[13px] leading-relaxed text-zinc-400">
          For scrims and tournament games you play, Esportra fetches the match record from Riot (kills, damage, agents, rounds)
          and keeps it with the teams you played for. Your own stats are private to you and your team’s staff unless you share them.
        </p>
      </div>
      <ToggleRow
        id="analytics-public"
        title="Show my stats on my public profile"
        description="Anyone can see your verified match stats. Turn off to keep them to you and your team’s staff."
        checked={visibility === 'public'}
        onCheckedChange={onChange}
        disabled={isLoading || isSaving}
      />
    </section>
  );
}
