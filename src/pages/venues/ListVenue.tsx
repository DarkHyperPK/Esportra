import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { apiClient } from '@/lib/apiClient';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  MapPin,
  Gamepad2,
  Phone,
  Mail,
  Clock,
  Monitor,
  ChevronRight,
  ChevronLeft,
  CheckCircle,
  Cpu,
  Wifi,
  Coffee,
  Car,
  Wind,
  Zap,
  Maximize2,
  Image as ImageIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import ImageUploader from '@/components/tournament/wizard/ImageUploader';

// Icons mapping for amenities
const AMENITIES_LIST = [
  { id: 'wifi', label: 'High-Speed WiFi', icon: Wifi },
  { id: 'ac', label: 'Air Conditioning', icon: Wind },
  { id: 'food', label: 'Food & Drinks', icon: Coffee },
  { id: 'parking', label: 'Free Parking', icon: Car },
  { id: 'private', label: 'Private Rooms', icon: Maximize2 },
  { id: 'power', label: 'Backup Power', icon: Zap },
];

const STEPS = [
  { id: 1, title: "The Basics", icon: Building2, description: "Tell us about your venue" },
  { id: 2, title: "Location", icon: MapPin, description: "Where can players find you?" },
  { id: 3, title: "Specs & Games", icon: Gamepad2, description: "Hardware and software details" },
  { id: 4, title: "Amenities", icon: Coffee, description: "Comfort and facilities" },
  { id: 5, title: "Media", icon: ImageIcon, description: "Showcase your venue" },
  { id: 6, title: "Contact", icon: Phone, description: "How to reach you" }
];

const ListVenue = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  // Lazy initialization for currentStep from localStorage
  const [currentStep, setCurrentStep] = useState(() => {
    const savedStep = localStorage.getItem('venue_list_step');
    return savedStep ? parseInt(savedStep) : 1;
  });

  const [loading, setLoading] = useState(false);
  const [direction, setDirection] = useState(0);

  // Lazy initialization for formData from localStorage
  const [formData, setFormData] = useState(() => {
    const savedData = localStorage.getItem('venue_list_data');
    return savedData ? JSON.parse(savedData) : {
      name: '',
      city: '',
      state: '',
      country: '',
      zip: '',
      address: '',
      description: '',
      stations: '',
      hours: '',
      games: '', // Top games as CSV
      images: [] as string[],
      card_image: '', // New field for card banner
      contactEmail: '',
      contactPhone: '',
      // Detailed Specs
      cpu: '',
      gpu: '',
      ram: '',
      monitors: '',
      // Amenities
      amenities: [] as string[],
      pricePerHour: ''
    };
  });

  // Effect to save data on changes
  useEffect(() => {
    localStorage.setItem('venue_list_data', JSON.stringify(formData));
    localStorage.setItem('venue_list_step', currentStep.toString());
  }, [formData, currentStep]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const toggleAmenity = (id: string) => {
    setFormData(prev => ({
      ...prev,
      amenities: prev.amenities.includes(id)
        ? prev.amenities.filter(a => a !== id)
        : [...prev.amenities, id]
    }));
  };

  const handleImageChange = (index: number, url: string | null) => {
    setFormData(prev => {
      const newImages = [...(prev.images || [])];
      if (url) {
        newImages[index] = url;
      } else {
        // Remove image at index
        newImages.splice(index, 1);
      }
      return { ...prev, images: newImages.filter(Boolean) }; // Basic cleanup
    });
  };

  const validateStep = (step: number) => {
    switch (step) {
      case 1: return !!(formData.name && formData.description);
      case 2: return !!(formData.city && formData.address && formData.country);
      case 3: return !!(formData.stations && formData.hours && formData.games); // Basic specs required
      case 4: return true; // Amenities optional
      case 5: return true; // Media optional (but recommended)
      case 6: return !!(formData.contactEmail && formData.contactPhone);
      default: return false;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setDirection(1);
      setCurrentStep(prev => Math.min(prev + 1, STEPS.length));
    } else {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields to proceed.",
        variant: "destructive",
      });
    }
  };

  const handleBack = () => {
    setDirection(-1);
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (submitStatus: 'draft' | 'pending_review') => {
    if (!user) {
      toast({ title: "Authentication Required", description: "Please sign in.", variant: "destructive" });
      navigate('/auth/signin');
      return;
    }

    try {
      setLoading(true);

      await apiClient.post('/api/venues', {
          name: formData.name,
          city: formData.city,
          state: formData.state,
          country: formData.country,
          postalCode: formData.zip,
          address: formData.address,
          description: formData.description,
          stations: parseInt(formData.stations) || 0,
          hours: formData.hours,
          games: formData.games,
          amenities: formData.amenities,
          images: formData.images,
          cardImage: formData.card_image || (formData.images.length > 0 ? formData.images[0] : null),
          pcSpecs: { cpu: formData.cpu, gpu: formData.gpu, ram: formData.ram, monitors: formData.monitors },
          slug: formData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Math.random().toString(36).substring(2, 7),
          contactEmail: formData.contactEmail,
          contactPhone: formData.contactPhone,
          pricePerHour: parseFloat(formData.pricePerHour) || 0,
          status: submitStatus,
          submittedAt: submitStatus === 'pending_review' ? new Date().toISOString() : null,
        });

      if (submitStatus === 'pending_review') {
        toast({ title: "Submitted for Review!", description: "Your venue is under review. We'll notify you when it's approved." });
      } else {
        toast({ title: "Draft Saved", description: "Your venue has been saved as a draft. Submit for review when ready." });
      }

      localStorage.removeItem('venue_list_data');
      localStorage.removeItem('venue_list_step');

      navigate('/venues/manage');
    } catch (error: any) {
      console.error('Error submitting venue:', error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const variants = {
    enter: (direction: number) => ({ x: direction > 0 ? 50 : -50, opacity: 0 }),
    center: { zIndex: 1, x: 0, opacity: 1 },
    exit: (direction: number) => ({ zIndex: 0, x: direction < 0 ? 50 : -50, opacity: 0 })
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-purple-900/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-blue-900/10 rounded-full blur-[120px]" />
      </div>

      <main className="flex-grow container mx-auto px-4 py-8 relative z-10 flex flex-col items-center justify-center min-h-[80vh]">

        <div className="w-full max-w-4xl mb-8 md:mb-12">
          <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-gray-200 to-gray-500 mb-4 text-center font-heading">
            List Your Venue
          </h1>
          <p className="text-center text-gray-400 text-lg">
            Join the network of premium esports locations.
          </p>
        </div>

        {/* Step Indicator */}
        <div className="w-full max-w-4xl flex justify-between mb-12 relative">
          {/* Connecting Line */}
          <div className="absolute top-1/2 left-0 w-full h-[2px] bg-white/5 -z-10 -translate-y-1/2 rounded-full" />
          <div
            className="absolute top-1/2 left-0 h-[2px] bg-gradient-to-r from-purple-500 to-cyan-500 -z-10 -translate-y-1/2 rounded-full transition-all duration-500 ease-in-out"
            style={{ width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%` }}
          />

          {STEPS.map((step) => {
            const Icon = step.icon;
            const isActive = step.id === currentStep;
            const isCompleted = step.id < currentStep;

            return (
              <div key={step.id} className="flex flex-col items-center gap-2">
                <div className={cn(
                  "w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center border-2 transition-all duration-300 bg-[#0a0a0c]",
                  isActive ? "border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.3)] scale-110" :
                    isCompleted ? "border-purple-500 text-purple-500" : "border-white/10 text-gray-600"
                )}>
                  {isCompleted ? <CheckCircle className="w-5 h-5 md:w-6 md:h-6" /> : <Icon className={cn("w-4 h-4 md:w-5 md:h-5", isActive && "text-cyan-400")} />}
                </div>
                <span className={cn(
                  "text-xs md:text-sm font-medium transition-colors hidden sm:block",
                  isActive ? "text-cyan-400" : isCompleted ? "text-purple-400" : "text-gray-600"
                )}>
                  {step.title}
                </span>
              </div>
            )
          })}
        </div>

        {/* Form Container */}
        <div className="w-full max-w-3xl">
          <div className="bg-[#0a0a0c]/80 backdrop-blur-xl border border-white/5 rounded-3xl p-6 md:p-10 shadow-2xl relative overflow-hidden">

            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />

            <AnimatePresence mode='wait' custom={direction}>
              <motion.div
                key={currentStep}
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="space-y-6"
              >
                {/* STEP 1: BASICS */}
                {currentStep === 1 && (
                  <>
                    <div className="mb-6">
                      <h2 className="text-2xl font-bold text-white mb-1">The Basics</h2>
                      <p className="text-gray-400">Name and description of your venue.</p>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-gray-300 mb-1.5 block">Venue Name</label>
                        <Input
                          name="name"
                          value={formData.name}
                          onChange={handleChange}
                          placeholder="e.g. Nexus Gaming Lounge"
                          className="bg-black/20 border-white/10 focus:border-cyan-500/50 h-12 rounded-xl text-lg backdrop-blur-sm"
                          autoFocus
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-300 mb-1.5 block">Description</label>
                        <Textarea
                          name="description"
                          value={formData.description}
                          onChange={handleChange}
                          className="min-h-[120px] bg-black/20 border-white/10 focus:border-cyan-500/50 rounded-xl resize-none p-4 backdrop-blur-sm"
                          placeholder="Describe your vibe..."
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* STEP 2: LOCATION */}
                {currentStep === 2 && (
                  <>
                    <div className="mb-6">
                      <h2 className="text-2xl font-bold text-white mb-1">Location</h2>
                      <p className="text-gray-400">Address details.</p>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-gray-300 mb-1.5 block">City</label>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-3 h-5 w-5 text-gray-500" />
                          <Input
                            name="city"
                            value={formData.city}
                            onChange={handleChange}
                            placeholder="City"
                            className="pl-10 bg-black/20 border-white/10 focus:border-cyan-500/50 h-12 rounded-xl backdrop-blur-sm"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-gray-300 mb-1.5 block">State / Province</label>
                          <Input
                            name="state"
                            value={formData.state}
                            onChange={handleChange}
                            placeholder="NY"
                            className="bg-black/20 border-white/10 focus:border-cyan-500/50 h-12 rounded-xl backdrop-blur-sm"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-300 mb-1.5 block">Country</label>
                          <Input
                            name="country"
                            value={formData.country}
                            onChange={handleChange}
                            placeholder="USA"
                            className="bg-black/20 border-white/10 focus:border-cyan-500/50 h-12 rounded-xl backdrop-blur-sm"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-sm font-medium text-gray-300 mb-1.5 block">Postal / Zip Code</label>
                        <Input
                          name="zip"
                          value={formData.zip}
                          onChange={handleChange}
                          placeholder="10001"
                          className="bg-black/20 border-white/10 focus:border-cyan-500/50 h-12 rounded-xl backdrop-blur-sm"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-300 mb-1.5 block">Full Address</label>
                        <Input
                          name="address"
                          value={formData.address}
                          onChange={handleChange}
                          placeholder="Street address..."
                          className="bg-black/20 border-white/10 focus:border-cyan-500/50 h-12 rounded-xl px-4 backdrop-blur-sm"
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* STEP 3: SPECS & GAMES */}
                {currentStep === 3 && (
                  <>
                    <div className="mb-4">
                      <h2 className="text-2xl font-bold text-white mb-1">Specs & Games</h2>
                      <p className="text-gray-400">Flex your hardware power.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="text-sm font-medium text-gray-300 mb-1.5 block">Stations</label>
                        <Input
                          name="stations"
                          type="number"
                          value={formData.stations}
                          onChange={handleChange}
                          placeholder="20"
                          className="bg-black/20 border-white/10 focus:border-cyan-500/50 h-12 rounded-xl backdrop-blur-sm"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-300 mb-1.5 block">Hours</label>
                        <Input
                          name="hours"
                          value={formData.hours}
                          onChange={handleChange}
                          placeholder="24/7"
                          className="bg-black/20 border-white/10 focus:border-cyan-500/50 h-12 rounded-xl backdrop-blur-sm"
                        />
                      </div>
                    </div>

                    {/* PC Specs Detail Section */}
                    <div className="bg-white/5 rounded-2xl p-4 border border-white/5 mb-4">
                      <h3 className="text-sm font-bold text-cyan-400 mb-3 uppercase tracking-wider flex items-center gap-2">
                        <Cpu className="w-4 h-4" /> PC Specifications
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <Input name="gpu" value={formData.gpu} onChange={handleChange} placeholder="GPU (e.g. RTX 4070)" className="bg-black/40 border-white/10 h-10 text-sm" />
                        <Input name="cpu" value={formData.cpu} onChange={handleChange} placeholder="CPU (e.g. i9-13900K)" className="bg-black/40 border-white/10 h-10 text-sm" />
                        <Input name="ram" value={formData.ram} onChange={handleChange} placeholder="RAM (e.g. 32GB DDR5)" className="bg-black/40 border-white/10 h-10 text-sm" />
                        <Input name="monitors" value={formData.monitors} onChange={handleChange} placeholder="Monitors (e.g. 240Hz IPS)" className="bg-black/40 border-white/10 h-10 text-sm" />
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-300 mb-1.5 block">Popular Games</label>
                      <Input
                        name="games"
                        value={formData.games}
                        onChange={handleChange}
                        placeholder="Valorant, CS2, League..."
                        className="bg-black/20 border-white/10 focus:border-cyan-500/50 h-12 rounded-xl backdrop-blur-sm"
                      />
                    </div>
                  </>
                )}

                {/* STEP 4: AMENITIES */}
                {currentStep === 4 && (
                  <>
                    <div className="mb-6">
                      <h2 className="text-2xl font-bold text-white mb-1">Amenities</h2>
                      <p className="text-gray-400">What else do you offer?</p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {AMENITIES_LIST.map((amenity) => (
                        <button
                          key={amenity.id}
                          onClick={() => toggleAmenity(amenity.id)}
                          className={cn(
                            "flex flex-col items-center justify-center p-4 rounded-xl border transition-all duration-200 gap-2",
                            formData.amenities.includes(amenity.id)
                              ? "bg-cyan-500/10 border-cyan-500/50 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.15)]"
                              : "bg-white/5 border-white/5 text-gray-400 hover:bg-white/10 hover:border-white/10"
                          )}
                        >
                          <amenity.icon className="w-6 h-6" />
                          <span className="text-sm font-medium">{amenity.label}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}

                {/* STEP 5: MEDIA */}
                {currentStep === 5 && (
                  <>
                    <div className="mb-6">
                      <h2 className="text-2xl font-bold text-white mb-1">Venue Gallery</h2>
                      <p className="text-gray-400">Upload images to showcase your venue.</p>
                    </div>

                    {/* Card Banner Upload */}
                    <div className="mb-8">
                      <label className="text-sm font-medium text-gray-300 mb-2 block uppercase tracking-wider">Venue Card Banner</label>
                      <p className="text-xs text-gray-500 mb-3">This image will be displayed on the search page cards. (16:9 aspect ratio recommended)</p>
                      <div className="max-w-md">
                        <ImageUploader
                          value={formData.card_image || null}
                          onChange={(url) => setFormData(prev => ({ ...prev, card_image: url || '' }))}
                          bucket="venue-images"
                          folder={`uploads/${user?.id}/cards`}
                          aspectRatio="video"
                          label="Upload Card Banner"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {[0, 1, 2].map((idx) => (
                        <div key={idx} className="space-y-2">
                          <span className="text-xs text-gray-500 uppercase font-medium ml-1">
                            {idx === 0 ? "Main Cover" : `Image ${idx + 1}`}
                          </span>
                          <ImageUploader
                            value={formData.images?.[idx] || null}
                            onChange={(url) => handleImageChange(idx, url)}
                            bucket="venue-images"
                            folder={`uploads/${user?.id}`}
                            aspectRatio="banner"
                            label=""
                            helperText={idx === 0 ? "This will be your main cover." : ""}
                          />
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* STEP 6: CONTACT */}
                {currentStep === 6 && (
                  <>
                    <div className="mb-6">
                      <h2 className="text-2xl font-bold text-white mb-1">Contact Info</h2>
                      <p className="text-gray-400">Final booking details.</p>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-gray-300 mb-1.5 block">Email</label>
                        <Input
                          name="contactEmail"
                          type="email"
                          value={formData.contactEmail}
                          onChange={handleChange}
                          placeholder="venue@example.com"
                          className="bg-black/20 border-white/10 focus:border-cyan-500/50 h-12 rounded-xl backdrop-blur-sm"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-300 mb-1.5 block">Phone</label>
                        <Input
                          name="contactPhone"
                          value={formData.contactPhone}
                          onChange={handleChange}
                          placeholder="+1 (555) 000-0000"
                          className="bg-black/20 border-white/10 focus:border-cyan-500/50 h-12 rounded-xl backdrop-blur-sm"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-300 mb-1.5 block">Price Per Hour (USD)</label>
                        <Input
                          name="pricePerHour"
                          type="number"
                          min="0"
                          step="0.50"
                          value={formData.pricePerHour}
                          onChange={handleChange}
                          placeholder="e.g. 5.00"
                          className="bg-black/20 border-white/10 focus:border-cyan-500/50 h-12 rounded-xl backdrop-blur-sm"
                        />
                      </div>
                    </div>
                  </>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Footer Actions */}
            <div className="flex items-center justify-between mt-10 pt-6 border-t border-white/5">
              <Button variant="ghost" onClick={handleBack} disabled={currentStep === 1 || loading} className="text-gray-400 hover:text-white hover:bg-white/5">
                <ChevronLeft className="w-4 h-4 mr-1" /> Back
              </Button>

              {currentStep < 6 ? (
                <Button onClick={handleNext} className="bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white px-8 rounded-xl shadow-lg shadow-purple-900/20">
                  Next Step <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    onClick={() => handleSubmit('draft')}
                    disabled={loading}
                    className="border-white/10 hover:bg-white/5 text-gray-300 px-6 rounded-xl"
                  >
                    {loading ? 'Saving...' : 'Save as Draft'}
                  </Button>
                  <Button
                    onClick={() => handleSubmit('pending_review')}
                    disabled={loading}
                    className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white px-8 rounded-xl"
                  >
                    {loading ? 'Submitting...' : 'Submit for Review'}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ListVenue;
