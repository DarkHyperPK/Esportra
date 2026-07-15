import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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

const STATUS_STYLE: Record<string, string> = {
  active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  revoked: 'bg-red-500/10 text-red-400 border-red-500/20',
  suspended: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  expired: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
};

function CopyBadge({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button onClick={copy} className="inline-flex items-center gap-1.5 font-mono text-xs bg-white/5 px-2 py-1 rounded-md hover:bg-white/10 transition-colors">
      {text}
      {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-zinc-500" />}
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Award className="w-5 h-5 text-rose-400" /> License Management
          </h2>
          <p className="text-sm text-zinc-400 mt-1">{total} license{total !== 1 ? 's' : ''} total</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchLicenses} className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
            <RefreshCw className="w-4 h-4 mr-1" /> Refresh
          </Button>
<Button size="sm" onClick={() => setAssignOpen(true)} className="bg-rose-600 hover:bg-rose-700 text-white">
            <UserPlus className="w-4 h-4 mr-1" /> Assign License
          </Button>
        </div>
      </div>

      {/* License Perks Reference */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-semibold text-purple-300">Organizer (ESP-OR)</span>
          </div>
          <ul className="text-xs text-zinc-400 space-y-1">
            <li>• Create &amp; manage tournaments</li>
            <li>• Set entry fees &amp; prize pools</li>
            <li>• Access bracket &amp; match management</li>
            <li>• Dispute resolution tools</li>
            <li>• Organizer analytics dashboard</li>
            <li>• Custom organizer profile page</li>
          </ul>
        </div>
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Building className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-semibold text-emerald-300">Venue Owner (ESP-VO)</span>
          </div>
          <ul className="text-xs text-zinc-400 space-y-1">
            <li>• List &amp; manage gaming venues</li>
            <li>• Booking management system</li>
            <li>• Station &amp; availability control</li>
            <li>• Venue impression analytics</li>
            <li>• Desktop pairing for live status</li>
            <li>• Appear in "Near Me" search</li>
          </ul>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input
            placeholder="Search by name, email, or license ID..."
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(0); }}
            className="pl-9 bg-zinc-900/50 border-zinc-700 text-white"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
          <SelectTrigger className="w-[140px] bg-zinc-900/50 border-zinc-700 text-zinc-300">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="revoked">Revoked</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(0); }}>
          <SelectTrigger className="w-[160px] bg-zinc-900/50 border-zinc-700 text-zinc-300">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="organizer">Organizer</SelectItem>
            <SelectItem value="venue_owner">Venue Owner</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-white/5 bg-[#0a0a0c] overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-rose-400" /></div>
        ) : licenses.length === 0 ? (
          <div className="text-center py-16 text-zinc-500">
            <Award className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p>No licenses found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-zinc-400 text-left">
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="px-4 py-3 font-medium">License ID</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Issued</th>
                  <th className="px-4 py-3 font-medium">Expires</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {licenses.map((lic) => (
                  <motion.tr
                    key={lic.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-4 py-3">
                      <button onClick={() => openDetail(lic.user_id)} className="flex items-center gap-2 hover:text-rose-400 transition-colors text-left">
                        {lic.avatar_url ? (
                          <img src={lic.avatar_url} className="w-7 h-7 rounded-full object-cover" alt="" />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center text-xs text-zinc-400">
                            {(lic.username?.[0] || '?').toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="text-white font-medium text-xs">{lic.username || 'Unknown'}</div>
                          <div className="text-zinc-500 text-[11px]">{lic.email}</div>
                        </div>
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <CopyBadge text={lic.license_id} />
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-xs bg-purple-500/10 text-purple-400 border border-purple-500/20">
                        {LICENSE_TYPE_LABEL[lic.license_type] ?? lic.license_type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs border ${STATUS_STYLE[lic.status] ?? 'bg-zinc-800 text-zinc-300 border-zinc-700'}`}>
                        {lic.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-400 text-xs">
                      {lic.issued_at ? new Date(lic.issued_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3 text-zinc-400 text-xs">
                      {lic.expires_at ? new Date(lic.expires_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openDetail(lic.user_id)} className="p-1.5 rounded-md hover:bg-white/5 text-zinc-400 hover:text-white transition-colors" title="View Details">
                          <Eye className="w-4 h-4" />
                        </button>
                        {lic.status === 'active' ? (
                          <button onClick={() => revokeLicense(lic.user_id, lic.license_type)} className="p-1.5 rounded-md hover:bg-red-500/10 text-zinc-400 hover:text-red-400 transition-colors" title="Revoke">
                            <Ban className="w-4 h-4" />
                          </button>
                        ) : (
                          <button onClick={() => reinstateLicense(lic.user_id, lic.license_type)} className="p-1.5 rounded-md hover:bg-emerald-500/10 text-zinc-400 hover:text-emerald-400 transition-colors" title="Reinstate">
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        )}
                        <button onClick={() => deleteLicense(lic.id)} className="p-1.5 rounded-md hover:bg-red-500/10 text-zinc-400 hover:text-red-400 transition-colors" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
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
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/5 text-xs text-zinc-400">
            <span>Page {page + 1} of {totalPages}</span>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)} className="h-7 w-7 p-0">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} className="h-7 w-7 p-0">
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ── Assign License Dialog ──────────────────────────────────────────── */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="bg-[#121214] border-zinc-800 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-rose-400" /> Assign License
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">User Email</label>
              <Input
                placeholder="user@example.com"
                value={assignEmail}
                onChange={(e) => setAssignEmail(e.target.value)}
                className="bg-zinc-900/50 border-zinc-700 text-white"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">License Type</label>
              <Select value={assignType} onValueChange={setAssignType}>
                <SelectTrigger className="bg-zinc-900/50 border-zinc-700 text-zinc-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="organizer">Organizer (ESP-OR)</SelectItem>
                  <SelectItem value="venue_owner">Venue Owner (ESP-VO)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAssignOpen(false)} className="text-zinc-400">Cancel</Button>
            <Button onClick={handleAssign} disabled={!assignEmail || assignLoading} className="bg-rose-600 hover:bg-rose-700">
              {assignLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <UserPlus className="w-4 h-4 mr-1" />}
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── User Detail Dialog ─────────────────────────────────────────────── */}
      <Dialog open={!!detailUser || detailLoading} onOpenChange={(open) => { if (!open) setDetailUser(null); }}>
        <DialogContent className="bg-[#121214] border-zinc-800 text-white max-w-2xl max-h-[85vh] overflow-y-auto overscroll-contain" data-lenis-prevent>
          <DialogHeader className="sr-only">
            <DialogTitle>User details</DialogTitle>
          </DialogHeader>
          {detailLoading && !detailUser ? (
            <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-rose-400" /></div>
          ) : detailUser ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  {detailUser.profile.avatar_url ? (
                    <img src={detailUser.profile.avatar_url} className="w-10 h-10 rounded-full object-cover" alt="" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-lg text-zinc-400">
                      {(detailUser.profile.username?.[0] || '?').toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className="text-lg font-semibold">{detailUser.profile.full_name || detailUser.profile.username}</div>
                    <div className="text-xs text-zinc-400 font-normal">@{detailUser.profile.username} · {detailUser.profile.email}</div>
                  </div>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-5 mt-4">
                {/* Profile Meta */}
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="px-2 py-1 rounded-md bg-zinc-800 text-zinc-300">Joined {new Date(detailUser.profile.created_at).toLocaleDateString()}</span>
                  {detailUser.profile.is_admin && (
                    <span className="px-2 py-1 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">Admin</span>
                  )}
                  {detailUser.profile.admin_roles?.map(r => (
                    <span key={r} className="px-2 py-1 rounded-md bg-rose-500/10 text-rose-400 border border-rose-500/20">{r}</span>
                  ))}
                </div>

                {/* Licenses */}
                <Section icon={<Award className="w-4 h-4 text-purple-400" />} title="Licenses" count={detailUser.licenses.length}>
                  {detailUser.licenses.length === 0 ? (
                    <p className="text-zinc-500 text-xs">No licenses assigned.</p>
                  ) : (
                    <div className="space-y-2">
                      {detailUser.licenses.map(lic => (
                        <div key={lic.id} className="flex items-center justify-between rounded-lg bg-zinc-900/50 border border-zinc-800 px-3 py-2">
                          <div className="flex items-center gap-3">
                            <CopyBadge text={lic.license_id} />
                            <span className="text-xs text-purple-400">{LICENSE_TYPE_LABEL[lic.license_type] ?? lic.license_type}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${STATUS_STYLE[lic.status] ?? ''}`}>{lic.status}</span>
                          </div>
                          <div className="flex gap-1">
                            {lic.status === 'active' ? (
                              <button onClick={() => revokeLicense(detailUser.profile.id, lic.license_type)} className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded hover:bg-red-500/10">Revoke</button>
                            ) : (
                              <button onClick={() => reinstateLicense(detailUser.profile.id, lic.license_type)} className="text-xs text-emerald-400 hover:text-emerald-300 px-2 py-1 rounded hover:bg-emerald-500/10">Reinstate</button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Section>

                {/* Roles */}
                <Section icon={<Shield className="w-4 h-4 text-blue-400" />} title="User Roles" count={detailUser.user_roles.length}>
                  {detailUser.user_roles.length === 0 ? (
                    <p className="text-zinc-500 text-xs">No roles.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {detailUser.user_roles.map(r => (
                        <span key={r.role} className={`text-xs px-2 py-1 rounded-md border ${r.is_active ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-zinc-800 text-zinc-500 border-zinc-700 line-through'}`}>
                          {r.role} {!r.is_active && '(inactive)'}
                        </span>
                      ))}
                    </div>
                  )}
                </Section>

                {/* Verified Roles */}
                <Section icon={<FileText className="w-4 h-4 text-cyan-400" />} title="Verified Roles" count={detailUser.verified_roles.length}>
                  {detailUser.verified_roles.length === 0 ? (
                    <p className="text-zinc-500 text-xs">No verification records.</p>
                  ) : (
                    <div className="space-y-1">
                      {detailUser.verified_roles.map(v => (
                        <div key={v.role} className="flex items-center gap-3 text-xs py-1">
                          <span className="text-white font-medium">{v.role}</span>
                          <span className={`px-1.5 py-0.5 rounded-full border text-[10px] ${STATUS_STYLE[v.status] ?? 'bg-zinc-800 text-zinc-400 border-zinc-700'}`}>{v.status}</span>
                          {v.verified_at && <span className="text-zinc-500">verified {new Date(v.verified_at).toLocaleDateString()}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </Section>

                {/* Organizations */}
                {detailUser.organizations.length > 0 && (
                  <Section icon={<Building className="w-4 h-4 text-orange-400" />} title="Organizations" count={detailUser.organizations.length}>
                    <div className="space-y-1">
                      {detailUser.organizations.map(o => (
                        <div key={o.id} className="flex items-center gap-2 text-xs py-1">
                          {o.logo_url && <img src={o.logo_url} className="w-5 h-5 rounded" alt="" />}
                          <span className="text-white font-medium">{o.name}</span>
                          <span className="text-zinc-500">/{o.slug}</span>
                        </div>
                      ))}
                    </div>
                  </Section>
                )}

                {/* Venues */}
                {detailUser.venues.length > 0 && (
                  <Section icon={<MapPin className="w-4 h-4 text-emerald-400" />} title="Venues" count={detailUser.venues.length}>
                    <div className="space-y-1">
                      {detailUser.venues.map(v => (
                        <div key={v.id} className="flex items-center gap-2 text-xs py-1">
                          <span className="text-white font-medium">{v.name}</span>
                          {v.city && <span className="text-zinc-500">{v.city}, {v.country}</span>}
                          <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${v.status === 'published' ? 'text-emerald-400' : 'text-zinc-500'}`}>{v.status}</span>
                        </div>
                      ))}
                    </div>
                  </Section>
                )}

                {/* Tournaments */}
                {detailUser.tournaments.length > 0 && (
                  <Section icon={<Trophy className="w-4 h-4 text-amber-400" />} title="Tournaments" count={detailUser.tournaments.length}>
                    <div className="space-y-1">
                      {detailUser.tournaments.map(t => (
                        <div key={t.id} className="flex items-center gap-2 text-xs py-1">
                          <span className="text-white font-medium">{t.name}</span>
                          <span className="text-zinc-500">{t.game}</span>
                          <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${t.status === 'published' ? 'text-emerald-400' : t.status === 'completed' ? 'text-blue-400' : 'text-zinc-500'}`}>{t.status}</span>
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
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-sm font-medium text-white">{title}</span>
        <span className="text-[10px] text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded-full">{count}</span>
      </div>
      {children}
    </div>
  );
}
