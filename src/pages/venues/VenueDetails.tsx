import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '@/lib/apiClient';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useTrackImpression } from '@/hooks/useVenueImpressions';
import { useVenueLiveStatus } from '@/hooks/useVenueLiveStatus';
import {
    MapPin,
    Clock,
    Phone,
    Mail,
    Cpu,
    Monitor,
    Wifi,
    Coffee,
    Car,
    Wind,
    Zap,
    Maximize2,
    Share2,
    ChevronLeft,
    ChevronRight,
    Gamepad2,
    CheckCircle,
    Star,
    X,
    User,
    Copy,
    Check,
    AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import Footer from '@/components/Footer';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";

// Icons mapping for amenities (reuse from ListVenue or move to shared)
const AMENITIES_ICONS: Record<string, any> = {
    wifi: Wifi,
    ac: Wind,
    food: Coffee,
    parking: Car,
    private: Maximize2,
    power: Zap,
};

const AMENITIES_LABELS: Record<string, string> = {
    wifi: 'High-Speed WiFi',
    ac: 'Air Conditioning',
    food: 'Food & Drinks',
    parking: 'Free Parking',
    private: 'Private Rooms',
    power: 'Backup Power',
};

interface Venue {
    id: string;
    slug: string;
    name: string;
    description: string;
    city: string;
    state: string;
    country: string;
    address: string;
    postal_code: string;
    stations: number;
    hours: string;
    games: string;
    contact_email: string;
    contact_phone: string;
    images: string[]; // URLs
    amenities: string[];
    price_range?: string; // e.g. "$5-$15/hr"
    price_per_hour?: number;
    pc_specs: {
        cpu: string;
        gpu: string;
        ram: string;
        monitors: string;
    };
    owner_id: string;
    venue_id?: string;
    status?: string;
    rejection_reason?: string;
}

interface Review {
    id: string;
    venue_id: string;
    user_id: string;
    rating: number;
    comment: string;
    created_at: string;
    profiles?: {
        username: string;
        avatar_url: string;
    }
}

function VenueIdBadge({ venueId }: { venueId: string }) {
    const [copied, setCopied] = useState(false);
    const { toast } = useToast();
    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(venueId);
            setCopied(true);
            toast({ title: 'Copied', description: `${venueId} copied to clipboard` });
            setTimeout(() => setCopied(false), 2000);
        } catch {
            toast({ title: 'Copy failed', variant: 'destructive' });
        }
    };
    return (
        <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-gray-400 font-mono transition-colors border border-white/10"
        >
            {venueId}
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
        </button>
    );
}

const VenueDetails = () => {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();
    const { toast } = useToast();
    const { user } = useAuth(); // Get user from auth context
    const [venue, setVenue] = useState<Venue | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedImageIndex, setSelectedImageIndex] = useState<number>(-1); // Lightbox state

    // Review states
    const [reviews, setReviews] = useState<Review[]>([]);
    const [averageRating, setAverageRating] = useState<number>(0);
    const [isReviewOpen, setIsReviewOpen] = useState<boolean>(false);
    const [newRating, setNewRating] = useState<number>(5);
    const [newComment, setNewComment] = useState<string>('');
    const [submittingReview, setSubmittingReview] = useState<boolean>(false);

    // Impression tracking + live status
    const { mutate: trackImpression } = useTrackImpression();
    const liveStatus = useVenueLiveStatus(venue?.id);
    const impressionTracked = useRef(false);

    useEffect(() => {
        fetchVenue();
    }, [slug]);

    const fetchVenue = async () => {
        try {
            if (!slug) return;
            const data = await apiClient.get<any>(`/api/venues/${slug}`);

            // Guard: non-published venues are only visible to their owner
            if (data.status && data.status !== 'published' && user?.id !== data.owner_id) {
                toast({ title: 'Venue not found', description: 'This venue is not currently available.', variant: 'destructive' });
                navigate('/venues/search');
                return;
            }

            setVenue(data);

            fetchReviews(data.id);

            // Fire a view impression once (guard against double-fire in strict mode)
            if (!impressionTracked.current) {
                impressionTracked.current = true;
                trackImpression({ venueId: data.id, eventType: 'view', userId: user?.id });
            }

        } catch (error: any) {
            console.error('Error fetching venue:', error);
            toast({
                title: 'Error',
                description: 'Could not load venue details.',
                variant: 'destructive',
            });
            navigate('/venues/search');
        } finally {
            setLoading(false);
        }
    };

    const fetchReviews = async (venueId: string) => {
        try {
            const data = await apiClient.get<any[]>(`/api/reviews/venue/${venueId}`);
            if (data) {
                setReviews(data);
                if (data.length > 0) {
                    const total = data.reduce((acc: number, r: any) => acc + r.rating, 0);
                    setAverageRating(total / data.length);
                } else {
                    setAverageRating(0);
                }
            }
        } catch {
            // Reviews are non-critical
        }
    };

    const handleSubmitReview = async () => {
        if (!user || !venue) return;
        setSubmittingReview(true);
        try {
            await apiClient.post('/api/reviews', {
                venueId: venue.id,
                reviewType: 'venue',
                rating: newRating,
                comment: newComment,
            });

            toast({ title: "Review Submitted", description: "Thanks for your feedback!" });
            setIsReviewOpen(false);
            setNewComment("");
            setNewRating(5);
            fetchReviews(venue.id);
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setSubmittingReview(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#050505] flex items-center justify-center">
                <div className="w-16 h-16 border-4 border-purple-600/30 border-t-purple-600 rounded-full animate-spin" />
            </div>
        );
    }

    if (!venue) return (
        <div className="min-h-screen bg-[#050505] flex items-center justify-center">
            <div className="text-center">
                <h2 className="text-xl font-semibold text-white mb-2">Venue not found</h2>
                <p className="text-zinc-400 mb-4">This venue doesn't exist or may have been removed.</p>
                <a href="/venues" className="text-rose-500 hover:text-rose-400 underline">Browse all venues</a>
            </div>
        </div>
    );

    const mainImage = venue.images && venue.images.length > 0 ? venue.images[0] : null;

    return (
        <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-purple-500/30">
            {/* Owner status banner — only shown when venue is not published */}
            {venue.status && venue.status !== 'published' && user?.id === venue.owner_id && (
                <div className={`px-4 py-3 text-sm text-center font-medium flex items-center justify-center gap-2 ${
                    venue.status === 'draft'          ? 'bg-zinc-800 text-zinc-300' :
                    venue.status === 'pending_review' ? 'bg-yellow-900/60 text-yellow-300' :
                    venue.status === 'rejected'       ? 'bg-rose-900/60 text-rose-300' :
                    venue.status === 'suspended'      ? 'bg-orange-900/60 text-orange-300' :
                    'bg-zinc-800 text-zinc-400'
                }`}>
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>
                        {venue.status === 'draft'          && 'This venue is a draft and not visible to the public.'}
                        {venue.status === 'pending_review' && 'This venue is pending review and not yet visible to the public.'}
                        {venue.status === 'rejected'       && `Rejected: ${venue.rejection_reason || 'Please edit and resubmit.'}`}
                        {venue.status === 'suspended'      && 'This venue has been suspended. Contact support for details.'}
                        {venue.status === 'archived'       && 'This venue is archived.'}
                    </span>
                </div>
            )}

            {/* Hero Section */}
            <div className="relative h-[60vh] md:h-[70vh] w-full overflow-hidden">
                {/* Background Image / Gradient */}
                <div className="absolute inset-0">
                    {mainImage ? (
                        <motion.img
                            key={mainImage}
                            initial={{ opacity: 0.5, scale: 1.1 }}
                            animate={{ opacity: 0.6, scale: 1 }}
                            transition={{ duration: 0.7 }}
                            src={mainImage}
                            alt={venue.name}
                            className="w-full h-full object-cover opacity-60"
                        />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-purple-900/40 via-[#050505] to-[#050505]" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/60 to-transparent" />
                </div>

                <div className="absolute inset-0 container mx-auto px-4 flex flex-col justify-end pb-12 z-10">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        <Button
                            variant="ghost"
                            className="mb-6 text-white/70 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                            onClick={() => navigate('/venues/search')}
                        >
                            <ChevronLeft className="w-4 h-4 mr-2" /> Back to Search
                        </Button>

                        <h1 className="text-4xl md:text-6xl font-bold mb-4 font-heading bg-clip-text text-transparent bg-gradient-to-r from-white via-gray-200 to-gray-400">
                            {venue.name}
                        </h1>

                        <div className="flex flex-wrap items-center gap-6 text-lg text-gray-300 mb-8">
                            <div className="flex items-center gap-2">
                                <MapPin className="w-5 h-5 text-cyan-400" />
                                <span>{venue.city}, {venue.country}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Clock className="w-5 h-5 text-purple-400" />
                                <span>{venue.hours || 'Open 24/7'}</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <Button variant="outline" className="border-white/20 hover:bg-white/10 rounded-full px-6 py-6" onClick={() => {
                                navigator.clipboard.writeText(window.location.href);
                                toast({ description: "Link copied to clipboard!" });
                            }}>
                                <Share2 className="w-5 h-5 mr-2" /> Share
                            </Button>
                        </div>
                    </motion.div>
                </div>
            </div>

            <main className="container mx-auto px-4 py-16 grid grid-cols-1 lg:grid-cols-3 gap-12">
                {/* Left Column: Details */}
                <div className="lg:col-span-2 space-y-16">

                    {/* About */}
                    <section>
                        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                            About the Venue
                        </h2>
                        <p className="text-gray-400 text-lg leading-relaxed whitespace-pre-wrap">
                            {venue.description}
                        </p>
                    </section>

                    {/* Gallery Section - Instagram Style Grid */}
                    {venue.images && venue.images.length > 0 && (
                        <section>
                            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                                Gallery
                            </h2>
                            <div className="grid grid-cols-3 gap-1 md:gap-2">
                                {venue.images.map((img, idx) => (
                                    <div
                                        key={idx}
                                        className="aspect-square relative group overflow-hidden cursor-pointer bg-gray-900"
                                        onClick={() => setSelectedImageIndex(idx)}
                                    >
                                        <img
                                            src={img}
                                            alt={`Venue shot ${idx + 1}`}
                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                        />
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Specs */}
                    <section>
                        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                            <Monitor className="w-6 h-6 text-cyan-400" /> Battle Stations
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-[#0a0a0c] border border-white/5 rounded-2xl p-6">
                                <div className="text-gray-400 text-sm mb-1 uppercase tracking-wider">Stations</div>
                                <div className="text-3xl font-bold">{venue.stations} <span className="text-lg text-gray-500 font-normal">PCs Setup</span></div>
                            </div>
                            <div className="bg-[#0a0a0c] border border-white/5 rounded-2xl p-6">
                                <div className="text-gray-400 text-sm mb-1 uppercase tracking-wider">Top Games</div>
                                <div className="text-lg font-medium text-white">{venue.games}</div>
                            </div>
                        </div>

                        <div className="mt-4 bg-[#0a0a0c] border border-white/5 rounded-2xl p-6">
                            <h3 className="text-lg font-semibold mb-4 text-purple-400">Hardware Specs</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                <div>
                                    <div className="text-gray-500 text-xs uppercase mb-1">GPU</div>
                                    <div className="font-mono text-cyan-300">{venue.pc_specs?.gpu || 'Standard'}</div>
                                </div>
                                <div>
                                    <div className="text-gray-500 text-xs uppercase mb-1">CPU</div>
                                    <div className="font-mono text-cyan-300">{venue.pc_specs?.cpu || 'Standard'}</div>
                                </div>
                                <div>
                                    <div className="text-gray-500 text-xs uppercase mb-1">RAM</div>
                                    <div className="font-mono text-cyan-300">{venue.pc_specs?.ram || 'Standard'}</div>
                                </div>
                                <div>
                                    <div className="text-gray-500 text-xs uppercase mb-1">Display</div>
                                    <div className="font-mono text-cyan-300">{venue.pc_specs?.monitors || 'Standard'}</div>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>

                {/* Right Column: Sidebar */}
                <div className="space-y-8">
                    {/* Location Card */}
                    <div className="bg-[#0a0a0c] border border-white/5 rounded-3xl p-6 sticky top-24">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold">Location & Contact</h3>
                            {venue.venue_id && user?.id === venue.owner_id && <VenueIdBadge venueId={venue.venue_id} />}
                        </div>

                        <div className="space-y-6">
                            <div className="flex items-start gap-4">
                                <MapPin className="w-5 h-5 text-gray-400 mt-1" />
                                <div>
                                    <div className="font-medium text-white">Address</div>
                                    <div className="text-gray-400 text-sm mt-1">
                                        {venue.address}<br />
                                        {venue.city}, {venue.state} {venue.postal_code}<br />
                                        {venue.country}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <Phone className="w-5 h-5 text-gray-400 mt-1" />
                                <div>
                                    <div className="font-medium text-white">Phone</div>
                                    <div className="text-gray-400 text-sm mt-1">{venue.contact_phone}</div>
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <Mail className="w-5 h-5 text-gray-400 mt-1" />
                                <div>
                                    <div className="font-medium text-white">Email</div>
                                    <div className="text-gray-400 text-sm mt-1">{venue.contact_email}</div>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-white/5">
                                <h4 className="font-medium mb-4">Amenities</h4>
                                <div className="grid grid-cols-2 gap-3">
                                    {venue.amenities && venue.amenities.map(key => {
                                        const Icon = AMENITIES_ICONS[key] || CheckCircle;
                                        return (
                                            <div key={key} className="flex items-center gap-2 text-xs text-gray-300">
                                                <Icon className="w-4 h-4 text-purple-400" />
                                                <span>{AMENITIES_LABELS[key] || key}</span>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Live Status Card — only shown when desktop agent is connected */}
                    {liveStatus && (
                        <div className={`rounded-2xl border p-4 flex items-center gap-3 ${
                            liveStatus.is_open
                                ? 'bg-emerald-500/5 border-emerald-500/20'
                                : 'bg-zinc-800/50 border-zinc-700/50'
                        }`}>
                            <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${liveStatus.is_open ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'}`} />
                            <div>
                                <div className={`text-sm font-medium ${liveStatus.is_open ? 'text-emerald-400' : 'text-gray-500'}`}>
                                    {liveStatus.is_open ? 'Open Now' : 'Closed'}
                                </div>
                                {liveStatus.is_open && liveStatus.seats_total > 0 && (
                                    <div className="text-xs text-gray-400">
                                        {liveStatus.seats_occupied} / {liveStatus.seats_total} seats occupied
                                    </div>
                                )}
                            </div>
                            <div className="ml-auto text-xs text-gray-600">Live</div>
                        </div>
                    )}

                    {/* Reviews Section */}
                    <div className="bg-[#0a0a0c] border border-white/5 rounded-3xl p-6 mt-8">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold">Reviews</h3>
                            <Button
                                variant="outline"
                                size="sm"
                                className="text-xs border-white/10 hover:bg-white/5"
                                onClick={() => user ? setIsReviewOpen(true) : navigate('/auth/signin')}
                            >
                                Write a Review
                            </Button>
                        </div>

                        <div className="flex items-end gap-2 mb-6">
                            <span className="text-4xl font-bold">{averageRating.toFixed(1)}</span>
                            <div className="flex flex-col mb-1">
                                <div className="flex text-yellow-400">
                                    {[1, 2, 3, 4, 5].map(star => (
                                        <Star key={star} className={`w-4 h-4 ${star <= Math.round(averageRating) ? 'fill-current' : 'text-gray-600'}`} />
                                    ))}
                                </div>
                                <span className="text-xs text-gray-500">{reviews.length} reviews</span>
                            </div>
                        </div>

                        <div className="space-y-6 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                            {reviews.length === 0 ? (
                                <p className="text-center text-gray-500 py-4">No reviews yet. Be the first!</p>
                            ) : (
                                reviews.map((review) => (
                                    <div key={review.id} className="border-b border-white/5 last:border-0 pb-4 last:pb-0">
                                        <div className="flex items-center gap-3 mb-2">
                                            <Avatar className="w-8 h-8">
                                                <AvatarImage src={review.profiles?.avatar_url || undefined} />
                                                <AvatarFallback><User className="w-4 h-4" /></AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <div className="font-medium text-sm">{review.profiles?.username || 'Anonymous'}</div>
                                                <div className="flex text-yellow-400">
                                                    {[1, 2, 3, 4, 5].map(star => (
                                                        <Star key={star} className={`w-3 h-3 ${star <= review.rating ? 'fill-current' : 'text-gray-700'}`} />
                                                    ))}
                                                </div>
                                            </div>
                                            <span className="ml-auto text-xs text-gray-600">
                                                {new Date(review.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-300 pl-11">{review.comment}</p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </main>

            <Footer />

            {/* Review Dialog */}
            <Dialog open={isReviewOpen} onOpenChange={setIsReviewOpen}>
                <DialogContent className="bg-[#0a0a0c] border-white/10 text-white sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Write a Review</DialogTitle>
                        <DialogDescription>Share your experience at {venue.name}</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="flex justify-center gap-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    type="button"
                                    onClick={() => setNewRating(star)}
                                    className="focus:outline-none transition-transform hover:scale-110"
                                >
                                    <Star
                                        className={`w-8 h-8 ${star <= newRating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-600'}`}
                                    />
                                </button>
                            ))}
                        </div>
                        <Textarea
                            placeholder="Tell us about the setup, vibe, and internet speed..."
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            className="bg-black/20 border-white/10 focus:border-purple-500/50 min-h-[100px]"
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsReviewOpen(false)}>Cancel</Button>
                        <Button
                            onClick={handleSubmitReview}
                            disabled={submittingReview}
                            className="bg-purple-600 hover:bg-purple-700 text-white"
                        >
                            {submittingReview ? 'Submitting...' : 'Post Review'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Lightbox Overlay */}
            {selectedImageIndex !== -1 && venue.images && (
                <div
                    className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4"
                    onClick={() => setSelectedImageIndex(-1)}
                >
                    <button
                        className="absolute top-4 right-4 p-2 text-white/70 hover:text-white bg-white/10 rounded-full hover:bg-white/20 transition-all"
                        onClick={(e) => {
                            e.stopPropagation();
                            setSelectedImageIndex(-1);
                        }}
                    >
                        <X className="w-6 h-6" /> {/* Close Icon */}
                        <span className="sr-only">Close</span>
                    </button>

                    <div
                        className="relative max-w-7xl max-h-[90vh] w-full flex items-center justify-center"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {venue.images.length > 1 && (
                            <button
                                className="absolute left-2 md:-left-12 p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-full transition-all"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedImageIndex((prev) => (prev > 0 ? prev - 1 : venue.images!.length - 1));
                                }}
                            >
                                <ChevronLeft className="w-8 h-8" />
                            </button>
                        )}

                        <img
                            src={venue.images[selectedImageIndex]}
                            alt={`Gallery view ${selectedImageIndex + 1}`}
                            className="max-h-[85vh] max-w-full rounded-lg shadow-2xl"
                        />

                        {venue.images.length > 1 && (
                            <button
                                className="absolute right-2 md:-right-12 p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-full transition-all"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedImageIndex((prev) => (prev < venue.images!.length - 1 ? prev + 1 : 0));
                                }}
                            >
                                <ChevronRight className="w-8 h-8" />
                            </button>
                        )}
                    </div>

                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                        {venue.images.map((_, idx) => (
                            <button
                                key={idx}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedImageIndex(idx);
                                }}
                                className={`w-2 h-2 rounded-full transition-all ${idx === selectedImageIndex ? 'bg-white scale-125' : 'bg-white/30 hover:bg-white/50'}`}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default VenueDetails;
