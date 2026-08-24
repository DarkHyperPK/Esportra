import { useState } from "react";
import {
  MapPin,
  Search,
  Eye,
  MoreVertical,
  CheckCircle,
  XCircle,
  RefreshCw,
  Download,
  Clock,
  Star,
  Building,
  Gamepad2,
  Phone,
  Image as ImageIcon,
  Cpu,
  Coffee,
} from "lucide-react";
import { useAdminVenues, useAdminVenueUpdate } from "@/hooks/useAdminQueries";
import { useToast } from "@/hooks/use-toast";
import { AdminPage } from '@/components/admin/AdminPage';
import {
  CommandButton,
  CommandEmptyState,
  CommandMetric,
  CommandSection,
  CommandSegmentedButton,
  CommandToolbar,
} from '@/components/management/CommandSurface';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface VenuePcSpecs {
  cpu?: string;
  gpu?: string;
  ram?: string;
  monitors?: string;
}

interface Venue {
  id: string;
  name: string;
  location: string;
  city: string;
  state?: string;
  country?: string;
  address?: string;
  postal_code?: string;
  description: string;
  capacity: number;
  stations?: number;
  hours?: string;
  games?: string;
  amenities?: string[];
  images?: string[];
  card_image?: string;
  pc_specs?: VenuePcSpecs | string;
  contact_email?: string;
  contact_phone?: string;
  price_per_hour?: number;
  currency?: string;
  status: string;
  created_at: string;
  submitted_at?: string;
  owner_id: string;
  owner_name?: string;
  owner_email?: string;
  slug?: string;
}

function VenueStatusChip({ status }: { status: string }) {
  if (status === 'published') {
    return (
      <span className="inline-flex items-center gap-1.5 border border-white/40 bg-white/[0.06] px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-white">
        <span className="h-1.5 w-1.5 bg-rose-500" />
        Verified
      </span>
    );
  }
  if (status === 'pending_review') {
    return (
      <span className="border border-amber-500/35 bg-amber-950/20 px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-amber-300">
        Pending Review
      </span>
    );
  }
  return (
    <span className="border border-white/10 px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-400">
      {status?.replace('_', ' ') || 'Pending'}
    </span>
  );
}

const VenueManagementTool = () => {
  const { toast } = useToast();
  const { data, isLoading, refetch } = useAdminVenues();
  const venueUpdate = useAdminVenueUpdate();
  const venues = data ?? [];
  const loading = isLoading;
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleVerify = async (venueId: string, verified: boolean) => {
    await venueUpdate.mutateAsync({
      id: venueId,
      updates: { status: verified ? 'published' : 'pending_review' },
    });
    toast({
      title: verified ? 'Venue Verified' : 'Venue Unverified',
      description: 'Venue verification status updated',
    });
  };

  const exportCSV = () => {
    const csv = [
      ['ID', 'Name', 'City', 'Location', 'Capacity', 'Verified', 'Created At'],
      ...filteredVenues.map(v => [v.id, v.name, v.city, v.location, v.capacity, v.status, v.created_at])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `venues_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredVenues = venues.filter(v => {
    const matchesSearch = !searchTerm ||
      v.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.location?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'verified' && v.status === 'published') ||
      (statusFilter === 'unverified' && v.status !== 'published');
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: venues.length,
    verified: venues.filter(v => v.status === 'published').length,
    pending: venues.filter(v => v.status !== 'published').length,
    totalCapacity: venues.reduce((sum, v) => sum + (v.capacity || 0), 0),
  };

  return (
    <AdminPage
      eyebrow="Content"
      title="Venues"
      description="Manage and verify gaming venues"
      actions={
        <>
          <CommandButton variant="ghost" size="sm" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
          </CommandButton>
          <CommandButton variant="ghost" size="sm" onClick={exportCSV}>
            <Download className="h-4 w-4" /> Export
          </CommandButton>
        </>
      }
    >
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <CommandMetric label="Total Venues" value={stats.total.toLocaleString()} icon={<Building className="h-4 w-4" />} />
        <CommandMetric label="Verified" value={stats.verified.toLocaleString()} icon={<CheckCircle className="h-4 w-4" />} />
        <CommandMetric label="Pending" value={stats.pending.toLocaleString()} tone="warning" icon={<Clock className="h-4 w-4" />} />
        <CommandMetric label="Total Capacity" value={stats.totalCapacity.toLocaleString()} icon={<Star className="h-4 w-4" />} />
      </div>

      {/* Filters */}
      <CommandToolbar>
        <div className="relative flex-1 lg:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-600" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search venues..."
            className="w-full -none border border-white/10 bg-[#0a0a0c]/90 py-1.5 pl-9 pr-3 text-xs text-white placeholder:text-zinc-600 outline-none transition-colors focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
          />
        </div>
        <div className="flex gap-1">
          {(['all', 'verified', 'unverified'] as const).map((status) => (
            <CommandSegmentedButton
              key={status}
              active={statusFilter === status}
              onClick={() => setStatusFilter(status)}
            >
              {status === 'all' ? 'All' : status}
            </CommandSegmentedButton>
          ))}
        </div>
      </CommandToolbar>

      {/* Venues Table */}
      {!loading && filteredVenues.length === 0 ? (
        <CommandEmptyState
          title="No venues found"
          description="Venue submissions will appear here for review."
          icon={<MapPin className="h-5 w-5" />}
        />
      ) : (
        <CommandSection className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead className="bg-black/40 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                <tr>
                  <th className="px-4 py-3">Venue</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3">Capacity</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center">
                      <div className="flex items-center justify-center gap-2 text-zinc-500">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-rose-500 border-t-transparent" />
                        Loading venues...
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredVenues.slice(0, 100).map((venue) => (
                    <tr key={venue.id} className="text-zinc-300 transition-colors hover:bg-white/[0.03]">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          {venue.card_image ? (
                            <img src={venue.card_image} alt="" loading="lazy" className="h-8 w-8 border border-white/10 object-contain" />
                          ) : (
                            <MapPin className="h-4 w-4 shrink-0 text-zinc-500" />
                          )}
                          <div className="min-w-0">
                            <p className="font-medium text-white">{venue.name || 'Unnamed'}</p>
                            <p className="font-mono text-[10px] text-zinc-600">{venue.id.slice(0, 8)}...</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-zinc-400">{venue.city || venue.location || 'N/A'}</td>
                      <td className="px-4 py-3 font-mono tabular-nums text-zinc-400">{venue.capacity || '-'}</td>
                      <td className="px-4 py-3"><VenueStatusChip status={venue.status} /></td>
                      <td className="px-4 py-3 font-mono text-[11px] tabular-nums text-zinc-500">
                        {new Date(venue.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              aria-label="Venue actions"
                              title="Venue actions"
                              className="flex h-8 w-8 items-center justify-center border border-white/10 bg-white/[0.03] text-zinc-500 transition-colors hover:border-white/25 hover:text-white"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="border-white/10 bg-[#0a0a0c]">
                            <DropdownMenuItem
                              className="text-zinc-300 focus:bg-white/[0.06] focus:text-white"
                              onClick={() => setSelectedVenue(venue)}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            {venue.status !== 'published' ? (
                              <DropdownMenuItem
                                className="text-white focus:bg-rose-500/15 focus:text-white"
                                onClick={() => handleVerify(venue.id, true)}
                              >
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Verify Venue
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                className="text-red-400 focus:bg-red-500/10 focus:text-red-300"
                                onClick={() => handleVerify(venue.id, false)}
                              >
                                <XCircle className="mr-2 h-4 w-4" />
                                Remove Verification
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CommandSection>
      )}

      {/* Venue Detail Modal */}
      <Dialog open={!!selectedVenue} onOpenChange={() => setSelectedVenue(null)}>
        <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto overscroll-contain -none border-white/10 bg-[#0a0a0c]" data-lenis-prevent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <MapPin className="h-5 w-5 text-rose-400" />
              Venue Review
            </DialogTitle>
            <DialogDescription className="sr-only">Complete venue details for admin review</DialogDescription>
          </DialogHeader>
          {selectedVenue && (
            <div className="space-y-6">

              {/* Card Banner Preview */}
              {selectedVenue.card_image && (
                <div className="cursor-pointer overflow-hidden border border-white/10" onClick={() => setLightboxImage(selectedVenue.card_image!)}>
                  <img src={selectedVenue.card_image} alt="Card banner" loading="lazy" className="h-48 w-full object-cover transition-transform duration-300 hover:scale-105" />
                </div>
              )}

              {/* Basic Info */}
              <div>
                <h4 className="mb-3 flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">
                  <Building className="h-3 w-3" /> Basic Info
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Name', value: selectedVenue.name },
                    { label: 'Status', value: selectedVenue.status === 'published' ? 'Verified' : selectedVenue.status?.replace('_', ' ') || 'Pending' },
                    { label: 'Owner', value: selectedVenue.owner_name || 'Unknown' },
                    { label: 'Owner Email', value: selectedVenue.owner_email || 'N/A' },
                    { label: 'Created', value: new Date(selectedVenue.created_at).toLocaleDateString() },
                    { label: 'Submitted', value: selectedVenue.submitted_at ? new Date(selectedVenue.submitted_at).toLocaleDateString() : 'Not submitted' },
                  ].map((item) => (
                    <div key={item.label} className="border border-white/10 bg-white/[0.025] p-3">
                      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">{item.label}</p>
                      <p className="mt-1 text-sm text-white">{item.value || 'N/A'}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Description */}
              {selectedVenue.description && (
                <div className="border border-white/10 bg-white/[0.025] p-4">
                  <p className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">Description</p>
                  <p className="text-sm leading-relaxed text-zinc-300">{selectedVenue.description}</p>
                </div>
              )}

              {/* Location */}
              <div>
                <h4 className="mb-3 flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">
                  <MapPin className="h-3 w-3" /> Location
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Address', value: selectedVenue.address },
                    { label: 'City', value: selectedVenue.city },
                    { label: 'State', value: selectedVenue.state },
                    { label: 'Country', value: selectedVenue.country },
                    { label: 'Postal Code', value: selectedVenue.postal_code },
                    { label: 'Location', value: selectedVenue.location },
                  ].filter(item => item.value).map((item) => (
                    <div key={item.label} className="border border-white/10 bg-white/[0.025] p-3">
                      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">{item.label}</p>
                      <p className="mt-1 text-sm text-white">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Specs & Gaming */}
              <div>
                <h4 className="mb-3 flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">
                  <Gamepad2 className="h-3 w-3" /> Specs & Gaming
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Stations', value: selectedVenue.stations },
                    { label: 'Operating Hours', value: selectedVenue.hours },
                    { label: 'Games', value: selectedVenue.games },
                    { label: 'Capacity', value: selectedVenue.capacity },
                  ].filter(item => item.value).map((item) => (
                    <div key={item.label} className="border border-white/10 bg-white/[0.025] p-3">
                      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">{item.label}</p>
                      <p className="mt-1 font-mono text-sm tabular-nums text-white">{item.value}</p>
                    </div>
                  ))}
                </div>

                {/* PC Specs */}
                {selectedVenue.pc_specs && (() => {
                  const specs: VenuePcSpecs = typeof selectedVenue.pc_specs === 'string'
                    ? JSON.parse(selectedVenue.pc_specs)
                    : selectedVenue.pc_specs;
                  const entries = [
                    { label: 'CPU', value: specs.cpu },
                    { label: 'GPU', value: specs.gpu },
                    { label: 'RAM', value: specs.ram },
                    { label: 'Monitors', value: specs.monitors },
                  ].filter(item => item.value);
                  if (entries.length === 0) return null;
                  return (
                    <div className="mt-3 border border-white/10 bg-white/[0.025] p-4">
                      <p className="mb-3 flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">
                        <Cpu className="h-3 w-3" /> PC Specifications
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {entries.map((item) => (
                          <div key={item.label} className="flex items-center gap-2">
                            <span className="w-16 shrink-0 font-mono text-[10px] uppercase tracking-wider text-zinc-500">{item.label}</span>
                            <span className="text-sm text-white">{item.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Amenities */}
              {selectedVenue.amenities && selectedVenue.amenities.length > 0 && (
                <div>
                  <h4 className="mb-3 flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">
                    <Coffee className="h-3 w-3" /> Amenities
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedVenue.amenities.map((amenity) => (
                      <span key={amenity} className="border border-white/10 bg-white/[0.03] px-3 py-1.5 font-mono text-[11px] capitalize text-zinc-300">
                        {amenity.replace('_', ' ')}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Contact & Pricing */}
              <div>
                <h4 className="mb-3 flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">
                  <Phone className="h-3 w-3" /> Contact & Pricing
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Email', value: selectedVenue.contact_email },
                    { label: 'Phone', value: selectedVenue.contact_phone },
                    { label: 'Price / Hour', value: selectedVenue.price_per_hour != null ? `${selectedVenue.currency || 'USD'} ${selectedVenue.price_per_hour}` : undefined },
                  ].filter(item => item.value).map((item) => (
                    <div key={item.label} className="border border-white/10 bg-white/[0.025] p-3">
                      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">{item.label}</p>
                      <p className="mt-1 font-mono text-sm tabular-nums text-white">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Gallery */}
              {selectedVenue.images && selectedVenue.images.length > 0 && (
                <div>
                  <h4 className="mb-3 flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">
                    <ImageIcon className="h-3 w-3" /> Gallery ({selectedVenue.images.length} images)
                  </h4>
                  <div className="grid grid-cols-3 gap-3">
                    {selectedVenue.images.map((url, idx) => (
                      <div key={idx} className="relative aspect-video cursor-pointer overflow-hidden border border-white/10 transition-colors hover:border-white/30" onClick={() => setLightboxImage(url)}>
                        <img src={url} alt={`Gallery ${idx + 1}`} loading="lazy" className="h-full w-full object-cover transition-transform duration-300 hover:scale-105" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Image Lightbox */}
      <Dialog open={!!lightboxImage} onOpenChange={() => setLightboxImage(null)}>
        <DialogContent className="max-w-4xl border-none bg-transparent p-0 shadow-none" aria-describedby={undefined}>
          {lightboxImage && (
            <img src={lightboxImage} alt="Preview" loading="lazy" className="max-h-[80vh] w-full -none border border-white/10 object-contain" />
          )}
        </DialogContent>
      </Dialog>
    </AdminPage>
  );
};

export default VenueManagementTool;
