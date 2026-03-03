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
  User, Share2, Save, Globe, Gamepad2,
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

// ─── Nav items ────────────────────────────────────────────────────────────────

type Tab = 'profile' | 'connected_accounts' | 'licenses' | 'desktop_pairing' | 'security';

interface NavItem { key: Tab; label: string; icon: React.ReactNode; description: string; venueOwnerOnly?: boolean }

const NAV: NavItem[] = [
  { key: 'profile',            label: 'Profile',            description: 'Avatar, bio, social links',              icon: <User className="w-4 h-4" /> },
  { key: 'connected_accounts', label: 'Connected Accounts', description: 'Riot, Faceit, Discord',                  icon: <Link2 className="w-4 h-4" /> },
  { key: 'licenses',           label: 'My Licenses',        description: 'Professional license IDs',               icon: <Award className="w-4 h-4" /> },
  { key: 'desktop_pairing',    label: 'Desktop Pairing',    description: 'Venue hub pairing tokens', venueOwnerOnly: true, icon: <Monitor className="w-4 h-4" /> },
  { key: 'security',           label: 'Security',           description: 'Password & account safety',               icon: <Shield className="w-4 h-4" /> },
];

// ─── AccountSettings ──────────────────────────────────────────────────────────

export default function AccountSettings() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  // Show Desktop Pairing to anyone who actually owns at least one venue
  const [ownsVenues, setOwnsVenues] = useState(false);
  useEffect(() => {
    if (!user?.id) return;
    supabase.from('venues').select('id').eq('owner_id', user.id).limit(1)
      .then(({ data }) => setOwnsVenues((data?.length ?? 0) > 0));
  }, [user?.id]);

  // Handle Riot / Faceit OAuth callbacks that redirect back to this page
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    // ── Riot secure callback ──
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
        toast({ title: 'Riot Account Linked!' });
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
          <aside className="w-56 shrink-0">
            <nav className="space-y-0.5">
              {visibleNav.map((item) => (
                <button
                  key={item.key}
                  onClick={() => setActiveTab(item.key)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-left transition-all ${
                    activeTab === item.key
                      ? 'bg-rose-500/10 text-rose-400 font-medium'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span className={activeTab === item.key ? 'text-rose-400' : 'text-gray-600'}>
                    {item.icon}
                  </span>
                  {item.label}
                </button>
              ))}
            </nav>
          </aside>

          {/* ── Content ── */}
          <div className="flex-1 min-w-0">
            {/* Section heading */}
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-white">{activeItem?.label}</h2>
              <p className="text-sm text-gray-500">{activeItem?.description}</p>
            </div>

            {activeTab === 'profile'            && <ProfileTab />}
            {activeTab === 'connected_accounts' && <ConnectedAccountsTab />}
            {activeTab === 'licenses'           && <LicensesTab userId={user?.id} />}
            {activeTab === 'desktop_pairing'    && ownsVenues && <DesktopPairingTab userId={user?.id} />}
            {activeTab === 'security'           && <SecurityTab />}
          </div>
        </div>
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
  const [teamName, setTeamName] = useState<string | null>(null);
  const [form, setForm] = useState({
    username: '',
    full_name: '',
    bio: '',
    avatar_url: '',
    card_image_url: '',
    country_code: '',
    social_links: { twitter: '', twitch: '', youtube: '', instagram: '' },
  });

  // Fetch team membership (needed for player card upload path)
  useEffect(() => {
    if (!profile?.id) return;
    supabase
      .from('team_members')
      .select('team:teams(name)')
      .eq('user_id', profile.id)
      .eq('is_active', true)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.team) setTeamName((data.team as any).name);
      });
  }, [profile?.id]);

  useEffect(() => {
    if (!profile) return;
    setForm({
      username: profile.username || '',
      full_name: profile.full_name || '',
      bio: profile.bio || '',
      avatar_url: profile.avatar_url || '',
      card_image_url: profile.card_image_url || '',
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
        card_image_url: form.card_image_url,
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
    <div className="space-y-6 max-w-2xl">
      {/* Avatar & Player Card */}
      <section className="rounded-xl border border-white/5 bg-white/[0.02] p-6">
        <h3 className="text-sm font-medium text-gray-300 mb-5">Profile Pictures</h3>

        <div className="flex flex-col sm:flex-row gap-8">
          {/* Avatar */}
          <div className="flex flex-col items-center gap-2">
            <AvatarUploader
              value={form.avatar_url}
              onChange={(url) => setForm(prev => ({ ...prev, avatar_url: url }))}
              size="xl"
              uploadPath={profile.id ? `profile-pictures/${profile.id}_${Date.now()}_avatar.png` : undefined}
            />
            <span className="text-xs text-gray-600">Avatar</span>
          </div>

          {/* Player Card */}
          <div className="flex flex-col items-center gap-2">
            {teamName ? (
              <AvatarUploader
                value={form.card_image_url}
                onChange={(url) => setForm(prev => ({ ...prev, card_image_url: url }))}
                size="xl"
                uploadPath={profile.id
                  ? `Player-cards/${teamName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}/${profile.id}_${Date.now()}_card.png`
                  : undefined}
              />
            ) : (
              <div className="w-24 h-24 rounded-xl bg-white/[0.02] border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-1">
                <Gamepad2 className="w-5 h-5 text-gray-700" />
                <span className="text-[10px] text-gray-700 text-center leading-tight px-1">Join a team first</span>
              </div>
            )}
            <span className="text-xs text-gray-600">Player Card</span>
          </div>

          <div className="flex-1 flex items-center">
            <p className="text-xs text-gray-500 leading-relaxed">
              Your <span className="text-gray-400">avatar</span> is shown across the platform.
              Your <span className="text-gray-400">player card</span> appears on your team's roster —
              you must be part of a team to upload one.
            </p>
          </div>
        </div>
      </section>

      {/* Basic Info */}
      <section className="rounded-xl border border-white/5 bg-white/[0.02] p-6 space-y-4">
        <h3 className="text-sm font-medium text-gray-300">Basic Info</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-gray-500 uppercase tracking-wide">Username</Label>
            <Input
              value={form.username}
              onChange={(e) => setForm(prev => ({ ...prev, username: e.target.value }))}
              className="bg-black/20 border-white/10 focus:border-rose-500/50 text-white"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-gray-500 uppercase tracking-wide">Display Name</Label>
            <Input
              value={form.full_name}
              onChange={(e) => setForm(prev => ({ ...prev, full_name: e.target.value }))}
              className="bg-black/20 border-white/10 focus:border-rose-500/50 text-white"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-gray-500 uppercase tracking-wide">Bio</Label>
          <Textarea
            value={form.bio}
            onChange={(e) => setForm(prev => ({ ...prev, bio: e.target.value }))}
            className="bg-black/20 border-white/10 focus:border-rose-500/50 text-white min-h-[90px]"
            placeholder="Tell the community about yourself..."
          />
        </div>

        {/* Country */}
        <div className="space-y-1.5">
          <Label className="text-xs text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5" /> Country
          </Label>
          <div className="flex items-center gap-3 px-3 py-2.5 bg-black/20 border border-white/10 rounded-lg">
            {form.country_code ? (
              <>
                <img src={getCountryFlagUrl(form.country_code)} alt="" className="w-6 h-4 object-cover rounded border border-white/10" />
                <span className="text-sm text-white flex-1">{getCountryName(form.country_code)}</span>
                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-gray-500 hover:text-white"
                  onClick={() => setShowCountrySelector(true)}>
                  Change
                </Button>
              </>
            ) : detecting ? (
              <div className="flex items-center gap-2 text-gray-500 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" /> Detecting location...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-gray-500 text-sm flex-1">{detectionFailed ? 'Detection failed' : 'Not set'}</span>
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
                  <SelectItem key={c.code} value={c.code}>{getCountryFlag(c.code)} {c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </section>

      {/* Social Links */}
      <section className="rounded-xl border border-white/5 bg-white/[0.02] p-6 space-y-4">
        <h3 className="text-sm font-medium text-gray-300 flex items-center gap-2">
          <Share2 className="w-3.5 h-3.5" /> Social Links
        </h3>
        {([
          { key: 'twitter',   prefix: '@',              placeholder: 'username' },
          { key: 'twitch',    prefix: 'twitch.tv/',     placeholder: 'channel' },
          { key: 'youtube',   prefix: 'youtube.com/',   placeholder: '@channel' },
          { key: 'instagram', prefix: 'instagram.com/', placeholder: 'username' },
        ] as const).map(({ key, prefix, placeholder }) => (
          <div key={key} className="space-y-1.5">
            <Label className="text-xs text-gray-500 uppercase tracking-wide capitalize">{key}</Label>
            <div className="flex rounded-lg overflow-hidden">
              <span className="inline-flex items-center px-3 border border-r-0 border-white/10 bg-white/5 text-gray-500 text-sm whitespace-nowrap">
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
      </section>

      <div className="flex justify-end pt-2">
        <Button onClick={handleSave} disabled={saving} className="bg-rose-500 hover:bg-rose-600 disabled:opacity-40 px-8">
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
      toast({ title: 'Riot unlinked' });
    } catch {
      toast({ title: 'Error', description: 'Failed to unlink Riot account.', variant: 'destructive' });
    } finally { setUnlinkingRiot(false); }
  };

  const handleUnlinkFaceit = async () => {
    setUnlinkingFaceit(true);
    try {
      await unlinkFaceitAccount();
      toast({ title: 'Faceit unlinked' });
    } catch {
      toast({ title: 'Error', description: 'Failed to unlink Faceit account.', variant: 'destructive' });
    } finally { setUnlinkingFaceit(false); }
  };

  const linkDiscord = () => supabase.auth.signInWithOAuth({
    provider: 'discord',
    options: { redirectTo: window.location.href, scopes: 'identify email' },
  });

  const accounts = [
    {
      key: 'riot', name: 'Riot Games',
      description: riotLoading ? 'Loading...' : riotAccount
        ? `${riotAccount.game_name}#${riotAccount.tag_line}`
        : 'Required for Valorant tournament registration',
      connected: !!riotAccount, loading: riotLoading,
      iconBg: 'bg-red-500/10 border-red-500/20',
      icon: <img src="/riot-logo.svg" alt="Riot" className="w-5 h-5" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />,
      onConnect: linkRiotAccount, onUnlink: handleUnlinkRiot, unlinking: unlinkingRiot,
      connectClass: 'bg-red-600 hover:bg-red-500',
    },
    {
      key: 'faceit', name: 'Faceit',
      description: faceitLoading ? 'Loading...' : faceitAccount
        ? faceitAccount.nickname
        : 'Required for CS2 tournament registration',
      connected: !!faceitAccount, loading: faceitLoading,
      iconBg: 'bg-orange-500/10 border-orange-500/20',
      icon: <img src="/faceit-logo.svg" alt="Faceit" className="w-5 h-5" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />,
      onConnect: linkFaceitAccount, onUnlink: handleUnlinkFaceit, unlinking: unlinkingFaceit,
      connectClass: 'bg-orange-600 hover:bg-orange-500',
    },
    {
      key: 'discord', name: 'Discord',
      description: discordIdentity
        ? discordIdentity.identity_data?.full_name || discordIdentity.identity_data?.email || 'Linked'
        : 'Link your Discord account',
      connected: !!discordIdentity, loading: false,
      iconBg: 'bg-indigo-500/10 border-indigo-500/20',
      icon: <span className="text-indigo-400 font-bold text-xs">DC</span>,
      onConnect: linkDiscord, onUnlink: undefined, unlinking: false,
      connectClass: 'bg-[#5865F2] hover:bg-[#4752C4]',
    },
  ];

  return (
    <div className="space-y-3 max-w-2xl">
      {accounts.map((acc) => (
        <div key={acc.key} className="rounded-xl border border-white/5 bg-white/[0.02] p-4 flex items-center gap-4">
          <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${acc.iconBg}`}>
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
                  className="border-rose-500/30 text-rose-400 hover:bg-rose-500/10 shrink-0"
                  disabled={acc.unlinking} onClick={acc.onUnlink}>
                  {acc.unlinking
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <><Link2Off className="w-3.5 h-3.5 mr-1.5" />Unlink</>}
                </Button>
              )
            ) : (
              <Button size="sm" className={`shrink-0 text-white ${acc.connectClass}`} onClick={acc.onConnect}>
                <Shield className="w-3.5 h-3.5 mr-1.5" /> Connect
              </Button>
            )
          )}
        </div>
      ))}

      {/* Steam — coming soon */}
      <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 flex items-center gap-4 opacity-40">
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
