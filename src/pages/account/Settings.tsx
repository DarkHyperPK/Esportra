import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { useLicenses } from '@/hooks/useLicenses';
import { useFaceitAccount } from '@/hooks/useFaceitAccount';
import { useRiotAccount } from '@/hooks/useRiotAccount';
import { useVenueSearch } from '@/hooks/useVenueSearch';
import AvatarUploader from '@/components/player/AvatarUploader';
import { countries, detectUserCountry, getCountryFlagUrl, getCountryName, getCountryFlag } from '@/utils/countries';
import {
  Loader2, Copy, Check, Shield, Link2, Link2Off, Award, Monitor,
  User, Share2, Save, Globe,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

// ─── Tabs ─────────────────────────────────────────────────────────────────────

type Tab = 'profile' | 'connected_accounts' | 'licenses' | 'desktop_pairing' | 'security';

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: 'profile',            label: 'Profile',            icon: <User className="w-4 h-4" /> },
  { key: 'connected_accounts', label: 'Connected Accounts', icon: <Link2 className="w-4 h-4" /> },
  { key: 'licenses',           label: 'My Licenses',        icon: <Award className="w-4 h-4" /> },
  { key: 'desktop_pairing',    label: 'Desktop Pairing',    icon: <Monitor className="w-4 h-4" /> },
  { key: 'security',           label: 'Security',           icon: <Shield className="w-4 h-4" /> },
];

// ─── AccountSettings ──────────────────────────────────────────────────────────

export default function AccountSettings() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isVenueOwner = profile?.role === 'venue_owner';
  const [activeTab, setActiveTab] = useState<Tab>('profile');

  // Handle Riot / Faceit OAuth callbacks that redirect back to this page
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    // ── Riot secure callback (new flow) ──
    const riotCallback = params.get('riot_callback');
    if (riotCallback === 'true') {
      setActiveTab('connected_accounts');
      const code = params.get('code');
      const state = params.get('state');
      const storedState = sessionStorage.getItem('riotOAuthState');
      window.history.replaceState({}, '', window.location.pathname);

      if (!state || state !== storedState) {
        toast({ title: 'Security Error', description: 'CSRF mismatch. Request blocked.', variant: 'destructive' });
        sessionStorage.removeItem('riotOAuthState');
        return;
      }
      sessionStorage.removeItem('riotOAuthState');

      (async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/riot-oauth`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
            body: JSON.stringify({ code }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.reason || data.error || 'Failed to link');
          toast({ title: 'Riot Account Linked!', description: data.gameName ? `Linked ${data.gameName}#${data.tagLine}` : 'Riot account linked.' });
          queryClient.invalidateQueries({ queryKey: ['riot-account', user?.id] });
        } catch (err: any) {
          toast({ title: 'Riot Linking Failed', description: err.message, variant: 'destructive' });
        }
      })();
      return;
    }

    // ── Riot old/error redirect ──
    const riotLinked = params.get('riot_linked');
    if (riotLinked) {
      setActiveTab('connected_accounts');
      window.history.replaceState({}, '', window.location.pathname);
      if (riotLinked === 'success') {
        const gameName = params.get('game_name');
        const tagLine = params.get('tag_line');
        toast({ title: 'Riot Account Linked!', description: gameName ? `Linked ${gameName}#${tagLine}` : 'Riot account linked.' });
        queryClient.invalidateQueries({ queryKey: ['riot-account', user?.id] });
      } else {
        toast({ title: 'Riot Linking Failed', description: (params.get('reason') || 'unknown').replace(/_/g, ' '), variant: 'destructive' });
      }
    }

    // ── Faceit callback ──
    const faceitCallback = params.get('faceit_callback');
    if (faceitCallback === 'true') {
      setActiveTab('connected_accounts');
      const code = params.get('code');
      const state = params.get('state');
      const storedState = localStorage.getItem('faceitOAuthState');
      window.history.replaceState({}, '', window.location.pathname);

      if (!state || state !== storedState) {
        toast({ title: 'Security Error', description: 'CSRF mismatch. Request blocked.', variant: 'destructive' });
        localStorage.removeItem('faceitOAuthState');
        return;
      }
      localStorage.removeItem('faceitOAuthState');
      const codeVerifier = localStorage.getItem('faceitCodeVerifier');
      localStorage.removeItem('faceitCodeVerifier');

      (async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/faceit-oauth`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
            body: JSON.stringify({ code, code_verifier: codeVerifier }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.detail || data.error || 'Failed to link');
          toast({ title: 'Faceit Account Linked!', description: data.nickname ? `Linked "${data.nickname}"` : 'Faceit account linked.' });
          localStorage.setItem('faceit_just_linked', Date.now().toString());
          queryClient.invalidateQueries({ queryKey: ['faceit-account', user?.id] });
        } catch (err: any) {
          toast({ title: 'Faceit Linking Failed', description: err.message, variant: 'destructive' });
        }
      })();
    }

    // ── Faceit error redirect ──
    const faceitLinked = params.get('faceit_linked');
    if (faceitLinked === 'error') {
      setActiveTab('connected_accounts');
      window.history.replaceState({}, '', window.location.pathname);
      toast({ title: 'Faceit Linking Failed', description: (params.get('reason') || 'unknown').replace(/_/g, ' '), variant: 'destructive' });
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <main className="container mx-auto px-4 py-10 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Account Settings</h1>
          <p className="text-gray-500 text-sm mt-1">{user?.email}</p>
        </div>

        {/* Tab Bar */}
        <div className="flex gap-1 bg-white/5 p-1 rounded-xl mb-8 overflow-x-auto">
          {TABS.filter((t) => t.key !== 'desktop_pairing' || isVenueOwner).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.key
                  ? 'bg-rose-500 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-white/10'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'profile'            && <ProfileTab />}
        {activeTab === 'connected_accounts' && <ConnectedAccountsTab />}
        {activeTab === 'licenses'           && <LicensesTab userId={user?.id} />}
        {activeTab === 'desktop_pairing'    && isVenueOwner && <DesktopPairingTab userId={user?.id} />}
        {activeTab === 'security'           && <SecurityTab />}
      </main>
      <Footer />
    </div>
  );
}

// ─── Tab: Profile ─────────────────────────────────────────────────────────────

function ProfileTab() {
  const { profile, updateProfile } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [detectionFailed, setDetectionFailed] = useState(false);
  const [showCountrySelector, setShowCountrySelector] = useState(false);
  const [form, setForm] = useState({
    username: '',
    full_name: '',
    bio: '',
    avatar_url: '',
    country_code: '',
    social_links: { twitter: '', twitch: '', youtube: '', instagram: '' },
  });

  useEffect(() => {
    if (!profile) return;
    setForm({
      username: profile.username || '',
      full_name: profile.full_name || '',
      bio: profile.bio || '',
      avatar_url: profile.avatar_url || '',
      country_code: profile.country_code || '',
      social_links: {
        twitter: profile.social_links?.twitter || '',
        twitch: profile.social_links?.twitch || '',
        youtube: profile.social_links?.youtube || '',
        instagram: profile.social_links?.instagram || '',
      },
    });
    if (!profile.country_code) handleAutodetect();
  }, [profile?.id]);

  const handleAutodetect = async () => {
    setDetecting(true);
    setDetectionFailed(false);
    try {
      const detected = await detectUserCountry();
      if (detected) {
        setForm(prev => ({ ...prev, country_code: detected }));
      } else {
        setDetectionFailed(true);
      }
    } catch {
      setDetectionFailed(true);
    } finally {
      setDetecting(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile({
        username: form.username,
        full_name: form.full_name,
        bio: form.bio,
        avatar_url: form.avatar_url,
        country_code: form.country_code,
        social_links: form.social_links,
      });
      toast({ title: 'Profile saved', description: 'Your changes have been saved.' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (!profile) {
    return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-rose-400" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Avatar */}
      <div className="rounded-xl border border-white/5 bg-white/[0.02] p-6 flex items-center gap-6">
        <AvatarUploader
          value={form.avatar_url}
          onChange={(url) => setForm(prev => ({ ...prev, avatar_url: url }))}
          size="xl"
          uploadPath={profile.id ? `profile-pictures/${profile.id}_${Date.now()}_avatar.png` : undefined}
        />
        <div>
          <div className="font-semibold text-white">{profile.username}</div>
          <div className="text-sm text-gray-500 mt-0.5">Click avatar to upload a new photo</div>
        </div>
      </div>

      {/* Basic Info */}
      <div className="rounded-xl border border-white/5 bg-white/[0.02] p-6 space-y-4">
        <h3 className="font-semibold text-white text-sm uppercase tracking-wide text-gray-400">Basic Info</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-gray-400 uppercase tracking-wide">Username</Label>
            <Input
              value={form.username}
              onChange={(e) => setForm(prev => ({ ...prev, username: e.target.value }))}
              className="bg-black/20 border-white/10 focus:border-rose-500/50 text-white"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-gray-400 uppercase tracking-wide">Display Name</Label>
            <Input
              value={form.full_name}
              onChange={(e) => setForm(prev => ({ ...prev, full_name: e.target.value }))}
              className="bg-black/20 border-white/10 focus:border-rose-500/50 text-white"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-gray-400 uppercase tracking-wide">Bio</Label>
          <Textarea
            value={form.bio}
            onChange={(e) => setForm(prev => ({ ...prev, bio: e.target.value }))}
            className="bg-black/20 border-white/10 focus:border-rose-500/50 text-white min-h-[90px]"
            placeholder="Tell the community about yourself..."
          />
        </div>

        {/* Country */}
        <div className="space-y-1.5">
          <Label className="text-xs text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5" /> Country
          </Label>
          <div className="flex items-center gap-3 p-3 bg-black/20 border border-white/10 rounded-lg min-h-[48px]">
            {form.country_code ? (
              <>
                <img src={getCountryFlagUrl(form.country_code)} alt="" className="w-7 h-5 object-cover rounded border border-white/10" />
                <span className="text-sm text-white">{getCountryName(form.country_code)}</span>
                <Button
                  variant="ghost" size="sm"
                  className="ml-auto text-xs text-gray-500 hover:text-white h-6 px-2"
                  onClick={() => setShowCountrySelector(true)}
                >
                  Change
                </Button>
              </>
            ) : detecting ? (
              <div className="flex items-center gap-2 text-gray-500 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" /> Detecting...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-gray-500 text-sm">{detectionFailed ? 'Detection failed' : 'Not set'}</span>
                <Button size="sm" variant="outline" className="h-7 text-xs border-white/10" onClick={handleAutodetect}>
                  <Globe className="w-3 h-3 mr-1" /> Detect
                </Button>
              </div>
            )}
          </div>
          {(showCountrySelector || (detectionFailed && !form.country_code)) && (
            <Select
              value={form.country_code}
              onValueChange={(v) => { setForm(prev => ({ ...prev, country_code: v })); setShowCountrySelector(false); }}
            >
              <SelectTrigger className="bg-black/40 border-white/10 text-white">
                <SelectValue placeholder="Select country" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800 text-white max-h-60">
                {countries.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {getCountryFlag(c.code)} {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Social Links */}
      <div className="rounded-xl border border-white/5 bg-white/[0.02] p-6 space-y-4">
        <h3 className="font-semibold text-white text-sm uppercase tracking-wide text-gray-400 flex items-center gap-2">
          <Share2 className="w-3.5 h-3.5" /> Social Links
        </h3>
        {([
          { key: 'twitter',   prefix: '@',              placeholder: 'username' },
          { key: 'twitch',    prefix: 'twitch.tv/',     placeholder: 'channel' },
          { key: 'youtube',   prefix: 'youtube.com/',   placeholder: '@channel' },
          { key: 'instagram', prefix: 'instagram.com/', placeholder: 'username' },
        ] as const).map(({ key, prefix, placeholder }) => (
          <div key={key} className="space-y-1.5">
            <Label className="text-xs text-gray-400 uppercase tracking-wide capitalize">{key}</Label>
            <div className="flex rounded-lg">
              <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-white/10 bg-white/5 text-gray-500 text-sm whitespace-nowrap">
                {prefix}
              </span>
              <Input
                value={form.social_links[key]}
                onChange={(e) => setForm(prev => ({
                  ...prev,
                  social_links: { ...prev.social_links, [key]: e.target.value },
                }))}
                className="rounded-l-none bg-black/20 border-white/10 focus:border-rose-500/50 text-white"
                placeholder={placeholder}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-rose-500 hover:bg-rose-600 disabled:opacity-40 px-8"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          Save Changes
        </Button>
      </div>
    </div>
  );
}

// ─── Tab: Connected Accounts ──────────────────────────────────────────────────

function ConnectedAccountsTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { riotAccount, isLoading: riotLoading, linkRiotAccount, unlinkRiotAccount } = useRiotAccount();
  const { faceitAccount, isLoading: faceitLoading, linkFaceitAccount, unlinkFaceitAccount } = useFaceitAccount();
  const [discordIdentity, setDiscordIdentity] = useState<any>(null);
  const [unlinkingRiot, setUnlinkingRiot] = useState(false);
  const [unlinkingFaceit, setUnlinkingFaceit] = useState(false);

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
      toast({ title: 'Riot unlinked', description: 'Your Riot account has been removed.' });
    } catch {
      toast({ title: 'Error', description: 'Failed to unlink Riot account.', variant: 'destructive' });
    } finally {
      setUnlinkingRiot(false);
    }
  };

  const handleUnlinkFaceit = async () => {
    setUnlinkingFaceit(true);
    try {
      await unlinkFaceitAccount();
      toast({ title: 'Faceit unlinked', description: 'Your Faceit account has been removed.' });
    } catch {
      toast({ title: 'Error', description: 'Failed to unlink Faceit account.', variant: 'destructive' });
    } finally {
      setUnlinkingFaceit(false);
    }
  };

  const linkDiscord = () => supabase.auth.signInWithOAuth({
    provider: 'discord',
    options: { redirectTo: window.location.href, scopes: 'identify email' },
  });

  const accounts = [
    {
      key: 'riot',
      name: 'Riot Games',
      description: riotLoading ? 'Loading...' : riotAccount
        ? `Connected as ${riotAccount.game_name}#${riotAccount.tag_line}`
        : 'Not connected — required for Valorant tournaments',
      connected: !!riotAccount,
      loading: riotLoading,
      iconClass: 'bg-red-500/10 border-red-500/20',
      icon: (
        <img src="/riot-logo.svg" alt="Riot" className="w-5 h-5"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
      ),
      onConnect: linkRiotAccount,
      onUnlink: handleUnlinkRiot,
      unlinking: unlinkingRiot,
      connectClass: 'bg-red-600 hover:bg-red-500 text-white',
    },
    {
      key: 'faceit',
      name: 'Faceit',
      description: faceitLoading ? 'Loading...' : faceitAccount
        ? `Connected as ${faceitAccount.nickname}`
        : 'Not connected — required for CS2 tournaments',
      connected: !!faceitAccount,
      loading: faceitLoading,
      iconClass: 'bg-orange-500/10 border-orange-500/20',
      icon: (
        <img src="/faceit-logo.svg" alt="Faceit" className="w-5 h-5"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
      ),
      onConnect: linkFaceitAccount,
      onUnlink: handleUnlinkFaceit,
      unlinking: unlinkingFaceit,
      connectClass: 'bg-orange-600 hover:bg-orange-500 text-white',
    },
    {
      key: 'discord',
      name: 'Discord',
      description: discordIdentity
        ? `Connected as ${discordIdentity.identity_data?.full_name || discordIdentity.identity_data?.email || 'Linked'}`
        : 'Not connected',
      connected: !!discordIdentity,
      loading: false,
      iconClass: 'bg-indigo-500/10 border-indigo-500/20',
      icon: <span className="text-indigo-400 font-bold text-xs">DC</span>,
      onConnect: linkDiscord,
      onUnlink: undefined,
      unlinking: false,
      connectClass: 'bg-[#5865F2] hover:bg-[#4752C4] text-white',
    },
  ];

  return (
    <div className="space-y-3">
      {accounts.map((acc) => (
        <div key={acc.key} className="rounded-xl border border-white/5 bg-white/[0.02] p-5 flex items-center gap-4">
          <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${acc.iconClass}`}>
            {acc.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-white text-sm">{acc.name}</div>
            <div className={`text-xs mt-0.5 ${acc.connected ? 'text-emerald-400' : 'text-gray-500'}`}>
              {acc.description}
            </div>
          </div>
          {!acc.loading && (
            acc.connected ? (
              acc.onUnlink && (
                <Button
                  size="sm"
                  variant="outline"
                  className="border-rose-500/30 text-rose-400 hover:bg-rose-500/10 shrink-0"
                  disabled={acc.unlinking}
                  onClick={acc.onUnlink}
                >
                  {acc.unlinking
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <><Link2Off className="w-3.5 h-3.5 mr-1.5" />Unlink</>
                  }
                </Button>
              )
            ) : (
              <Button
                size="sm"
                className={`shrink-0 ${acc.connectClass}`}
                onClick={acc.onConnect}
              >
                <Shield className="w-3.5 h-3.5 mr-1.5" /> Connect
              </Button>
            )
          )}
        </div>
      ))}

      {/* Steam — coming soon */}
      <div className="rounded-xl border border-white/5 bg-white/[0.02] p-5 flex items-center gap-4 opacity-40">
        <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
          <span className="text-blue-400 font-bold text-xs">ST</span>
        </div>
        <div className="flex-1">
          <div className="font-medium text-white text-sm">Steam</div>
          <div className="text-xs text-gray-500">Coming soon</div>
        </div>
        <span className="text-xs text-gray-600 border border-white/10 rounded-full px-2 py-0.5">Soon</span>
      </div>
    </div>
  );
}

// ─── Tab: My Licenses ─────────────────────────────────────────────────────────

function LicensesTab({ userId }: { userId: string | undefined }) {
  const { data: licenses, isLoading, error } = useLicenses(userId);

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-rose-400" /></div>;
  }
  if (error) {
    return (
      <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-6 text-rose-400 text-sm">
        Failed to load licenses: {(error as Error).message}
      </div>
    );
  }
  if (!licenses || licenses.length === 0) {
    return (
      <div className="rounded-xl border border-white/5 bg-white/[0.02] p-12 text-center">
        <Award className="w-10 h-10 mx-auto mb-3 text-gray-600" />
        <p className="text-gray-400 font-medium">No licenses assigned yet</p>
        <p className="text-gray-600 text-sm mt-1">Apply for a license through the verification process.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {licenses.map((lic) => (
        <div key={lic.id} className="rounded-xl border border-white/5 bg-white/[0.02] p-5 flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-sm text-white font-bold tracking-wide">{lic.license_id}</span>
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
          <div className="text-xs text-gray-500 space-y-0.5 shrink-0">
            <div>Issued: {new Date(lic.issued_at).toLocaleDateString()}</div>
            {lic.expires_at && <div>Expires: {new Date(lic.expires_at).toLocaleDateString()}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Tab: Desktop Pairing ─────────────────────────────────────────────────────

function DesktopPairingTab({ userId }: { userId: string | undefined }) {
  const { venues, loading } = useVenueSearch({ includeOwned: true });
  const ownedWithToken = venues.filter((v) => v.owner_id === userId && v.desktop_pairing_token);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-white/5 bg-white/[0.02] p-5">
        <h3 className="font-semibold text-white mb-1">Link Esportra Desktop</h3>
        <p className="text-sm text-gray-400">
          Enter the 6-character pairing token in the Desktop app (Settings → Venue Pairing) to connect your venue hub.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-rose-400" /></div>
      ) : ownedWithToken.length === 0 ? (
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-10 text-center">
          <Monitor className="w-10 h-10 mx-auto mb-3 text-gray-600" />
          <p className="text-gray-400">No published venues with pairing tokens found.</p>
          <p className="text-gray-600 text-sm mt-1">Make sure your venue is submitted and published first.</p>
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
                <span className="font-mono text-xl font-bold tracking-widest text-emerald-400">
                  {venue.desktop_pairing_token}
                </span>
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
    <div className="max-w-sm">
      <div className="rounded-xl border border-white/5 bg-white/[0.02] p-6 space-y-5">
        <div>
          <h3 className="font-semibold text-white">Change Password</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Must be at least 8 characters. Leave blank if you use a magic link.
          </p>
        </div>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-gray-400 uppercase tracking-wide">New Password</Label>
            <Input
              id="new-password" type="password" value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="bg-black/20 border-white/10 focus:border-rose-500/50 text-white"
              placeholder="••••••••" autoComplete="new-password"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-gray-400 uppercase tracking-wide">Confirm Password</Label>
            <Input
              id="confirm-password" type="password" value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="bg-black/20 border-white/10 focus:border-rose-500/50 text-white"
              placeholder="••••••••" autoComplete="new-password"
            />
            {confirmPassword && newPassword !== confirmPassword && (
              <p className="text-xs text-rose-400">Passwords do not match</p>
            )}
            {newPassword.length > 0 && newPassword.length < 8 && (
              <p className="text-xs text-yellow-400">Must be at least 8 characters</p>
            )}
          </div>
          <Button
            type="submit" disabled={!isValid || submitting}
            className="w-full bg-rose-500 hover:bg-rose-600 disabled:opacity-40"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update Password'}
          </Button>
        </form>
      </div>
    </div>
  );
}
