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
}

const WizardContainer: React.FC<WizardContainerProps> = ({ initialData, tournamentId }) => {
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
                return <StepFormatRules data={data} updateData={updateData} errors={errors} tournamentId={tournamentId} />;
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
        <div className="min-h-screen bg-esports-darker py-6 px-4">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
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

                {/* Form Container */}
                <div className="bg-gaming-dark rounded-xl border border-gray-700 p-6 md:p-8">
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
                                className="border-gray-700"
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
                                className="text-gray-400 hover:text-red-400"
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
                                className="bg-emerald-500 hover:bg-emerald-600 min-w-[160px]"
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
                                className="bg-emerald-500 hover:bg-emerald-600"
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
