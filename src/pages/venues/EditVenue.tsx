import React, { useState, useEffect, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import Footer from '@/components/Footer';
import ImageUploader from '@/components/tournament/wizard/ImageUploader';
import CitySearch from '@/components/venues/CitySearch';
import GamesPicker from '@/components/venues/GamesPicker';
import {
  Loader2, Save, ChevronLeft, Wifi, Wind, Coffee, Car, Maximize2,
  Zap, Cpu, Monitor, X, Plus
} from 'lucide-react';
import { Venue } from '@/types/venue';

const MapPicker = React.lazy(() => import('@/components/venues/MapPicker'));

const AMENITIES_LIST = [
  { id: 'wifi', label: 'High-Speed WiFi', icon: Wifi },
  { id: 'ac', label: 'Air Conditioning', icon: Wind },
  { id: 'food', label: 'Food & Drinks', icon: Coffee },
  { id: 'parking', label: 'Free Parking', icon: Car },
  { id: 'private', label: 'Private Rooms', icon: Maximize2 },
  { id: 'power', label: 'Backup Power', icon: Zap },
];

function parsePcSpecs(raw: any): Record<string, string> {
  if (!raw) return {};
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch { return {}; }
  }
  return raw;
}

const EditVenue = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [venue, setVenue] = useState<Venue | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [country, setCountry] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [stations, setStations] = useState('');
  const [hours, setHours] = useState('');
  const [games, setGames] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [pricePerHour, setPricePerHour] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [amenities, setAmenities] = useState<string[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [cardImage, setCardImage] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);

  // PC Specs
  const [gpu, setGpu] = useState('');
  const [cpu, setCpu] = useState('');
  const [ram, setRam] = useState('');
  const [monitors, setMonitors] = useState('');

  useEffect(() => {
    if (id) fetchVenue();
  }, [id]);

  const fetchVenue = async () => {
    try {
      const data = await apiClient.get<any>(`/api/venues/${id}`);
      if (!data) { navigate('/venues/manage'); return; }
      if (data.owner_id !== user?.id) {
        toast({ title: 'Access denied', variant: 'destructive' });
        navigate('/venues/manage');
        return;
      }
      setVenue(data);
      setName(data.name || '');
      setDescription(data.description || '');
      setAddress(data.address || '');
      setCity(data.city || '');
      setState(data.state || '');
      setCountry(data.country || '');
      setPostalCode(data.postal_code || '');
      setStations(String(data.stations || ''));
      setHours(data.hours || '');
      setGames(data.games || '');
      setContactEmail(data.contact_email || '');
      setContactPhone(data.contact_phone || '');
      setPricePerHour(String(data.price_per_hour || ''));
      setCurrency(data.currency || 'USD');
      setAmenities(data.amenities || []);
      setImages(data.images || []);
      setCardImage(data.card_image || '');
      setLatitude(data.latitude ?? null);
      setLongitude(data.longitude ?? null);

      const specs = parsePcSpecs(data.pc_specs);
      setGpu(specs.gpu || '');
      setCpu(specs.cpu || '');
      setRam(specs.ram || '');
      setMonitors(specs.monitors || '');
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
      navigate('/venues/manage');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!venue) return;
    setSaving(true);
    try {
      await apiClient.put(`/api/venues/${venue.id}`, {
        name,
        description,
        address,
        city,
        state,
        country,
        postalCode,
        stations: parseInt(stations) || undefined,
        hours,
        games,
        contactEmail,
        contactPhone,
        pricePerHour: parseFloat(pricePerHour) || undefined,
        currency,
        amenities,
        images,
        cardImage: cardImage || (images.length > 0 ? images[0] : undefined),
        pcSpecs: (gpu || cpu || ram || monitors) ? { gpu, cpu, ram, monitors } : undefined,
        latitude: latitude ?? undefined,
        longitude: longitude ?? undefined,
      });
      toast({ title: 'Venue updated', description: 'Changes saved successfully.' });
      navigate('/venues/manage');
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const toggleAmenity = (id: string) => {
    setAmenities(prev => prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]);
  };

  const handleRemoveImage = (idx: number) => {
    setImages(prev => prev.filter((_, i) => i !== idx));
  };

  if (loading) return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-rose-500 animate-spin" />
    </div>
  );

  if (!venue) return null;

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <div className="container mx-auto px-4 md:px-6 max-w-4xl py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <button onClick={() => navigate('/venues/manage')}
              className="inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-white mb-2 transition-colors">
              <ChevronLeft className="w-4 h-4" /> Back to My Venues
            </button>
            <h1 className="text-2xl font-bold">Edit Venue</h1>
          </div>
          <Button onClick={handleSave} disabled={saving}
            className="bg-rose-600 hover:bg-rose-700 text-white">
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Save Changes
          </Button>
        </div>

        <div className="space-y-10">

          {/* ── Basic Info ─────────────────────────────── */}
          <section className="bg-[#0a0a0c] border border-white/5 rounded-2xl p-6">
            <h2 className="text-base font-semibold mb-4">Basic Information</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-zinc-400 mb-1 block">Venue Name</label>
                <Input value={name} onChange={e => setName(e.target.value)}
                  className="bg-black/30 border-white/10 focus:border-rose-500/50" />
              </div>
              <div>
                <label className="text-sm text-zinc-400 mb-1 block">Description</label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)}
                  className="bg-black/30 border-white/10 focus:border-rose-500/50 min-h-[100px] resize-none" />
              </div>
            </div>
          </section>

          {/* ── Location ──────────────────────────────── */}
          <section className="bg-[#0a0a0c] border border-white/5 rounded-2xl p-6">
            <h2 className="text-base font-semibold mb-4">Location</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-zinc-400 mb-1 block">Full Address</label>
                <Input value={address} onChange={e => setAddress(e.target.value)}
                  placeholder="Street address..."
                  className="bg-black/30 border-white/10 focus:border-rose-500/50" />
              </div>
              <div>
                <label className="text-sm text-zinc-400 mb-1 block">City, State & Country</label>
                <CitySearch
                  city={city}
                  state={state}
                  country={country}
                  onSelect={(c, s, co) => { setCity(c); setState(s); setCountry(co); }}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-zinc-400 mb-1 block">Postal Code</label>
                  <Input value={postalCode} onChange={e => setPostalCode(e.target.value)}
                    className="bg-black/30 border-white/10 focus:border-rose-500/50" />
                </div>
              </div>

              {/* Map picker */}
              <div>
                <label className="text-sm text-zinc-400 mb-1 block">Pin on Map</label>
                <p className="text-xs text-zinc-600 mb-2">Click the map or use your current location to set the exact venue position.</p>
                <Suspense fallback={<div className="h-[300px] bg-zinc-900 rounded-xl animate-pulse" />}>
                  <MapPicker
                    latitude={latitude}
                    longitude={longitude}
                    onChange={(lat, lng) => { setLatitude(lat); setLongitude(lng); }}
                    height="300px"
                    address={[address, city, country].filter(Boolean).join(', ')}
                  />
                </Suspense>
              </div>
            </div>
          </section>

          {/* ── Specs & Games ─────────────────────────── */}
          <section className="bg-[#0a0a0c] border border-white/5 rounded-2xl p-6">
            <h2 className="text-base font-semibold mb-4">Specs & Games</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-zinc-400 mb-1 block">Stations</label>
                  <Input value={stations} onChange={e => setStations(e.target.value)} type="number"
                    className="bg-black/30 border-white/10 focus:border-rose-500/50" />
                </div>
                <div>
                  <label className="text-sm text-zinc-400 mb-1 block">Operating Hours</label>
                  <Input value={hours} onChange={e => setHours(e.target.value)} placeholder="e.g. 10AM - 2AM"
                    className="bg-black/30 border-white/10 focus:border-rose-500/50" />
                </div>
              </div>
              <div>
                <label className="text-sm text-zinc-400 mb-1 block">Top Games</label>
                <GamesPicker value={games} onChange={setGames} />
              </div>

              {/* Hardware */}
              <div>
                <label className="text-sm text-zinc-400 mb-2 block flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5" /> Hardware Specs
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="text-xs text-zinc-500 mb-1 block">GPU</label>
                    <Input value={gpu} onChange={e => setGpu(e.target.value)} placeholder="RTX 4070"
                      className="bg-black/30 border-white/10 focus:border-rose-500/50 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500 mb-1 block">CPU</label>
                    <Input value={cpu} onChange={e => setCpu(e.target.value)} placeholder="i9 14900K"
                      className="bg-black/30 border-white/10 focus:border-rose-500/50 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500 mb-1 block">RAM</label>
                    <Input value={ram} onChange={e => setRam(e.target.value)} placeholder="32GB DDR5"
                      className="bg-black/30 border-white/10 focus:border-rose-500/50 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500 mb-1 block">Display</label>
                    <Input value={monitors} onChange={e => setMonitors(e.target.value)} placeholder="240Hz IPS"
                      className="bg-black/30 border-white/10 focus:border-rose-500/50 text-sm" />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ── Amenities ─────────────────────────────── */}
          <section className="bg-[#0a0a0c] border border-white/5 rounded-2xl p-6">
            <h2 className="text-base font-semibold mb-4">Amenities</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {AMENITIES_LIST.map(a => {
                const Icon = a.icon;
                const active = amenities.includes(a.id);
                return (
                  <button key={a.id} type="button" onClick={() => toggleAmenity(a.id)}
                    className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border text-sm transition-all ${
                      active
                        ? 'bg-rose-500/10 border-rose-500/30 text-white'
                        : 'bg-black/20 border-white/5 text-zinc-400 hover:border-white/15'
                    }`}>
                    <Icon className={`w-4 h-4 ${active ? 'text-rose-500' : 'text-zinc-500'}`} />
                    {a.label}
                  </button>
                );
              })}
            </div>
          </section>

          {/* ── Contact & Pricing ─────────────────────── */}
          <section className="bg-[#0a0a0c] border border-white/5 rounded-2xl p-6">
            <h2 className="text-base font-semibold mb-4">Contact & Pricing</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-zinc-400 mb-1 block">Email</label>
                  <Input value={contactEmail} onChange={e => setContactEmail(e.target.value)}
                    className="bg-black/30 border-white/10 focus:border-rose-500/50" />
                </div>
                <div>
                  <label className="text-sm text-zinc-400 mb-1 block">Phone</label>
                  <Input value={contactPhone} onChange={e => setContactPhone(e.target.value)}
                    className="bg-black/30 border-white/10 focus:border-rose-500/50" />
                </div>
              </div>
              <div className="flex items-end gap-3 max-w-md">
                <div className="flex-1">
                  <label className="text-sm text-zinc-400 mb-1 block">Price per Hour</label>
                  <Input value={pricePerHour} onChange={e => setPricePerHour(e.target.value)} type="number" step="0.01"
                    className="bg-black/30 border-white/10 focus:border-rose-500/50" />
                </div>
                <div className="w-28">
                  <label className="text-sm text-zinc-400 mb-1 block">Currency</label>
                  <select value={currency} onChange={e => setCurrency(e.target.value)}
                    className="w-full h-10 rounded-md bg-black/30 border border-white/10 text-white px-3 text-sm focus:border-rose-500/50 outline-none">
                    {['USD','EUR','GBP','AED','SAR','INR','PKR','TRY','EGP','QAR','KWD','BHD','OMR','JOD','MAD','MYR','SGD','IDR','PHP','BRL','JPY'].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </section>

          {/* ── Media ─────────────────────────────────── */}
          <section className="bg-[#0a0a0c] border border-white/5 rounded-2xl p-6">
            <h2 className="text-base font-semibold mb-4">Media</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-zinc-400 mb-2 block">Card Banner</label>
                <ImageUploader
                  value={cardImage || null}
                  onChange={(url) => setCardImage(url || '')}
                  bucket="venue-images"
                  folder={`uploads/cards`}
                  label="Upload banner image"
                />
              </div>

              <div>
                <label className="text-sm text-zinc-400 mb-2 block">Gallery ({images.length} images)</label>
                <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                  {images.map((img, idx) => (
                    <div key={idx} className="relative aspect-[4/3] rounded-lg overflow-hidden bg-zinc-900 group">
                      <img src={img} alt={`Gallery ${idx + 1}`} className="w-full h-full object-cover" />
                      <button onClick={() => handleRemoveImage(idx)}
                        className="absolute top-1 right-1 p-1 bg-black/70 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                        <X className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  ))}
                  <div className="aspect-[4/3]">
                    <ImageUploader
                      value={null}
                      onChange={(url) => { if (url) setImages(prev => [...prev, url]); }}
                      bucket="venue-images"
                      folder={`uploads/gallery`}
                      label="+"
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Bottom save */}
          <div className="flex justify-end gap-3 pb-8">
            <Button variant="outline" onClick={() => navigate('/venues/manage')}
              className="border-white/10 hover:bg-white/5">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}
              className="bg-rose-600 hover:bg-rose-700 text-white px-8">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save Changes
            </Button>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default EditVenue;
