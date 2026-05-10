import React, { useEffect, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Loader2, Trophy, Workflow } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateSeason } from '@/hooks/useSeasons';
import type { CreateSeasonRequest, SeasonWizardData } from '@/types/season';
import { useToast } from '@/hooks/use-toast';
import { useNavigate, Link } from 'react-router-dom';
import esportsGames from '@/data/esportsGames.json';
import { apiClient } from '@/lib/apiClient';

const SEASON_STEPS = [
  { id: 1, title: 'Basic Info', description: 'Season name and details' },
  { id: 2, title: 'Review', description: 'Review and create season' },
  { id: 3, title: 'Next Steps', description: 'Add tournaments and configure' },
];

interface SeasonWizardProps {
  onCancel?: () => void;
}

const SeasonWizard: React.FC<SeasonWizardProps> = ({ onCancel }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<SeasonWizardData>({
    name: '',
    game: '',
    description: '',
    start_date: undefined,
    end_date: undefined,
    banner_url: undefined,
    logo_url: undefined,
    organization_id: undefined,
    tournaments: [],
    point_rules: [],
    advancement_rules: [],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [createdSeason, setCreatedSeason] = useState<{ id: string; name: string } | null>(null);
  const { mutate: createSeason, isPending } = useCreateSeason();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;

    const loadOrganization = async () => {
      try {
        const roles = await apiClient.get<{ organization_id?: string | null }>('/api/me/roles');
        if (mounted && roles?.organization_id) {
          setData(prev => ({ ...prev, organization_id: roles.organization_id ?? undefined }));
        }
      } catch (error) {
        console.warn('[SeasonCreate] Unable to resolve organization_id for season payload', error);
      }
    };

    void loadOrganization();

    return () => {
      mounted = false;
    };
  }, []);

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      if (!data.name.trim()) newErrors.name = 'Season name is required';
      if (!data.game.trim()) newErrors.game = 'Game is required';
      if (data.start_date && data.end_date && new Date(data.start_date) >= new Date(data.end_date)) {
        newErrors.dates = 'Start date must be before end date';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, SEASON_STEPS.length));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const updateData = (updates: Partial<SeasonWizardData>) => {
    setData(prev => ({ ...prev, ...updates }));
    // Clear errors for the fields being updated
    const fieldsToUpdate = Object.keys(updates);
    setErrors(prev => {
      const newErrors = { ...prev };
      fieldsToUpdate.forEach(field => delete newErrors[field]);
      return newErrors;
    });
  };

  const submitSeason = () => {
    if (!validateStep(currentStep)) return;

    const seasonData: CreateSeasonRequest = {
      name: data.name,
      game: data.game,
      description: data.description,
      start_date: data.start_date,
      end_date: data.end_date,
      banner_url: data.banner_url,
      logo_url: data.logo_url,
      organization_id: data.organization_id,
    };

    createSeason(seasonData, {
      onSuccess: (season) => {
        toast({
          title: 'Season created successfully',
          description: 'Your season has been created and is ready to configure.',
        });
        setCreatedSeason(season);
        setCurrentStep(3);
      },
    });
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <StepBasicInfo data={data} updateData={updateData} errors={errors} />;
      case 2:
        return <StepReview data={data} />;
      case 3:
        return <StepSuccess season={createdSeason} />;
      default:
        return null;
    }
  };

  const isReviewStep = currentStep === 2;
  const isSuccessStep = currentStep === 3;

  return (
    <div className="min-h-screen bg-transparent text-white relative overflow-hidden font-sans">
      <div className="max-w-4xl mx-auto relative z-10 py-6 px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 tracking-tight">
            Create Season
          </h1>
          <p className="text-gray-400">Set up your season in just a few steps</p>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {SEASON_STEPS.map((step, index) => (
              <div key={step.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors ${
                      currentStep >= step.id
                        ? 'bg-emerald-500 text-white'
                        : 'bg-gray-800 text-gray-400'
                    }`}
                  >
                    {currentStep > step.id ? '✓' : step.id}
                  </div>
                  <div className="mt-2 text-center">
                    <div className={`text-sm font-medium ${currentStep >= step.id ? 'text-white' : 'text-gray-500'}`}>
                      {step.title}
                    </div>
                    <div className="text-xs text-gray-500">{step.description}</div>
                  </div>
                </div>
                {index < SEASON_STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 ${currentStep > step.id ? 'bg-emerald-500' : 'bg-gray-800'}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Form Container */}
        <div className="bg-[#0d0d10] border border-white/10 rounded-3xl p-6 md:p-8 relative overflow-hidden">
          <AnimatePresence mode="wait">
            {renderStep()}
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <div className="mt-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {currentStep > 1 && currentStep < 3 && (
              <Button
                variant="outline"
                onClick={prevStep}
                className="border-gray-700 bg-black/20 hover:bg-white/10 text-white"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            )}
            {onCancel && (
              <Button
                variant="ghost"
                onClick={onCancel}
                className="text-gray-400 hover:text-white hover:bg-white/10"
              >
                Cancel
              </Button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {isReviewStep ? (
              <Button
                onClick={submitSeason}
                disabled={isPending || Object.keys(errors).length > 0}
                className="bg-emerald-500 hover:bg-emerald-600 min-w-[160px] text-white font-bold shadow-[0_0_20px_rgba(16,185,129,0.3)]"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Season'
                )}
              </Button>
            ) : isSuccessStep ? (
              <div className="flex gap-3">
                <Link to="/tournaments/create">
                  <Button className="bg-rose-500 hover:bg-rose-600 text-white font-bold">
                    <Trophy className="w-4 h-4 mr-2" />
                    Create Tournament
                  </Button>
                </Link>
                {createdSeason && (
                  <Link to={`/organizer/season/${createdSeason.id}`}>
                    <Button variant="outline" className="border-gray-700 hover:bg-white/10 text-white">
                      <Workflow className="w-4 h-4 mr-2" />
                      Manage Season
                    </Button>
                  </Link>
                )}
                <Button
                  variant="ghost"
                  onClick={() => navigate('/organizer/seasons')}
                  className="text-gray-400 hover:text-white hover:bg-white/10"
                >
                  Done
                </Button>
              </div>
            ) : (
              <Button
                onClick={nextStep}
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold shadow-[0_0_20px_rgba(16,185,129,0.3)]"
              >
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Step Components
const StepBasicInfo: React.FC<{
  data: SeasonWizardData;
  updateData: (updates: Partial<SeasonWizardData>) => void;
  errors: Record<string, string>;
}> = ({ data, updateData, errors }) => (
  <div className="space-y-6">
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-2">Season Name *</label>
      <input
        type="text"
        value={data.name}
        onChange={(e) => updateData({ name: e.target.value })}
        className="w-full bg-black/30 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
        placeholder="Enter season name"
      />
      {errors.name && <p className="text-red-400 text-sm mt-1">{errors.name}</p>}
    </div>

    <div>
      <label className="block text-sm font-medium text-gray-300 mb-2">Game *</label>
      <Select value={data.game} onValueChange={(game) => updateData({ game })}>
        <SelectTrigger className={`w-full bg-black/30 border-gray-700 text-white focus:border-emerald-500 ${errors.game ? 'border-red-500' : ''}`}>
          <SelectValue placeholder="Select a supported game" />
        </SelectTrigger>
        <SelectContent className="bg-[#0d0d10] border-white/10 text-white">
          {esportsGames.games
            .filter((game) => game.slug !== 'cs2')
            .map((game) => (
              <SelectItem
                key={game.name}
                value={game.name}
                className="focus:bg-emerald-600 focus:text-white cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <img src={game.logo} alt="" className="w-5 h-5 rounded object-cover" />
                  <span>{game.name}</span>
                </div>
              </SelectItem>
            ))}
        </SelectContent>
      </Select>
      {errors.game && <p className="text-red-400 text-sm mt-1">{errors.game}</p>}
    </div>

    <div>
      <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
      <textarea
        value={data.description}
        onChange={(e) => updateData({ description: e.target.value })}
        className="w-full bg-black/30 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 min-h-[120px]"
        placeholder="Enter season description"
      />
    </div>

    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Start Date</label>
        <input
          type="date"
          value={data.start_date || ''}
          onChange={(e) => updateData({ start_date: e.target.value || undefined })}
          className="w-full bg-black/30 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">End Date</label>
        <input
          type="date"
          value={data.end_date || ''}
          onChange={(e) => updateData({ end_date: e.target.value || undefined })}
          className="w-full bg-black/30 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
        />
      </div>
    </div>
    {errors.dates && <p className="text-red-400 text-sm">{errors.dates}</p>}
  </div>
);

const StepReview: React.FC<{
  data: SeasonWizardData;
}> = ({ data }) => (
  <div className="space-y-6">
    <div className="bg-black/30 rounded-lg p-6 space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-white mb-2">Basic Information</h3>
        <div className="space-y-2 text-gray-300">
          <p><span className="text-gray-500">Name:</span> {data.name}</p>
          <p><span className="text-gray-500">Game:</span> {data.game}</p>
          {data.description && <p><span className="text-gray-500">Description:</span> {data.description}</p>}
          {data.start_date && <p><span className="text-gray-500">Start Date:</span> {data.start_date}</p>}
          {data.end_date && <p><span className="text-gray-500">End Date:</span> {data.end_date}</p>}
        </div>
      </div>
    </div>

    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4">
      <p className="text-emerald-400 text-sm">
        After creating the season, you can add tournaments and configure point rules from the season management page.
      </p>
    </div>
  </div>
);

const StepSuccess: React.FC<{
  season: { id: string; name: string } | null;
}> = ({ season }) => (
  <div className="space-y-6 text-center">
    <div className="w-20 h-20 mx-auto bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/30">
      <Trophy className="w-10 h-10 text-emerald-500" />
    </div>
    <div>
      <h3 className="text-2xl font-bold text-white mb-2">Season Created!</h3>
      <p className="text-gray-400">
        <span className="text-emerald-400 font-semibold">{season?.name}</span> has been created successfully.
      </p>
    </div>
    <div className="bg-black/30 rounded-lg p-6 space-y-3 text-left max-w-lg mx-auto">
      <p className="text-sm text-gray-400">What would you like to do next?</p>
      <div className="space-y-2">
        <div className="flex items-start gap-3 text-sm text-gray-300">
          <span className="w-6 h-6 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>
          <span>Create a tournament and link it to this season to track standings.</span>
        </div>
        <div className="flex items-start gap-3 text-sm text-gray-300">
          <span className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
          <span>Set up point rules to award standings points across linked tournaments.</span>
        </div>
        <div className="flex items-start gap-3 text-sm text-gray-300">
          <span className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-xs font-bold flex-shrink-0">3</span>
          <span>Publish the season when you are ready to make it visible to players.</span>
        </div>
      </div>
    </div>
  </div>
);

export default SeasonWizard;
