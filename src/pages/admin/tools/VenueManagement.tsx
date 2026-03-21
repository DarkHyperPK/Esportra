import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import {
  ArrowLeft,
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
  Monitor,
  Gamepad2,
  Mail,
  Phone,
  DollarSign,
  User,
  Image as ImageIcon,
  Cpu,
  Wifi,
  Coffee,
  Car,
  Wind,
  Zap,
  Maximize2,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAdminVenues, useAdminVenueUpdate } from "@/hooks/useAdminQueries";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
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
    <div className="min-h-screen p-4 lg:p-8">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8"
      >
        <div className="flex items-center gap-4">
          <Link to="/admin/dashboard">
            <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Venue Management</h1>
              <p className="text-zinc-500 text-sm">Manage and verify gaming venues</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="border-zinc-800 text-zinc-400 hover:text-white"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={exportCSV}
            className="bg-rose-500 hover:bg-rose-600 text-white"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </motion.header>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6"
      >
        {[
          { label: 'Total Venues', value: stats.total, icon: Building, color: 'emerald' },
          { label: 'Verified', value: stats.verified, icon: CheckCircle, color: 'emerald' },
          { label: 'Pending', value: stats.pending, icon: Clock, color: 'amber' },
          { label: 'Total Capacity', value: stats.totalCapacity, icon: Star, color: 'violet' },
        ].map((stat) => (
          <div
            key={stat.label}
            className="p-4 rounded-2xl bg-[#0a0a0c] border border-zinc-800/50"
          >
            <div className="flex items-center justify-between mb-2">
              <stat.icon className={`w-5 h-5 text-${stat.color}-500`} />
            </div>
            <p className="text-2xl font-bold text-white">{stat.value.toLocaleString()}</p>
            <p className="text-xs text-zinc-500">{stat.label}</p>
          </div>
        ))}
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="flex flex-col md:flex-row gap-3 mb-6"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input
            placeholder="Search venues..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-zinc-900/50 border-zinc-800 focus:border-rose-500"
          />
        </div>
        <div className="flex gap-2">
          {['all', 'verified', 'unverified'].map((status) => (
            <Button
              key={status}
              variant="outline"
              size="sm"
              onClick={() => setStatusFilter(status)}
              className={`border-zinc-800 capitalize ${statusFilter === status ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' : 'text-zinc-400'}`}
            >
              {status === 'all' ? 'All' : status}
            </Button>
          ))}
        </div>
      </motion.div>

      {/* Venues Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="rounded-2xl bg-[#0a0a0c] border border-zinc-800/50 overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-zinc-900/50">
                <th className="px-6 py-3 text-left text-xs font-mono text-zinc-500 uppercase">Venue</th>
                <th className="px-6 py-3 text-left text-xs font-mono text-zinc-500 uppercase">Location</th>
                <th className="px-6 py-3 text-left text-xs font-mono text-zinc-500 uppercase">Capacity</th>
                <th className="px-6 py-3 text-left text-xs font-mono text-zinc-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-mono text-zinc-500 uppercase">Created</th>
                <th className="px-6 py-3 text-right text-xs font-mono text-zinc-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12">
                    <div className="flex items-center justify-center gap-2 text-zinc-500">
                      <div className="w-5 h-5 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
                      Loading venues...
                    </div>
                  </td>
                </tr>
              ) : filteredVenues.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-zinc-500">
                    No venues found
                  </td>
                </tr>
              ) : (
                filteredVenues.slice(0, 100).map((venue, idx) => (
                  <motion.tr
                    key={venue.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: idx * 0.01 }}
                    className="hover:bg-zinc-900/30 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                          <MapPin className="w-5 h-5 text-emerald-500" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{venue.name || 'Unnamed'}</p>
                          <p className="text-xs text-zinc-500 font-mono">{venue.id.slice(0, 8)}...</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-400">
                      {venue.city || venue.location || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-400">{venue.capacity || '-'}</td>
                    <td className="px-6 py-4">
                      <Badge className={`${venue.status === 'published' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/10 text-amber-400 border-amber-500/30'} border text-xs`}>
                        {venue.status === 'published' ? 'Verified' : venue.status?.replace('_', ' ') || 'Pending'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-500">
                      {new Date(venue.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-[#0a0a0c] border-zinc-800">
                          <DropdownMenuItem
                            className="text-zinc-300 focus:text-white focus:bg-zinc-800"
                            onClick={() => setSelectedVenue(venue)}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          {venue.status !== 'published' ? (
                            <DropdownMenuItem
                              className="text-emerald-400 focus:text-emerald-300 focus:bg-emerald-500/10"
                              onClick={() => handleVerify(venue.id, true)}
                            >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Verify Venue
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              className="text-red-400 focus:text-red-300 focus:bg-red-500/10"
                              onClick={() => handleVerify(venue.id, false)}
                            >
                              <XCircle className="w-4 h-4 mr-2" />
                              Remove Verification
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Venue Detail Modal */}
      <Dialog open={!!selectedVenue} onOpenChange={() => setSelectedVenue(null)}>
        <DialogContent className="bg-[#0a0a0c] border-zinc-800 max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <MapPin className="w-5 h-5 text-emerald-500" />
              Venue Review
            </DialogTitle>
          </DialogHeader>
          {selectedVenue && (
            <div className="space-y-6">

              {/* Card Banner Preview */}
              {selectedVenue.card_image && (
                <div className="rounded-xl overflow-hidden border border-white/5 cursor-pointer" onClick={() => setLightboxImage(selectedVenue.card_image!)}>
                  <img src={selectedVenue.card_image} alt="Card banner" className="w-full h-48 object-cover hover:scale-105 transition-transform duration-300" />
                </div>
              )}

              {/* Basic Info */}
              <div>
                <h4 className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Building className="w-3 h-3" /> Basic Info
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
                    <div key={item.label} className="p-3 rounded-xl bg-zinc-900/50 border border-white/5">
                      <p className="text-[10px] text-zinc-500 uppercase font-mono">{item.label}</p>
                      <p className="text-white text-sm mt-1">{item.value || 'N/A'}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Description */}
              {selectedVenue.description && (
                <div className="p-4 rounded-xl bg-zinc-900/50 border border-white/5">
                  <p className="text-[10px] text-zinc-500 uppercase font-mono mb-2">Description</p>
                  <p className="text-zinc-300 text-sm leading-relaxed">{selectedVenue.description}</p>
                </div>
              )}

              {/* Location */}
              <div>
                <h4 className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <MapPin className="w-3 h-3" /> Location
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
                    <div key={item.label} className="p-3 rounded-xl bg-zinc-900/50 border border-white/5">
                      <p className="text-[10px] text-zinc-500 uppercase font-mono">{item.label}</p>
                      <p className="text-white text-sm mt-1">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Specs & Gaming */}
              <div>
                <h4 className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Gamepad2 className="w-3 h-3" /> Specs & Gaming
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Stations', value: selectedVenue.stations },
                    { label: 'Operating Hours', value: selectedVenue.hours },
                    { label: 'Games', value: selectedVenue.games },
                    { label: 'Capacity', value: selectedVenue.capacity },
                  ].filter(item => item.value).map((item) => (
                    <div key={item.label} className="p-3 rounded-xl bg-zinc-900/50 border border-white/5">
                      <p className="text-[10px] text-zinc-500 uppercase font-mono">{item.label}</p>
                      <p className="text-white text-sm mt-1">{item.value}</p>
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
                    <div className="mt-3 p-4 rounded-xl bg-zinc-900/50 border border-white/5">
                      <p className="text-[10px] text-zinc-500 uppercase font-mono mb-3 flex items-center gap-1.5">
                        <Cpu className="w-3 h-3" /> PC Specifications
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {entries.map((item) => (
                          <div key={item.label} className="flex items-center gap-2">
                            <span className="text-[10px] text-zinc-500 font-mono w-16 shrink-0">{item.label}</span>
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
                  <h4 className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Coffee className="w-3 h-3" /> Amenities
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedVenue.amenities.map((amenity) => (
                      <span key={amenity} className="px-3 py-1.5 text-xs font-medium bg-zinc-900 border border-white/5 rounded-lg text-zinc-300 capitalize">
                        {amenity.replace('_', ' ')}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Contact & Pricing */}
              <div>
                <h4 className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Phone className="w-3 h-3" /> Contact & Pricing
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Email', value: selectedVenue.contact_email },
                    { label: 'Phone', value: selectedVenue.contact_phone },
                    { label: 'Price / Hour', value: selectedVenue.price_per_hour != null ? `${selectedVenue.currency || 'USD'} ${selectedVenue.price_per_hour}` : undefined },
                  ].filter(item => item.value).map((item) => (
                    <div key={item.label} className="p-3 rounded-xl bg-zinc-900/50 border border-white/5">
                      <p className="text-[10px] text-zinc-500 uppercase font-mono">{item.label}</p>
                      <p className="text-white text-sm mt-1">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Gallery */}
              {selectedVenue.images && selectedVenue.images.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <ImageIcon className="w-3 h-3" /> Gallery ({selectedVenue.images.length} images)
                  </h4>
                  <div className="grid grid-cols-3 gap-3">
                    {selectedVenue.images.map((url, idx) => (
                      <div key={idx} className="relative aspect-video rounded-xl overflow-hidden border border-white/5 cursor-pointer hover:border-emerald-500/30 transition-colors" onClick={() => setLightboxImage(url)}>
                        <img src={url} alt={`Gallery ${idx + 1}`} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
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
        <DialogContent className="bg-transparent border-none shadow-none max-w-4xl p-0">
          {lightboxImage && (
            <img src={lightboxImage} alt="Preview" className="w-full h-auto max-h-[80vh] object-contain rounded-xl" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VenueManagementTool;
