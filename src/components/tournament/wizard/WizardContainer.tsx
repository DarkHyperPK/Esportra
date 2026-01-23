import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTournamentWizard } from '@/hooks/useTournamentWizard';
import WizardProgress from './WizardProgress';
import StepBasicInfo from './StepBasicInfo';
import StepFormatRules from './StepFormatRules';
import StepBranding from './StepBranding';
import StepRegistration from './StepRegistration';
import StepReview from './StepReview';
import { WIZARD_STEPS } from '@/types/tournamentWizard';

import { TournamentWizardData } from '@/types/tournamentWizard';

interface WizardContainerProps {
    initialData?: TournamentWizardData;
    tournamentId?: string;
    participantsCount?: number;
}

const WizardContainer: React.FC<WizardContainerProps> = ({ initialData, tournamentId, participantsCount }) => {
    // ... hooks ...
    const {
        currentStep,
        data,
        errors,
        isSubmitting,
        stepValidation,
        updateData,
        validateCurrentStep,
        nextStep,
        prevStep,
        goToStep,
        clearDraft,
        submitTournament,
    } = useTournamentWizard(initialData, tournamentId);

    const renderStep = () => {
        switch (currentStep) {
            case 1:
                return <StepBasicInfo data={data} updateData={updateData} errors={errors} isEditMode={!!tournamentId} />;
            case 2:
                // Ensure StepFormatRules receives the required props
                return <StepFormatRules data={data} updateData={updateData} errors={errors} tournamentId={tournamentId} participantsCount={participantsCount} />;
            case 3:
                return <StepBranding data={data} updateData={updateData} errors={errors} />;
            case 4:
                return <StepRegistration data={data} updateData={updateData} errors={errors} />;
            case 5:
                return <StepReview data={data} errors={errors} onEdit={goToStep} />;
            default:
                return null;
        }
    };

    const isLastStep = currentStep === WIZARD_STEPS.length;
    const isFirstStep = currentStep === 1;

    return (
        <div className="min-h-screen bg-transparent text-white relative overflow-hidden font-sans">
            <div className="max-w-4xl mx-auto relative z-10 py-6 px-4">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 tracking-tight">
                        {tournamentId ? 'Edit Tournament' : 'Create Tournament'}
                    </h1>
                    <p className="text-gray-400">
                        {tournamentId ? 'Update your tournament settings' : 'Set up your tournament in just a few steps'}
                    </p>
                </div>

                {/* Progress */}
                <WizardProgress
                    currentStep={currentStep}
                    stepValidation={stepValidation}
                    onStepClick={goToStep}
                />

                {/* Form Container - GLASS STYLE */}
                <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-6 md:p-8 relative overflow-hidden group">
                    {/* Optional: MotionTiles for extra flair, same as dashboard */}
                    <div className="absolute inset-0 opacity-20 pointer-events-none">
                        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
                    </div>

                    <AnimatePresence mode="wait">
                        {renderStep()}
                    </AnimatePresence>
                </div>

                {/* Navigation */}
                <div className="mt-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {!isFirstStep && (
                            <Button
                                variant="outline"
                                onClick={prevStep}
                                className="border-gray-700 bg-black/20 hover:bg-white/10 text-white"
                            >
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Back
                            </Button>
                        )}

                        {/* Clear draft button - only show in create mode */}
                        {!tournamentId && (
                            <Button
                                variant="ghost"
                                onClick={clearDraft}
                                className="text-gray-400 hover:text-red-400 hover:bg-red-500/10"
                            >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Clear Draft
                            </Button>
                        )}
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Draft saved indicator */}
                        {!tournamentId && (
                            <span className="text-xs text-gray-500 hidden md:block">
                                ✓ Draft auto-saved
                            </span>
                        )}

                        {isLastStep ? (
                            <Button
                                onClick={submitTournament}
                                disabled={isSubmitting || Object.keys(errors).length > 0}
                                className="bg-emerald-500 hover:bg-emerald-600 min-w-[160px] text-white font-bold shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        {tournamentId ? 'Saving...' : 'Creating...'}
                                    </>
                                ) : (
                                    tournamentId ? 'Save Changes' : 'Create Tournament'
                                )}
                            </Button>
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

                {/* Help text */}
                <div className="mt-4 text-center text-xs text-gray-500">
                    {tournamentId
                        ? 'Changes will be applied immediately upon saving.'
                        : 'Your progress is automatically saved. You can close this page and continue later.'}
                </div>
            </div>
        </div>
    );
};

export default WizardContainer;
