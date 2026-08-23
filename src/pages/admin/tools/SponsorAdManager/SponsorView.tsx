import { useState, useEffect } from 'react';
import { Plus, BarChart2, TrendingUp, TrendingDown } from 'lucide-react';
import { useSponsorPlacements, type Placement } from '@/hooks/useAdminPlacements';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import {
  useAdminSponsorSummary,
  useAdminSponsorPlacements,
  useAdminSponsorSlots,
  useAdminSponsorDevices,
  useAdminSponsorContent,
} from '@/hooks/useAdminSponsorAnalytics';
import { ZONE_META, displayTier, zonesForTier } from './types';
import { PlacementCard } from './PlacementCard';

interface Sponsor { id: string; name: string; tier: string; logo_url?: string; }

interface Props {
  sponsors: Sponsor[];
  initialSponsorId?: string;
  onAssign: (sponsorId: string) => void;
  onEdit: (placement: Placement) => void;
  onDelete: (id: string) => void;
  onReplace?: (placement: Placement) => void;
  onRemove?: (placement: Placement) => void;
  onUnassign?: (placement: Placement) => void;
}

const DAY_OPTIONS = [7, 30, 90] as const;
type Days = (typeof DAY_OPTIONS)[number];

const fmt = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(1)}k` : String(n);

const DEVICE_LABELS: Record<string, string> = {
  'mobile-web': 'Mobile',
  'desktop-web': 'Desktop (other)',
  'tablet-web': 'Tablet',
  'unknown-web': 'Unknown',
  'iphone': 'iPhone',
  'ipad': 'iPad',
  'android-phone': 'Android Phone',
  'android-tablet': 'Android Tablet',
  'windows-pc': 'Windows PC',
  'mac': 'Mac',
  'linux-pc': 'Linux PC',
};

export const SponsorView: React.FC<Props> = ({ sponsors, initialSponsorId, onAssign, onEdit, onDelete, onReplace, onRemove, onUnassign }) => {
  const { isSuperAdmin } = useAdminAccess();
  const [selectedId, setSelectedId] = useState(initialSponsorId ?? '');
  const [days, setDays] = useState<Days>(30);

  useEffect(() => {
    if (initialSponsorId) setSelectedId(initialSponsorId);
  }, [initialSponsorId]);

  useEffect(() => {
    if (!selectedId && sponsors.length > 0) setSelectedId(sponsors[0].id);
  }, [selectedId, sponsors]);

  const { data: placements = [], isLoading } = useSponsorPlacements(selectedId);

  const analyticsEnabled = isSuperAdmin && !!selectedId;
  const { data: summary } = useAdminSponsorSummary(selectedId || undefined, days, analyticsEnabled);
  const { data: placementStats = [] } = useAdminSponsorPlacements(selectedId || undefined, days, analyticsEnabled);
  const { data: slotStats = [] } = useAdminSponsorSlots(selectedId || undefined, days, analyticsEnabled);
  const { data: deviceData } = useAdminSponsorDevices(selectedId || undefined, days, analyticsEnabled);
  const { data: contentData } = useAdminSponsorContent(selectedId || undefined, days, analyticsEnabled);

  const selectedSponsor = sponsors.find(s => s.id === selectedId);
  const allowedZones = selectedSponsor ? zonesForTier(selectedSponsor.tier) : [];

  const globalPlacements = placements.filter(p => !p.tournamentId);
  const tournamentPlacements = placements.filter(p => p.tournamentId);

  const tournamentGroups = tournamentPlacements.reduce<Record<string, { name: string; placements: Placement[] }>>((acc, p) => {
    const key = p.tournamentId!;
    if (!acc[key]) acc[key] = { name: p.tournamentName || 'Unknown', placements: [] };
    acc[key].placements.push(p);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <select
          value={selectedId}
          onChange={e => setSelectedId(e.target.value)}
          className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-white"
        >
          <option value="">Select sponsor...</option>
          {sponsors.map(s => <option key={s.id} value={s.id}>{s.name} ({displayTier(s.tier)})</option>)}
        </select>
        {selectedId && (
          <button
            onClick={() => onAssign(selectedId)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-rose-600 hover:bg-rose-500 rounded-lg text-sm text-white font-medium transition-colors"
          >
            <Plus className="w-4 h-4" /> New Placement
          </button>
        )}
      </div>

      {!selectedId && <div className="text-center py-16 text-zinc-600 text-sm">Select a sponsor to see all their placements.</div>}
      {selectedId && isLoading && <div className="text-center py-16 text-zinc-600 text-sm">Loading...</div>}

      {selectedId && !isLoading && selectedSponsor && (
        <>
          {/* Sponsor info bar */}
          <div className="flex items-center gap-3 px-4 py-3 bg-zinc-900/50 border border-zinc-800 rounded-lg">
            {selectedSponsor.logo_url && <img src={selectedSponsor.logo_url} alt="" className="h-6 w-auto" />}
            <span className="text-sm font-medium text-white">{selectedSponsor.name}</span>
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 bg-zinc-800 rounded text-zinc-400">{displayTier(selectedSponsor.tier)}</span>
            <span className="text-xs text-zinc-500 ml-2">Zones: {allowedZones.map(z => ZONE_META[z].label).join(', ')}</span>
            <span className="text-xs text-zinc-500 ml-auto">{placements.length} placement{placements.length !== 1 ? 's' : ''}</span>
          </div>

          {/* Global placements */}
          {globalPlacements.length > 0 && (
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
              <h4 className="text-sm font-bold text-white mb-4">Global Placements</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {globalPlacements.map(p => (
                  <PlacementCard key={p.id} placement={p} onEdit={onEdit} onDelete={onDelete} onReplace={onReplace} onRemove={onRemove} onUnassign={onUnassign} />
                ))}
              </div>
            </div>
          )}

          {/* Tournament placements grouped */}
          {Object.entries(tournamentGroups).map(([tid, group]) => (
            <div key={tid} className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
              <h4 className="text-sm font-bold text-white mb-1">{group.name}</h4>
              <p className="text-xs text-zinc-500 mb-4">
                {group.placements.map(p => ZONE_META[p.placementZone as keyof typeof ZONE_META]?.label || p.placementZone).join(', ')}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {group.placements.map(p => (
                  <PlacementCard key={p.id} placement={p} onEdit={onEdit} onDelete={onDelete} onReplace={onReplace} onRemove={onRemove} onUnassign={onUnassign} />
                ))}
              </div>
            </div>
          ))}

          {placements.length === 0 && (
            <div className="border border-dashed border-zinc-800 rounded-lg py-12 text-center text-sm text-zinc-600">
              No placements yet. Click "New Placement" to assign this sponsor to a zone.
            </div>
          )}

          {/* Analytics panel (super-admin only) */}
          {isSuperAdmin && (
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-rose-400" />
                  <h4 className="text-sm font-bold text-white">Analytics</h4>
                </div>
                <div className="flex bg-zinc-800 border border-zinc-700 rounded-lg p-0.5 gap-0.5">
                  {DAY_OPTIONS.map(d => (
                    <button
                      key={d}
                      onClick={() => setDays(d)}
                      className={`px-3 py-1 rounded text-xs font-bold transition-colors ${days === d ? 'bg-zinc-600 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                      {d}d
                    </button>
                  ))}
                </div>
              </div>

              {/* Summary KPIs */}
              {summary && (
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Impressions', value: fmt(summary.totalImpressions), trend: summary.trend.impressionsChangePercent },
                    { label: 'Clicks', value: fmt(summary.totalClicks), trend: summary.trend.clicksChangePercent },
                    { label: 'CTR', value: `${summary.ctr.toFixed(1)}%`, trend: undefined },
                  ].map(({ label, value, trend }) => (
                    <div key={label} className="bg-zinc-950 border border-zinc-800 rounded-lg p-4">
                      <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 mb-1">{label}</p>
                      <div className="flex items-end gap-1.5">
                        <span className="text-lg font-bold text-white">{value}</span>
                        {trend !== undefined && trend !== 0 && (
                          <span className={`flex items-center gap-0.5 text-[10px] font-mono mb-0.5 ${trend > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {trend > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                            {Math.abs(trend).toFixed(0)}%
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Placements by Zone */}
              {placementStats.length > 0 && (
                <AnalyticsTable
                  title="By Placement Zone"
                  columns={['Zone', 'Impressions', 'Clicks', 'CTR']}
                  rows={placementStats.map(s => [
                    ZONE_META[s.placement as keyof typeof ZONE_META]?.label || s.placement,
                    s.impressions.toLocaleString(),
                    s.clicks.toLocaleString(),
                    `${s.ctr.toFixed(1)}%`,
                  ])}
                />
              )}

              {/* Placements by Slot/Tournament */}
              {slotStats.length > 0 && (
                <AnalyticsTable
                  title="By Slot / Tournament"
                  columns={['Tournament', 'Zone', 'Impressions', 'Clicks', 'CTR']}
                  rows={slotStats.map(s => [
                    s.tournamentId ? (s.tournamentName || 'Unknown') : '— Global —',
                    ZONE_META[s.placementZone as keyof typeof ZONE_META]?.label || s.placementZone,
                    fmt(s.impressions),
                    fmt(s.clicks),
                    `${s.ctr.toFixed(1)}%`,
                  ])}
                />
              )}

              {/* Devices */}
              {deviceData && deviceData.devices.length > 0 && (
                <AnalyticsTable
                  title="By Device"
                  columns={['Device', 'Impressions', 'Clicks', 'CTR']}
                  rows={deviceData.devices.map(d => [
                    DEVICE_LABELS[d.deviceClass] || d.deviceClass,
                    d.impressions.toLocaleString(),
                    d.clicks.toLocaleString(),
                    `${d.ctr.toFixed(1)}%`,
                  ])}
                />
              )}

              {/* Content by Tournament */}
              {contentData && contentData.tournaments.length > 0 && (
                <AnalyticsTable
                  title="By Tournament"
                  columns={['Tournament', 'Impressions', 'Clicks', 'CTR']}
                  rows={contentData.tournaments.map(t => [
                    t.tournamentName || 'Unknown',
                    t.impressions.toLocaleString(),
                    t.clicks.toLocaleString(),
                    `${t.ctr.toFixed(1)}%`,
                  ])}
                />
              )}

              {/* Content by Page */}
              {contentData && contentData.pages.length > 0 && (
                <AnalyticsTable
                  title="By Page"
                  columns={['Page', 'Impressions', 'Clicks', 'CTR']}
                  rows={contentData.pages.map(p => [
                    p.pagePath,
                    p.impressions.toLocaleString(),
                    p.clicks.toLocaleString(),
                    `${p.ctr.toFixed(1)}%`,
                  ])}
                />
              )}

              {!summary && !placementStats.length && !slotStats.length && (
                <p className="text-xs text-zinc-600 text-center py-4">No analytics data for this period yet.</p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

const AnalyticsTable: React.FC<{ title: string; columns: string[]; rows: string[][] }> = ({ title, columns, rows }) => (
  <div className="overflow-hidden rounded-lg border border-zinc-800">
    <div className="px-4 py-2 bg-zinc-950 border-b border-zinc-800">
      <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">{title}</p>
    </div>
    <table className="w-full text-left text-xs">
      <thead className="bg-zinc-950/50 text-[10px] uppercase tracking-wider text-zinc-600">
        <tr>
          {columns.map((col, i) => (
            <th key={col} className={`px-4 py-2 ${i > 0 ? 'text-right' : ''}`}>{col}</th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-zinc-800/50">
        {rows.map((row, ri) => (
          <tr key={ri} className="text-zinc-300">
            {row.map((cell, ci) => (
              <td key={ci} className={`px-4 py-2.5 font-mono ${ci === 0 ? 'text-white font-sans' : 'text-right'}`}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
