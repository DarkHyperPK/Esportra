import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { apiClient } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLicenses } from '@/hooks/useLicenses';
import { useRiotAccount } from '@/hooks/useRiotAccount';
import { useSteamAccount } from '@/hooks/useSteamAccount';
import { useVenueSearch } from '@/hooks/useVenueSearch';
import { useLowFx, setLowFxOverride, getLowFxOverride } from '@/hooks/useLowFx';
import { detectLowFx } from '@/lib/detectLowFx';
import {
  Loader2, Copy, Check, Shield, Link2, Award, Monitor, Bell, Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Footer from '@/components/Footer';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const handle = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast({ description: `${label ?? text} copied` });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: 'Copy failed', variant: 'destructive' });
    }
  };
  return (
    <button
      onClick={handle}
      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
      title="Copy"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

const LICENSE_TYPE_LABEL: Record<string, string> = {
  venue_owner: 'Venue Owner',
  organizer: 'Organizer',
  broadcaster: 'Broadcaster',
};

const LICENSE_STATUS_CLASS: Record<string, string> = {
  active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  suspended: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
  revoked: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
};

// ─── Nav items ────────────────────────────────────────────────────────────────

type Tab = 'connected_accounts' | 'notifications' | 'licenses' | 'desktop_pairing' | 'security' | 'performance';

interface NavItem { key: Tab; label: string; icon: React.ReactNode; description: string; venueOwnerOnly?: boolean }

const NAV: NavItem[] = [
  { key: 'connected_accounts', label: 'Connected Accounts', description: 'Steam, Riot, Discord', icon: <Link2 className="w-4 h-4" /> },
  { key: 'notifications', label: 'Notifications', description: 'Discord DM alerts', icon: <Bell className="w-4 h-4" /> },
  { key: 'licenses', label: 'My Licenses', description: 'Professional license IDs', icon: <Award className="w-4 h-4" /> },
  { key: 'desktop_pairing', label: 'Desktop Pairing', description: 'Venue hub pairing tokens', venueOwnerOnly: true, icon: <Monitor className="w-4 h-4" /> },
  { key: 'security', label: 'Security', description: 'Password & account safety', icon: <Shield className="w-4 h-4" /> },
  { key: 'performance', label: 'Performance', description: 'Visual effects & performance', icon: <Zap className="w-4 h-4" /> },
];

// ─── AccountSettings ──────────────────────────────────────────────────────────

export default function AccountSettings() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>('connected_accounts');
  // Show Desktop Pairing to anyone who actually owns at least one venue
  const venuesQuery = useQuery({
    queryKey: ['venues', 'ownership', user?.id],
    queryFn: () => apiClient.get<any>(`/api/venues?owner_id=${user!.id}&limit=1`),
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
  });
  const ownsVenues = Array.isArray(venuesQuery.data) ? venuesQuery.data.length > 0 : false;

  // Handle OAuth result redirects from backend BFF endpoints
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    // ── Riot OAuth result ──
    const riotLinked = params.get('riot_linked');
    if (riotLinked) {
      setActiveTab('connected_accounts');
      window.history.replaceState({}, '', window.location.pathname);
      if (riotLinked === 'success') {
        toast({ title: 'Riot Account Linked!' });
        queryClient.invalidateQueries({ queryKey: ['riot-account', user?.id] });
      } else {
        toast({ title: 'Riot Linking Failed', description: (params.get('reason') || 'unknown').replace(/_/g, ' '), variant: 'destructive' });
      }
    }

    // ── Steam OpenID result ──
    const steamLinked = params.get('steam');
    if (steamLinked) {
      setActiveTab('connected_accounts');
      window.history.replaceState({}, '', window.location.pathname);
      if (steamLinked === 'linked') {
        toast({ title: 'Steam Account Linked!' });
        localStorage.setItem('steam_just_linked', Date.now().toString());
        queryClient.invalidateQueries({ queryKey: ['steam-account', user?.id] });
      } else if (steamLinked === 'error') {
        toast({ title: 'Steam Linking Failed', description: (params.get('reason') || 'unknown').replace(/_/g, ' '), variant: 'destructive' });
      }
    }
  }, []);

  const visibleNav = NAV.filter((n) => !n.venueOwnerOnly || ownsVenues);
  const activeItem = visibleNav.find((n) => n.key === activeTab) ?? visibleNav[0];

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <main className="max-w-7xl mx-auto px-6 py-10">
        {/* Page heading */}
        <div className="mb-8 border-b border-white/5 pb-6">
          <h1 className="text-2xl font-bold tracking-tight">Account Settings</h1>
          <p className="text-gray-500 text-sm mt-1">{user?.email}</p>
        </div>

        <div className="flex gap-10">
          {/* ── Left Sidebar ── */}
          <aside className="w-56 shrink-0 border-r border-white/5 pr-4">
            <div className="space-y-0.5">
              {visibleNav.map((item) => (
                <button
                  key={item.key}
                  onClick={() => setActiveTab(item.key)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-left transition-all ${activeTab === item.key
                      ? 'bg-rose-500/10 text-rose-400 font-medium'
                      : 'text-gray-300 hover:text-white hover:bg-white/5'
                    }`}
                >
                  <span className={activeTab === item.key ? 'text-rose-400' : 'text-gray-400'}>
                    {item.icon}
                  </span>
                  {item.label}
                </button>
              ))}
            </div>
          </aside>

          {/* ── Content ── */}
          <div className="flex-1 min-w-0">
            {/* Section heading */}
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-white">{activeItem?.label}</h2>
              <p className="text-sm text-gray-500">{activeItem?.description}</p>
            </div>

            {activeTab === 'connected_accounts' && <ConnectedAccountsTab />}
            {activeTab === 'notifications' && <NotificationsTab />}
            {activeTab === 'licenses' && <LicensesTab userId={user?.id} />}
            {activeTab === 'desktop_pairing' && ownsVenues && <DesktopPairingTab userId={user?.id} />}
            {activeTab === 'security' && <SecurityTab />}
            {activeTab === 'performance' && <PerformanceTab />}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

// ─── Tab: Connected Accounts ──────────────────────────────────────────────────

function ConnectedAccountsTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { riotAccount, isLoading: riotLoading, linkRiotAccount, unlinkRiotAccount } = useRiotAccount();
  const { steamAccount, isLoading: steamLoading, linkSteamAccount, unlinkSteamAccount } = useSteamAccount();
  const [discordIdentity, setDiscordIdentity] = useState<any>(null);
  const [unlinkingRiot, setUnlinkingRiot] = useState(false);
  const [unlinkingSteam, setUnlinkingSteam] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      setDiscordIdentity(u?.identities?.find(id => id.provider === 'discord') ?? null);
    });
  }, [user]);

  const handleUnlinkRiot = async () => {
    setUnlinkingRiot(true);
    try {
      await unlinkRiotAccount();
      toast({ title: 'Riot unlinked' });
    } catch {
      toast({ title: 'Error', description: 'Failed to unlink Riot account.', variant: 'destructive' });
    } finally { setUnlinkingRiot(false); }
  };

  const handleUnlinkSteam = async () => {
    setUnlinkingSteam(true);
    try {
      await unlinkSteamAccount();
      toast({ title: 'Steam unlinked' });
    } catch {
      toast({ title: 'Error', description: 'Failed to unlink Steam account.', variant: 'destructive' });
    } finally { setUnlinkingSteam(false); }
  };

  const linkDiscord = () => supabase.auth.signInWithOAuth({
    provider: 'discord',
    options: { redirectTo: window.location.href, scopes: 'identify email guilds.join' },
  });

  const accounts = [
    {
      key: 'steam', name: 'Steam',
      description: steamLoading ? 'Loading...' : steamAccount
        ? steamAccount.steamName || steamAccount.steam64Id
        : 'Required for CS2 match automation',
      connected: !!steamAccount, loading: steamLoading,
      icon: <img src="/steam.png" alt="Steam" className="w-8 h-8 drop-shadow-md rounded-full" />,
      onConnect: linkSteamAccount, onUnlink: handleUnlinkSteam, unlinking: unlinkingSteam,
      connectClass: 'bg-[#171a21] hover:bg-[#2a475e] border border-white/10',
    },
    {
      key: 'riot', name: 'Riot Games',
      description: riotLoading ? 'Loading...' : riotAccount
        ? `${riotAccount.game_name}#${riotAccount.tag_line}`
        : 'Required for Valorant tournament registration',
      connected: !!riotAccount, loading: riotLoading,
      icon: <img src="/Riot.png" alt="Riot Games" className="w-8 h-8 drop-shadow-md" />,
      onConnect: linkRiotAccount, onUnlink: handleUnlinkRiot, unlinking: unlinkingRiot,
      connectClass: 'bg-[#D13639] hover:bg-[#b82e31] border border-white/10',
    },
    {
      key: 'discord', name: 'Discord',
      description: discordIdentity
        ? discordIdentity.identity_data?.full_name || discordIdentity.identity_data?.email || 'Linked'
        : 'Link your Discord account',
      connected: !!discordIdentity, loading: false,
      icon: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 127.14 96.36" className="w-8 h-8 drop-shadow-md"><path fill="#5865F2" d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.31,60,73.31,53s5-12.74,11.43-12.74S96.2,46,96.12,53,91.08,65.69,84.69,65.69Z"/></svg>,
      onConnect: linkDiscord, onUnlink: undefined, unlinking: false,
      connectClass: 'bg-[#5865F2] hover:bg-[#4752C4] border border-white/10',
    },
  ];

  return (
    <div className="space-y-3 max-w-2xl">
      {accounts.map((acc) => (
        <div key={acc.key} className="rounded-xl border border-white/5 bg-white/[0.02] p-4 flex items-center gap-4">
          <div className="flex items-center justify-center shrink-0 w-10">
            {acc.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-white text-sm">{acc.name}</div>
            <div className={`text-xs mt-0.5 truncate ${acc.connected ? 'text-emerald-400' : 'text-gray-500'}`}>
              {acc.description}
            </div>
          </div>
          {!acc.loading && (
            acc.connected ? (
              acc.onUnlink && (
                <Button size="sm" variant="outline"
                  className="border-rose-500/30 text-rose-400 hover:bg-rose-500/10 shrink-0 text-xs"
                  disabled={acc.unlinking} onClick={acc.onUnlink}>
                  {acc.unlinking
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : 'Unlink'}
                </Button>
              )
            ) : (
              <Button size="sm" className={`shrink-0 text-white text-xs ${acc.connectClass}`} onClick={acc.onConnect}>
                Connect
              </Button>
            )
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Tab: Notifications ──────────────────────────────────────────────────────

function NotificationsTab() {
  const { toast } = useToast();
  const [toggling, setToggling] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['discord-dm-prefs'],
    queryFn: () => apiClient.get<{ discord_dm_enabled: boolean; has_discord: boolean }>('/api/profiles/me/discord-dm'),
  });

  const handleToggle = async () => {
    if (!data) return;

    if (data.discord_dm_enabled && !data.has_discord) {
      toast({ title: 'Link Discord first', description: 'Go to Connected Accounts and link your Discord.', variant: 'destructive' });
      return;
    }

    setToggling(true);
    try {
      await apiClient.put('/api/profiles/me/discord-dm', { enabled: !data.discord_dm_enabled });
      await refetch();
      toast({ title: data.discord_dm_enabled ? 'Discord DMs disabled' : 'Discord DMs enabled' });
    } catch (err) {
      toast({ title: 'Failed to update', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setToggling(false);
    }
  };

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-rose-400" /></div>;

  // Default is enabled for users with Discord linked
  const enabled = data?.discord_dm_enabled ?? data?.has_discord ?? false;
  const hasDiscord = data?.has_discord ?? false;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="rounded-xl border border-white/5 bg-white/[0.02] p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#5865F2]/20 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 127.14 96.36" className="w-6 h-6">
                <path fill="#5865F2" d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.31,60,73.31,53s5-12.74,11.43-12.74S96.2,46,96.12,53,91.08,65.69,84.69,65.69Z" />
              </svg>
            </div>
            <div>
              <h3 className="text-white font-medium">Discord DM Notifications</h3>
              <p className="text-sm text-gray-400">
                {hasDiscord
                  ? 'Get match alerts, check-in reminders, and tournament updates as Discord DMs.'
                  : 'Link your Discord account first to enable DM notifications.'}
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant={enabled ? 'destructive' : 'default'}
            onClick={handleToggle}
            disabled={toggling || (!hasDiscord)}
            className={!enabled ? 'bg-[#5865F2] hover:bg-[#4752C4] text-white' : ''}
          >
            {toggling ? <Loader2 className="w-4 h-4 animate-spin" /> : enabled ? 'Disable' : 'Enable'}
          </Button>
        </div>

        {enabled && hasDiscord && (
          <div className="mt-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3">
            <p className="text-sm text-emerald-400">
              ✅ Discord DMs are active. You'll receive alerts for: match ready, check-in reminders,
              result reports, disputes, and tournament updates.
            </p>
          </div>
        )}

        {!hasDiscord && (
          <div className="mt-4 rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
            <p className="text-sm text-amber-400">
              ⚠️ Link your Discord account in Connected Accounts to receive DM notifications.
            </p>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-white/5 bg-white/[0.02] p-6">
        <h4 className="text-white font-medium mb-3">What you'll receive</h4>
        <ul className="space-y-2 text-sm text-gray-400">
          <li className="flex items-center gap-2">🎮 <span>Match ready — your match is set up and waiting</span></li>
          <li className="flex items-center gap-2">⏰ <span>Check-in reminders — don't miss your window</span></li>
          <li className="flex items-center gap-2">📊 <span>Result reported — scores submitted for your match</span></li>
          <li className="flex items-center gap-2">🚨 <span>Disputes — result challenged or resolved</span></li>
          <li className="flex items-center gap-2">🏆 <span>Tournament updates — registration confirmed, tournament starting</span></li>
        </ul>
      </div>
    </div>
  );
}

// ─── Tab: My Licenses ─────────────────────────────────────────────────────────

function LicensesTab({ userId }: { userId: string | undefined }) {
  const { data: licenses, isLoading, error } = useLicenses(userId);

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-rose-400" /></div>;
  if (error) return (
    <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-6 text-rose-400 text-sm max-w-2xl">
      Failed to load licenses: {(error as Error).message}
    </div>
  );
  if (!licenses || licenses.length === 0) return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-12 text-center max-w-2xl">
      <Award className="w-10 h-10 mx-auto mb-3 text-gray-700" />
      <p className="text-gray-400 font-medium">No licenses assigned yet</p>
      <p className="text-gray-600 text-sm mt-1">Apply for a license through the verification process.</p>
    </div>
  );

  return (
    <div className="space-y-3 max-w-2xl">
      {licenses.map((lic) => (
        <div key={lic.id} className="rounded-xl border border-white/5 bg-white/[0.02] p-5 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="font-mono text-sm text-white font-bold tracking-widest">{lic.license_id}</span>
              <CopyButton text={lic.license_id} label="License ID" />
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                {LICENSE_TYPE_LABEL[lic.license_type] ?? lic.license_type}
              </span>
              <span className={`px-2 py-0.5 rounded-full border ${LICENSE_STATUS_CLASS[lic.status] ?? 'bg-white/5 text-white border-white/10'}`}>
                {lic.status.charAt(0).toUpperCase() + lic.status.slice(1)}
              </span>
            </div>
          </div>
          <div className="text-xs text-gray-500 shrink-0 space-y-0.5">
            <div>Issued {new Date(lic.issued_at).toLocaleDateString()}</div>
            {lic.expires_at && <div>Expires {new Date(lic.expires_at).toLocaleDateString()}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Tab: Desktop Pairing (venue owners only) ─────────────────────────────────

function DesktopPairingTab({ userId }: { userId: string | undefined }) {
  const { venues, loading } = useVenueSearch({ includeOwned: true });
  const ownedWithToken = venues.filter((v) => v.owner_id === userId && v.desktop_pairing_token);

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="rounded-xl border border-white/5 bg-white/[0.02] p-5">
        <h3 className="font-semibold text-white mb-1">Pair Esportra Desktop</h3>
        <p className="text-sm text-gray-400">
          Enter the 6-character token in the Desktop app under Settings → Venue Pairing to connect your venue hub.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-rose-400" /></div>
      ) : ownedWithToken.length === 0 ? (
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-10 text-center">
          <Monitor className="w-10 h-10 mx-auto mb-3 text-gray-700" />
          <p className="text-gray-400">No published venues with pairing tokens found.</p>
          <p className="text-gray-600 text-sm mt-1">Make sure your venue is submitted and published.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {ownedWithToken.map((venue) => (
            <div key={venue.id} className="rounded-xl border border-white/5 bg-white/[0.02] p-5 flex items-center justify-between gap-4">
              <div>
                <div className="font-medium text-white text-sm">{venue.name}</div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {venue.city}, {venue.country}
                  {venue.venue_id && <span className="ml-2 font-mono text-gray-600">{venue.venue_id}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="font-mono text-xl font-bold tracking-widest text-emerald-400">{venue.desktop_pairing_token}</span>
                <CopyButton text={venue.desktop_pairing_token!} label="Pairing token" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Tab: Security ────────────────────────────────────────────────────────────

function SecurityTab() {
  const { toast } = useToast();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const isValid = newPassword.length >= 8 && newPassword === confirmPassword;

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast({ title: 'Password updated', description: 'Your password has been changed.' });
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-md">
      <div className="rounded-xl border border-white/5 bg-white/[0.02] p-6 space-y-5">
        <div>
          <h3 className="font-semibold text-white">Change Password</h3>
          <p className="text-xs text-gray-500 mt-0.5">Must be at least 8 characters. Leave blank if you sign in with magic link.</p>
        </div>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-gray-500 uppercase tracking-wide">New Password</Label>
            <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
              className="bg-black/20 border-white/10 focus:border-rose-500/50 text-white"
              placeholder="••••••••" autoComplete="new-password" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-gray-500 uppercase tracking-wide">Confirm Password</Label>
            <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
              className="bg-black/20 border-white/10 focus:border-rose-500/50 text-white"
              placeholder="••••••••" autoComplete="new-password" />
            {confirmPassword && newPassword !== confirmPassword && (
              <p className="text-xs text-rose-400">Passwords do not match</p>
            )}
            {newPassword.length > 0 && newPassword.length < 8 && (
              <p className="text-xs text-yellow-400">Must be at least 8 characters</p>
            )}
          </div>
          <Button type="submit" disabled={!isValid || submitting} className="w-full bg-rose-500 hover:bg-rose-600 disabled:opacity-40">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update Password'}
          </Button>
        </form>
      </div>
    </div>
  );
}

// ─── Tab: Performance ─────────────────────────────────────────────────────────

type FxMode = 'auto' | 'on' | 'off';

function PerformanceTab() {
  const { toast } = useToast();
  const effectiveLowFx = useLowFx();
  const detection = detectLowFx();
  const [mode, setMode] = useState<FxMode>(() => {
    const o = getLowFxOverride();
    if (o === 'on') return 'on';
    if (o === 'off') return 'off';
    return 'auto';
  });

  const apply = (next: FxMode) => {
    setMode(next);
    if (next === 'auto') setLowFxOverride(null);
    else setLowFxOverride(next === 'on');
    toast({
      title:
        next === 'auto' ? 'Auto detection' :
        next === 'on'   ? 'Low-FX forced on' :
                          'Low-FX forced off',
      description:
        next === 'auto' ? 'The app will detect your hardware automatically.' :
        next === 'on'   ? 'Expensive visual effects are disabled.' :
                          'All visual effects are enabled, regardless of hardware.',
    });
  };

  const options: Array<{ value: FxMode; label: string; hint: string }> = [
    { value: 'auto', label: 'Automatic', hint: 'Detect software rendering and low-end devices' },
    { value: 'on',   label: 'Always on', hint: 'Force reduced effects for smoothest performance' },
    { value: 'off',  label: 'Always off', hint: 'Force full effects regardless of hardware' },
  ];

  return (
    <div className="max-w-xl space-y-4">
      {/* Current status card */}
      <div className="rounded-xl border border-white/5 bg-white/[0.02] p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">Current status</p>
            <p className="text-sm font-medium text-white mt-1">
              {effectiveLowFx ? 'Low-FX mode active' : 'Full visual effects active'}
            </p>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-medium ${
              effectiveLowFx
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
            }`}
          >
            <Zap className="w-3 h-3" /> {effectiveLowFx ? 'Degraded' : 'Full'}
          </span>
        </div>
        {detection.reasons.length > 0 && (
          <div className="mt-3 pt-3 border-t border-white/5">
            <p className="text-[11px] uppercase tracking-wide text-gray-500 mb-1.5">
              Auto-detected signals
            </p>
            <div className="flex flex-wrap gap-1.5">
              {detection.reasons.map((r) => (
                <code
                  key={r}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-black/30 border border-white/5 text-gray-400 font-mono"
                >
                  {r}
                </code>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Mode selector */}
      <div className="rounded-xl border border-white/5 bg-white/[0.02] p-5 space-y-3">
        <div>
          <h3 className="font-semibold text-white">Visual effects mode</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Low-FX disables blurs, background shaders, and animated glows — the effects that hurt performance when GPU acceleration is unavailable.
          </p>
        </div>

        <div role="radiogroup" aria-label="Visual effects mode" className="space-y-1.5">
          {options.map((opt) => {
            const active = mode === opt.value;
            return (
              <button
                key={opt.value}
                role="radio"
                aria-checked={active}
                onClick={() => apply(opt.value)}
                className={`w-full flex items-start gap-3 p-3 rounded-lg border text-left transition-colors ${
                  active
                    ? 'bg-rose-500/10 border-rose-500/30'
                    : 'bg-transparent border-white/5 hover:bg-white/[0.03] hover:border-white/10'
                }`}
              >
                <span
                  className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                    active ? 'border-rose-400' : 'border-white/20'
                  }`}
                >
                  {active && <span className="w-2 h-2 rounded-full bg-rose-400" />}
                </span>
                <span className="flex-1 min-w-0">
                  <span className={`block text-sm font-medium ${active ? 'text-white' : 'text-gray-300'}`}>
                    {opt.label}
                  </span>
                  <span className="block text-[11px] text-gray-500 mt-0.5">{opt.hint}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
