import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useLicenses } from '@/hooks/useLicenses';
import { useFaceitAccount } from '@/hooks/useFaceitAccount';
import { useVenueSearch } from '@/hooks/useVenueSearch';
import { Loader2, Copy, Check, Shield, Link2, Award, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Footer from '@/components/Footer';

// ─── Copy Button ────────────────────────────────────────────────────────────

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast({ description: `${label ?? text} copied to clipboard` });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: 'Copy failed', variant: 'destructive' });
    }
  };
  return (
    <button
      onClick={handleCopy}
      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
      title="Copy"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

// ─── License type badge ──────────────────────────────────────────────────────

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

// ─── Tabs ────────────────────────────────────────────────────────────────────

type Tab = 'licenses' | 'desktop_pairing' | 'connected_accounts' | 'security';

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: 'licenses', label: 'My Licenses', icon: <Award className="w-4 h-4" /> },
  { key: 'desktop_pairing', label: 'Desktop Pairing', icon: <Monitor className="w-4 h-4" /> },
  { key: 'connected_accounts', label: 'Connected Accounts', icon: <Link2 className="w-4 h-4" /> },
  { key: 'security', label: 'Security', icon: <Shield className="w-4 h-4" /> },
];

// ─── AccountSettings Page ────────────────────────────────────────────────────

export default function AccountSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<Tab>('licenses');

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <main className="container mx-auto px-4 py-10 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Account Settings</h1>
          <p className="text-gray-500 text-sm mt-1">{user?.email}</p>
        </div>

        {/* Tab Bar */}
        <div className="flex gap-1 bg-white/5 p-1 rounded-xl mb-8 overflow-x-auto">
          {TABS.map((tab) => (
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

        {/* Tab Content */}
        {activeTab === 'licenses' && <LicensesTab userId={user?.id} />}
        {activeTab === 'desktop_pairing' && <DesktopPairingTab userId={user?.id} />}
        {activeTab === 'connected_accounts' && <ConnectedAccountsTab />}
        {activeTab === 'security' && <SecurityTab />}
      </main>
      <Footer />
    </div>
  );
}

// ─── Tab: My Licenses ────────────────────────────────────────────────────────

function LicensesTab({ userId }: { userId: string | undefined }) {
  const { data: licenses, isLoading, error } = useLicenses(userId);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-rose-400" />
      </div>
    );
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
        <p className="text-gray-600 text-sm mt-1">
          Apply for a license through the verification process.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {licenses.map((lic) => (
        <div
          key={lic.id}
          className="rounded-xl border border-white/5 bg-white/[0.02] p-5 flex flex-col md:flex-row md:items-center gap-4"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-sm text-white font-bold tracking-wide">
                {lic.license_id}
              </span>
              <CopyButton text={lic.license_id} label="License ID" />
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                {LICENSE_TYPE_LABEL[lic.license_type] ?? lic.license_type}
              </span>
              <span
                className={`px-2 py-0.5 rounded-full border ${LICENSE_STATUS_CLASS[lic.status] ?? 'bg-white/5 text-white border-white/10'}`}
              >
                {lic.status.charAt(0).toUpperCase() + lic.status.slice(1)}
              </span>
            </div>
          </div>
          <div className="text-xs text-gray-500 space-y-0.5 shrink-0">
            <div>Issued: {new Date(lic.issued_at).toLocaleDateString()}</div>
            {lic.expires_at && (
              <div>Expires: {new Date(lic.expires_at).toLocaleDateString()}</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Tab: Desktop Pairing ────────────────────────────────────────────────────

function DesktopPairingTab({ userId }: { userId: string | undefined }) {
  const { venues, loading } = useVenueSearch({ includeOwned: true });

  // Filter to venues owned by this user that have a pairing token
  const ownedWithToken = venues.filter(
    (v) => v.owner_id === userId && v.desktop_pairing_token,
  );

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-white/5 bg-white/[0.02] p-5">
        <h3 className="font-semibold text-white mb-1">Link Esportra Desktop</h3>
        <p className="text-sm text-gray-400">
          Enter the 6-character pairing token below on the Desktop app (Settings → Venue Pairing)
          to connect your venue's desktop hub.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-rose-400" />
        </div>
      ) : ownedWithToken.length === 0 ? (
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-10 text-center">
          <Monitor className="w-10 h-10 mx-auto mb-3 text-gray-600" />
          <p className="text-gray-400">No published venues with pairing tokens found.</p>
          <p className="text-gray-600 text-sm mt-1">
            Make sure your venue is submitted and published first.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {ownedWithToken.map((venue) => (
            <div
              key={venue.id}
              className="rounded-xl border border-white/5 bg-white/[0.02] p-5 flex items-center justify-between gap-4"
            >
              <div>
                <div className="font-medium text-white text-sm">{venue.name}</div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {venue.city}, {venue.country}
                  {venue.venue_id && (
                    <span className="ml-2 font-mono text-gray-600">{venue.venue_id}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="font-mono text-xl font-bold tracking-widest text-emerald-400">
                  {venue.desktop_pairing_token}
                </span>
                <CopyButton
                  text={venue.desktop_pairing_token!}
                  label="Pairing token"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Tab: Connected Accounts ─────────────────────────────────────────────────

function ConnectedAccountsTab() {
  const { faceitAccount, isLoading, linkFaceitAccount, unlinkFaceitAccount } = useFaceitAccount();
  const { toast } = useToast();
  const [unlinking, setUnlinking] = useState(false);

  const handleUnlink = async () => {
    setUnlinking(true);
    try {
      await unlinkFaceitAccount();
      toast({ description: 'Faceit account unlinked.' });
    } catch {
      toast({ title: 'Error', description: 'Failed to unlink.', variant: 'destructive' });
    } finally {
      setUnlinking(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Faceit */}
      <div className="rounded-xl border border-white/5 bg-white/[0.02] p-5 flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0">
          <span className="text-orange-400 font-bold text-xs">FC</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-white text-sm">Faceit</div>
          {isLoading ? (
            <div className="text-xs text-gray-500">Loading...</div>
          ) : faceitAccount ? (
            <div className="text-xs text-emerald-400">
              Connected as <span className="font-medium">{faceitAccount.nickname}</span>
            </div>
          ) : (
            <div className="text-xs text-gray-500">Not connected</div>
          )}
        </div>
        {!isLoading && (
          faceitAccount ? (
            <Button
              size="sm"
              variant="outline"
              className="border-rose-500/30 text-rose-400 hover:bg-rose-500/10"
              disabled={unlinking}
              onClick={handleUnlink}
            >
              {unlinking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Unlink'}
            </Button>
          ) : (
            <Button
              size="sm"
              className="bg-orange-500 hover:bg-orange-600 text-white"
              onClick={linkFaceitAccount}
            >
              Connect
            </Button>
          )
        )}
      </div>

      {/* Steam — coming soon */}
      <div className="rounded-xl border border-white/5 bg-white/[0.02] p-5 flex items-center gap-4 opacity-50">
        <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
          <span className="text-blue-400 font-bold text-xs">ST</span>
        </div>
        <div className="flex-1">
          <div className="font-medium text-white text-sm">Steam</div>
          <div className="text-xs text-gray-500">Coming soon</div>
        </div>
        <span className="text-xs text-gray-600 border border-white/10 rounded-full px-2 py-0.5">
          Soon
        </span>
      </div>

      {/* Discord — coming soon */}
      <div className="rounded-xl border border-white/5 bg-white/[0.02] p-5 flex items-center gap-4 opacity-50">
        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
          <span className="text-indigo-400 font-bold text-xs">DC</span>
        </div>
        <div className="flex-1">
          <div className="font-medium text-white text-sm">Discord</div>
          <div className="text-xs text-gray-500">Coming soon</div>
        </div>
        <span className="text-xs text-gray-600 border border-white/10 rounded-full px-2 py-0.5">
          Soon
        </span>
      </div>
    </div>
  );
}

// ─── Tab: Security ───────────────────────────────────────────────────────────

function SecurityTab() {
  const { toast } = useToast();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isValid =
    newPassword.length >= 8 &&
    newPassword === confirmPassword;

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
            <Label htmlFor="new-password" className="text-xs text-gray-400 uppercase tracking-wide">
              New Password
            </Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="bg-black/20 border-white/10 focus:border-rose-500/50 text-white"
              placeholder="••••••••"
              autoComplete="new-password"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirm-password" className="text-xs text-gray-400 uppercase tracking-wide">
              Confirm Password
            </Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="bg-black/20 border-white/10 focus:border-rose-500/50 text-white"
              placeholder="••••••••"
              autoComplete="new-password"
            />
            {confirmPassword && newPassword !== confirmPassword && (
              <p className="text-xs text-rose-400">Passwords do not match</p>
            )}
            {newPassword.length > 0 && newPassword.length < 8 && (
              <p className="text-xs text-yellow-400">Must be at least 8 characters</p>
            )}
          </div>

          <Button
            type="submit"
            disabled={!isValid || submitting}
            className="w-full bg-rose-500 hover:bg-rose-600 disabled:opacity-40"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update Password'}
          </Button>
        </form>
      </div>
    </div>
  );
}
