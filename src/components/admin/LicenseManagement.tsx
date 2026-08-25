import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { motion } from 'framer-motion';
import {
  Search, Award, Shield, ChevronLeft, ChevronRight, RefreshCw,
  Copy, Check, UserPlus, Ban, RotateCcw, Eye, Building, MapPin,
  Trophy, FileText, Loader2, Trash2
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  CommandButton,
  CommandIconButton,
  CommandPanel,
  CommandSection,
  CommandToolbar,
} from '@/components/management/CommandSurface';

// ─── Types ──────────────────────────────────────────────────────────────────

interface LicenseRow {
  id: string;
  user_id: string;
  license_id: string;
  license_type: string;
  status: string;
  issued_at: string;
  expires_at: string | null;
  notes: string | null;
  created_at: string;
  username: string;
  email: string;
  avatar_url: string | null;
  full_name: string | null;
}

interface UserDetail {
  profile: {
    id: string;
    username: string;
    email: string;
    full_name: string | null;
    avatar_url: string | null;
    is_admin: boolean;
    admin_roles: string[] | null;
    created_at: string;
  };
  licenses: { id: string; license_id: string; license_type: string; status: string; issued_at: string; expires_at: string | null; notes: string | null }[];
  user_roles: { role: string; is_active: boolean }[];
  verified_roles: { role: string; status: string; is_active: boolean; verified_at: string }[];
  organizations: { id: string; name: string; slug: string; logo_url: string | null }[];
  venues: { id: string; name: string; city: string | null; country: string | null; status: string }[];
  tournaments: { id: string; name: string; game: string; status: string }[];
}

interface ProfileSearchResult {
  id: string;
  email?: string;
  username?: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const LICENSE_TYPE_LABEL: Record<string, string> = {
  venue_owner: 'Venue Owner',
  organizer: 'Organizer',
};

// Monochrome by status: red = destructive, amber = warning, zinc = neutral.
const STATUS_STYLE: Record<string, string> = {
  active: 'border-white/40 text-white',
  revoked: 'border-red-500/35 text-red-300',
  suspended: 'border-amber-500/35 text-amber-300',
  expired: 'border-white/10 text-zinc-400',
};

const TYPE_STYLE: Record<string, string> = {
  organizer: 'border-white/40 text-white',
  venue_owner: 'border-white/15 text-zinc-300',
};

function statusClass(status: string): string {
  return `border px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider ${STATUS_STYLE[status] ?? 'border-white/10 text-zinc-400'}`;
}

const FIELD_LABEL =
  'font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500';

const INPUT_CLASS =
  '-none border border-white/10 bg-black/60 text-white placeholder:text-zinc-600 outline-none transition-colors focus-visible:border-rose-500 focus-visible:ring-rose-500/20';

function CopyBadge({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button onClick={copy} className="inline-flex items-center gap-1.5 -none border border-white/10 bg-white/[0.03] px-2 py-1 font-mono text-xs transition-colors hover:border-white/25">
      {text}
      {copied ? <Check className="h-3 w-3 text-white" /> : <Copy className="h-3 w-3 text-zinc-500" />}
    </button>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function LicenseManagement() {
  const { toast } = useToast();

  // List state
  const [licenses, setLicenses] = useState<LicenseRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 25;

  // Detail state
  const [detailUser, setDetailUser] = useState<UserDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Assign dialog
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignEmail, setAssignEmail] = useState('');
  const [assignType, setAssignType] = useState('organizer');
  const [assignLoading, setAssignLoading] = useState(false);

  // ── Fetch licenses ────────────────────────────────────────────────────────

  const fetchLicenses = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query) params.set('q', query);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (typeFilter !== 'all') params.set('type', typeFilter);
      params.set('limit', String(PAGE_SIZE));
      params.set('offset', String(page * PAGE_SIZE));

      const res = await apiClient.get<{ items: LicenseRow[]; total: number }>(
        `/api/admin/licenses?${params.toString()}`
      );
      setLicenses(res.items);
      setTotal(res.total);
    } catch (err: any) {
      toast({ title: 'Failed to load licenses', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [query, statusFilter, typeFilter, page, toast]);

  useEffect(() => { fetchLicenses(); }, [fetchLicenses]);

  // ── User detail ───────────────────────────────────────────────────────────

  const openDetail = async (userId: string) => {
    setDetailLoading(true);
    try {
      const res = await apiClient.get<UserDetail>(`/api/admin/users/${userId}/detail`);
      setDetailUser(res);
    } catch (err: any) {
      toast({ title: 'Failed to load user', description: err.message, variant: 'destructive' });
    } finally {
      setDetailLoading(false);
    }
  };

  // ── Actions ───────────────────────────────────────────────────────────────

  const revokeLicense = async (userId: string, licenseType: string) => {
    try {
      await apiClient.put(`/api/admin/licenses/${userId}/${licenseType}/revoke`, {});
      toast({ title: 'License revoked' });
      fetchLicenses();
      if (detailUser?.profile.id === userId) openDetail(userId);
    } catch (err: any) {
      toast({ title: 'Revoke failed', description: err.message, variant: 'destructive' });
    }
  };

  const reinstateLicense = async (userId: string, licenseType: string) => {
    try {
      await apiClient.put(`/api/admin/licenses/${userId}/${licenseType}/reinstate`, {});
      toast({ title: 'License reinstated' });
      fetchLicenses();
      if (detailUser?.profile.id === userId) openDetail(userId);
    } catch (err: any) {
      toast({ title: 'Reinstate failed', description: err.message, variant: 'destructive' });
    }
  };

  const deleteLicense = async (licenseId: string) => {
    if (!confirm('Delete this license permanently?')) return;
    try {
      await apiClient.delete(`/api/admin/licenses/${licenseId}`);
      toast({ title: 'License deleted' });
      fetchLicenses();
      setDetailUser(null);
    } catch (err: any) {
      toast({ title: 'Delete failed', description: err.message, variant: 'destructive' });
    }
  };

  const handleAssign = async () => {
    setAssignLoading(true);
    try {
      const email = assignEmail.trim();
      const searchResult = await apiClient.get<ProfileSearchResult[]>(
        `/api/profiles/search?q=${encodeURIComponent(email)}`
      );
      const exact = searchResult.find((p) => (p.email ?? '').toLowerCase() === email.toLowerCase());
      const user = exact ?? (searchResult.length === 1 ? searchResult[0] : null);
      if (!user?.id) throw new Error('User not found with that email.');

      await apiClient.post('/api/admin/licenses', {
        user_id: user.id,
        license_type: assignType,
      });
      toast({ title: 'License assigned', description: `${LICENSE_TYPE_LABEL[assignType]} license assigned to ${assignEmail}` });
      setAssignOpen(false);
      setAssignEmail('');
      fetchLicenses();
    } catch (err: any) {
      toast({ title: 'Assign failed', description: err.message, variant: 'destructive' });
    } finally {
      setAssignLoading(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <CommandToolbar>
        <p className={`tabular-nums ${FIELD_LABEL}`}>
          {total} license{total !== 1 ? 's' : ''} total
        </p>
        <div className="flex gap-2">
          <CommandButton variant="ghost" size="sm" onClick={fetchLicenses}>
            <RefreshCw className="h-4 w-4" /> Refresh
          </CommandButton>
          <CommandButton size="sm" onClick={() => setAssignOpen(true)}>
            <UserPlus className="h-4 w-4" /> Assign License
          </CommandButton>
        </div>
      </CommandToolbar>

      {/* License Perks Reference */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <CommandPanel>
          <div className="mb-2 flex items-center gap-2">
            <Trophy className="h-4 w-4 text-white" />
            <span className="text-sm font-semibold text-white">Organizer (ESP-OR)</span>
            <span className={`${FIELD_LABEL} ml-auto`}>Tier I</span>
          </div>
          <ul className="space-y-1 text-xs text-zinc-400">
            <li>• Create &amp; manage tournaments</li>
            <li>• Set entry fees &amp; prize pools</li>
            <li>• Access bracket &amp; match management</li>
            <li>• Dispute resolution tools</li>
            <li>• Organizer analytics dashboard</li>
            <li>• Custom organizer profile page</li>
          </ul>
        </CommandPanel>
        <CommandPanel>
          <div className="mb-2 flex items-center gap-2">
            <Building className="h-4 w-4 text-zinc-300" />
            <span className="text-sm font-semibold text-zinc-200">Venue Owner (ESP-VO)</span>
            <span className={`${FIELD_LABEL} ml-auto`}>Tier II</span>
          </div>
          <ul className="space-y-1 text-xs text-zinc-400">
            <li>• List &amp; manage gaming venues</li>
            <li>• Booking management system</li>
            <li>• Station &amp; availability control</li>
            <li>• Venue impression analytics</li>
            <li>• Desktop pairing for live status</li>
            <li>• Appear in "Near Me" search</li>
          </ul>
        </CommandPanel>
      </div>

      {/* Filters */}
      <CommandToolbar>
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-600" />
          <input
            placeholder="Search by name, email, or license ID..."
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(0); }}
            className={`w-full py-1.5 pl-9 pr-3 text-xs ${INPUT_CLASS}`}
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
          <SelectTrigger className="w-[140px] -none border-white/10 bg-black/60 font-mono text-[11px] uppercase tracking-wider text-zinc-300">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="-none border-white/10 bg-[#0a0a0c] text-zinc-300">
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="revoked">Revoked</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(0); }}>
          <SelectTrigger className="w-[160px] -none border-white/10 bg-black/60 font-mono text-[11px] uppercase tracking-wider text-zinc-300">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent className="-none border-white/10 bg-[#0a0a0c] text-zinc-300">
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="organizer">Organizer</SelectItem>
            <SelectItem value="venue_owner">Venue Owner</SelectItem>
          </SelectContent>
        </Select>
      </CommandToolbar>

      {/* Table */}
      <CommandSection className="p-0">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-zinc-600" /></div>
        ) : licenses.length === 0 ? (
          <div className="py-16 text-center text-zinc-500">
            <Award className="mx-auto mb-3 h-10 w-10 opacity-40" />
            <p className={FIELD_LABEL}>No licenses found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-black/40 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">License ID</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Issued</th>
                  <th className="px-4 py-3">Expires</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {licenses.map((lic) => (
                  <motion.tr
                    key={lic.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="transition-colors hover:bg-white/[0.03]"
                  >
                    <td className="px-4 py-3">
                      <button onClick={() => openDetail(lic.user_id)} className="flex items-center gap-2 text-left transition-colors hover:text-rose-300">
                        {lic.avatar_url ? (
                          <img src={lic.avatar_url} className="h-7 w-7 rounded-full object-cover" alt="" />
                        ) : (
                          <div className="flex h-7 w-7 items-center justify-center -none border border-white/10 bg-black/40 font-mono text-xs text-zinc-400">
                            {(lic.username?.[0] || '?').toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="text-xs font-medium text-white">{lic.username || 'Unknown'}</div>
                          <div className="font-mono text-[11px] text-zinc-500">{lic.email}</div>
                        </div>
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <CopyBadge text={lic.license_id} />
                    </td>
                    <td className="px-4 py-3">
                      <span className={TYPE_STYLE[lic.license_type] ? `border px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider ${TYPE_STYLE[lic.license_type]}` : ''}>
                        {LICENSE_TYPE_LABEL[lic.license_type] ?? lic.license_type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={statusClass(lic.status)}>
                        {lic.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs tabular-nums text-zinc-400">
                      {lic.issued_at ? new Date(lic.issued_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs tabular-nums text-zinc-400">
                      {lic.expires_at ? new Date(lic.expires_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <CommandIconButton label="View details" variant="ghost" className="h-8 w-8 text-zinc-500 hover:text-white" onClick={() => openDetail(lic.user_id)}>
                          <Eye className="h-3.5 w-3.5" />
                        </CommandIconButton>
                        {lic.status === 'active' ? (
                          <CommandIconButton label="Revoke license" variant="danger" className="h-8 w-8" onClick={() => revokeLicense(lic.user_id, lic.license_type)}>
                            <Ban className="h-3.5 w-3.5" />
                          </CommandIconButton>
                        ) : (
                          <CommandIconButton label="Reinstate license" variant="ghost" className="h-8 w-8 text-zinc-500 hover:text-white" onClick={() => reinstateLicense(lic.user_id, lic.license_type)}>
                            <RotateCcw className="h-3.5 w-3.5" />
                          </CommandIconButton>
                        )}
                        <CommandIconButton label="Delete license" variant="danger" className="h-8 w-8" onClick={() => deleteLicense(lic.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </CommandIconButton>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-white/10 px-4 py-3 text-xs text-zinc-400">
            <span className={`tabular-nums ${FIELD_LABEL}`}>Page {page + 1} of {totalPages}</span>
            <div className="flex gap-1">
              <CommandIconButton label="Previous page" variant="ghost" disabled={page === 0} onClick={() => setPage(p => p - 1)} className="h-8 w-8">
                <ChevronLeft className="h-4 w-4" />
              </CommandIconButton>
              <CommandIconButton label="Next page" variant="ghost" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} className="h-8 w-8">
                <ChevronRight className="h-4 w-4" />
              </CommandIconButton>
            </div>
          </div>
        )}
      </CommandSection>

      {/* ── Assign License Dialog ──────────────────────────────────────────── */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="max-w-md -none border border-white/10 bg-[#0a0a0c] text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-rose-400" /> Assign License
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className={`mb-1 block ${FIELD_LABEL}`}>User Email</label>
              <Input
                placeholder="user@example.com"
                value={assignEmail}
                onChange={(e) => setAssignEmail(e.target.value)}
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label className={`mb-1 block ${FIELD_LABEL}`}>License Type</label>
              <Select value={assignType} onValueChange={setAssignType}>
                <SelectTrigger className="w-full -none border-white/10 bg-black/60 font-mono text-[11px] uppercase tracking-wider text-zinc-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="-none border-white/10 bg-[#0a0a0c] text-zinc-300">
                  <SelectItem value="organizer">Organizer (ESP-OR)</SelectItem>
                  <SelectItem value="venue_owner">Venue Owner (ESP-VO)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <CommandButton variant="ghost" size="sm" onClick={() => setAssignOpen(false)}>Cancel</CommandButton>
            <CommandButton size="sm" onClick={handleAssign} disabled={!assignEmail || assignLoading}>
              {assignLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              Assign
            </CommandButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── User Detail Dialog ─────────────────────────────────────────────── */}
      <Dialog open={!!detailUser || detailLoading} onOpenChange={(open) => { if (!open) setDetailUser(null); }}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto overscroll-contain -none border border-white/10 bg-[#0a0a0c] text-white" data-lenis-prevent>
          <DialogHeader className="sr-only">
            <DialogTitle>User details</DialogTitle>
          </DialogHeader>
          {detailLoading && !detailUser ? (
            <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-zinc-600" /></div>
          ) : detailUser ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  {detailUser.profile.avatar_url ? (
                    <img src={detailUser.profile.avatar_url} className="h-10 w-10 rounded-full object-cover" alt="" />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center -none border border-white/10 bg-black/40 font-mono text-lg text-zinc-400">
                      {(detailUser.profile.username?.[0] || '?').toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className="text-lg font-semibold">{detailUser.profile.full_name || detailUser.profile.username}</div>
                    <div className="font-mono text-xs font-normal text-zinc-400">@{detailUser.profile.username} · {detailUser.profile.email}</div>
                  </div>
                </DialogTitle>
              </DialogHeader>

              <div className="mt-4 space-y-5">
                {/* Profile Meta */}
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="-none border border-white/10 bg-white/[0.03] px-2 py-1 font-mono text-zinc-300">Joined {new Date(detailUser.profile.created_at).toLocaleDateString()}</span>
                  {detailUser.profile.is_admin && (
                    <span className="-none border border-amber-500/35 px-2 py-1 font-mono text-amber-300">Admin</span>
                  )}
                  {detailUser.profile.admin_roles?.map(r => (
                    <span key={r} className="-none border border-rose-500/30 px-2 py-1 font-mono text-rose-300">{r}</span>
                  ))}
                </div>

                {/* Licenses */}
                <Section icon={<Award className="h-4 w-4 text-zinc-400" />} title="Licenses" count={detailUser.licenses.length}>
                  {detailUser.licenses.length === 0 ? (
                    <p className={`text-xs ${FIELD_LABEL}`}>No licenses assigned.</p>
                  ) : (
                    <div className="space-y-2">
                      {detailUser.licenses.map(lic => (
                        <div key={lic.id} className="flex items-center justify-between -none border border-white/10 bg-white/[0.025] px-3 py-2">
                          <div className="flex items-center gap-3">
                            <CopyBadge text={lic.license_id} />
                            <span className="font-mono text-xs uppercase tracking-wider text-zinc-300">{LICENSE_TYPE_LABEL[lic.license_type] ?? lic.license_type}</span>
                            <span className={statusClass(lic.status)}>{lic.status}</span>
                          </div>
                          <div className="flex gap-1">
                            {lic.status === 'active' ? (
                              <CommandButton variant="danger" size="sm" onClick={() => revokeLicense(detailUser.profile.id, lic.license_type)}>Revoke</CommandButton>
                            ) : (
                              <CommandButton variant="ghost" size="sm" onClick={() => reinstateLicense(detailUser.profile.id, lic.license_type)}>Reinstate</CommandButton>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Section>

                {/* Roles */}
                <Section icon={<Shield className="h-4 w-4 text-zinc-400" />} title="User Roles" count={detailUser.user_roles.length}>
                  {detailUser.user_roles.length === 0 ? (
                    <p className={`text-xs ${FIELD_LABEL}`}>No roles.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {detailUser.user_roles.map(r => (
                        <span key={r.role} className={`-none border px-2 py-1 font-mono text-xs ${r.is_active ? 'border-white/25 text-white' : 'border-white/10 text-zinc-500 line-through'}`}>
                          {r.role} {!r.is_active && '(inactive)'}
                        </span>
                      ))}
                    </div>
                  )}
                </Section>

                {/* Verified Roles */}
                <Section icon={<FileText className="h-4 w-4 text-zinc-400" />} title="Verified Roles" count={detailUser.verified_roles.length}>
                  {detailUser.verified_roles.length === 0 ? (
                    <p className={`text-xs ${FIELD_LABEL}`}>No verification records.</p>
                  ) : (
                    <div className="divide-y divide-white/5 border border-white/10 bg-white/[0.025] px-3">
                      {detailUser.verified_roles.map(v => (
                        <div key={v.role} className="flex flex-wrap items-center gap-3 py-2 text-xs">
                          <span className={`border px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider ${TYPE_STYLE[v.role] ?? 'border-white/15 text-zinc-300'}`}>
                            {LICENSE_TYPE_LABEL[v.role] ?? v.role}
                          </span>
                          <span className={statusClass(v.status)}>{v.status}</span>
                          {v.verified_at && <span className="font-mono text-zinc-500">verified {new Date(v.verified_at).toLocaleDateString()}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </Section>

                {/* Organizations */}
                {detailUser.organizations.length > 0 && (
                  <Section icon={<Building className="h-4 w-4 text-zinc-400" />} title="Organizations" count={detailUser.organizations.length}>
                    <div className="divide-y divide-white/5 border border-white/10 bg-white/[0.025] px-3">
                      {detailUser.organizations.map(o => (
                        <div key={o.id} className="flex items-center gap-2 py-2 text-xs">
                          {o.logo_url && <img src={o.logo_url} className="h-5 w-5 -none border border-white/10" alt="" />}
                          <span className="font-medium text-white">{o.name}</span>
                          <span className="font-mono text-zinc-500">/{o.slug}</span>
                        </div>
                      ))}
                    </div>
                  </Section>
                )}

                {/* Venues */}
                {detailUser.venues.length > 0 && (
                  <Section icon={<MapPin className="h-4 w-4 text-zinc-400" />} title="Venues" count={detailUser.venues.length}>
                    <div className="divide-y divide-white/5 border border-white/10 bg-white/[0.025] px-3">
                      {detailUser.venues.map(v => (
                        <div key={v.id} className="flex flex-wrap items-center gap-2 py-2 text-xs">
                          <span className="font-medium text-white">{v.name}</span>
                          {v.city && <span className="text-zinc-500">{v.city}, {v.country}</span>}
                          <span className={`px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider ${v.status === 'published' ? 'text-white' : 'text-zinc-500'}`}>{v.status}</span>
                        </div>
                      ))}
                    </div>
                  </Section>
                )}

                {/* Tournaments */}
                {detailUser.tournaments.length > 0 && (
                  <Section icon={<Trophy className="h-4 w-4 text-zinc-400" />} title="Tournaments" count={detailUser.tournaments.length}>
                    <div className="divide-y divide-white/5 border border-white/10 bg-white/[0.025] px-3">
                      {detailUser.tournaments.map(t => (
                        <div key={t.id} className="flex flex-wrap items-center gap-2 py-2 text-xs">
                          <span className="font-medium text-white">{t.name}</span>
                          <span className="font-mono text-zinc-500">{t.game}</span>
                          <span className={`px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider ${t.status === 'published' ? 'text-white' : t.status === 'completed' ? 'text-zinc-300' : 'text-zinc-500'}`}>{t.status}</span>
                        </div>
                      ))}
                    </div>
                  </Section>
                )}
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Section wrapper ────────────────────────────────────────────────────────

function Section({ icon, title, count, children }: { icon: React.ReactNode; title: string; count: number; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        {icon}
        <span className={FIELD_LABEL}>{title}</span>
        <span className="-none border border-white/10 bg-black/40 px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-zinc-500">{count}</span>
      </div>
      {children}
    </div>
  );
}
