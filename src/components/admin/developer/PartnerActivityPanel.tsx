import { useMemo, useState } from 'react';
import { formatDistanceToNow, subDays, subHours } from 'date-fns';
import { ArrowUpRight, Loader2 } from 'lucide-react';
import {
  CommandButton,
  CommandEmptyState,
  CommandPanel,
  CommandSegmentedButton,
} from '@/components/management/CommandSurface';
import { type PartnerActivity, useAdminPartnerActivity } from '@/hooks/useDeveloperApi';
import { cn } from '@/lib/utils';

type Period = '24h' | '7d' | '30d';

function toIso(date: Date) {
  return date.toISOString();
}

function periodRange(period: Period): { from: string; to: string } {
  const to = new Date();
  const from =
    period === '24h'
      ? subHours(to, 24)
      : period === '7d'
        ? subDays(to, 7)
        : subDays(to, 30);
  return { from: toIso(from), to: toIso(to) };
}

function errorRateClass(rate: number) {
  if (rate === 0) return 'text-emerald-400';
  if (rate < 5) return 'text-amber-400';
  return 'text-red-400';
}

interface PartnerRowProps {
  partner: PartnerActivity;
}

function PartnerRow({ partner }: PartnerRowProps) {
  return (
    <tr className="border-b border-white/5 hover:bg-white/[0.02]">
      <td className="py-3 pr-4">
        <p className="font-semibold text-white">{partner.org_name}</p>
      </td>
      <td className="py-3 pr-4 text-sm text-zinc-300">
        {partner.total_requests.toLocaleString()}
      </td>
      <td className={cn('py-3 pr-4 text-sm font-mono', errorRateClass(partner.error_rate))}>
        {partner.error_rate.toFixed(1)}%
      </td>
      <td className="py-3 pr-4 text-sm text-zinc-300">
        {partner.sandbox_key_count.toLocaleString()}
      </td>
      <td className="py-3 pr-4 text-sm text-zinc-300">
        {partner.live_key_count.toLocaleString()}
      </td>
      <td className="py-3 pr-4 text-sm text-zinc-400">
        {partner.last_active_at
          ? formatDistanceToNow(new Date(partner.last_active_at), { addSuffix: true })
          : '—'}
      </td>
      <td className="py-3">
        <CommandButton
          size="sm"
          variant="ghost"
          asChild
        >
          <a href={`/admin/organizations/${partner.organization_id}/api-keys`}>
            <ArrowUpRight className="h-4 w-4" />
          </a>
        </CommandButton>
      </td>
    </tr>
  );
}

export function PartnerActivityPanel() {
  const [period, setPeriod] = useState<Period>('7d');
  const { from, to } = useMemo(() => periodRange(period), [period]);
  const { data, isLoading } = useAdminPartnerActivity(from, to);
  const partners = data?.partners ?? [];

  return (
    <div className="space-y-4">
      {/* Period selector */}
      <div className="flex items-center gap-2">
        <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-500">
          Period
        </span>
        {(['24h', '7d', '30d'] as Period[]).map((p) => (
          <CommandSegmentedButton
            key={p}
            active={period === p}
            onClick={() => setPeriod(p)}
          >
            {p}
          </CommandSegmentedButton>
        ))}
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 py-10 text-zinc-500">
          <Loader2 className="h-5 w-5 animate-spin text-rose-400" />
          Loading partner activity…
        </div>
      )}

      {!isLoading && partners.length === 0 && (
        <CommandEmptyState
          title="No partner activity"
          description="No API usage recorded for this period."
        />
      )}

      {partners.length > 0 && (
        <CommandPanel className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                {['Organization', 'Total Requests', 'Error Rate', 'Sandbox Keys', 'Live Keys', 'Last Active', ''].map((h) => (
                  <th
                    key={h}
                    className="px-4 pb-3 pt-4 text-left font-mono text-[9px] font-bold uppercase tracking-[0.3em] text-zinc-600"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="px-4">
              {partners.map((partner) => (
                <PartnerRow key={partner.organization_id} partner={partner} />
              ))}
            </tbody>
          </table>
        </CommandPanel>
      )}
    </div>
  );
}
