import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Loader2, RotateCcw } from 'lucide-react';
import { useTournamentWizard } from '@/hooks/useTournamentWizard';
import { useGameCatalog } from '@/hooks/useGameCatalog';
import { useAdmin } from '@/hooks/useAdmin';
import { useAuth } from '@/hooks/useAuth';
import { isSuperAdminUser } from '@/lib/adminAccess';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ActionBar, PageIntro } from '@/components/ui/kit';
import { CommandButton, CommandShell } from '@/components/management/CommandSurface';
import WizardProgress from './WizardProgress';
import StepBasicInfo from './StepBasicInfo';
import StepFormatRules from './StepFormatRules';
import StepBranding from './StepBranding';
import StepPrizeDistribution from './StepPrizeDistribution';
import StepRegistration from './StepRegistration';
import StepSettings from './StepSettings';
import StepReview from './StepReview';
import { WIZARD_STEPS, type TournamentWizardData } from '@/types/tournamentWizard';

interface WizardContainerProps {
    initialData?: TournamentWizardData;
    tournamentId?: string;
    participantsCount?: number;
    activeInvitationCount?: number;
}

/**
 * Full setup / edit wizard. One question per step, a readable column, the
 * stepper on top and a sticky bar that always names the next step.
 */
const WizardContainer: React.FC<WizardContainerProps> = ({
    initialData,
    tournamentId,
    participantsCount,
    activeInvitationCount,
}) => {
    useGameCatalog();
    const admin = useAdmin();
    const { profile } = useAuth();
    const isSuperAdmin = isSuperAdminUser(admin, profile);
    const [confirmReset, setConfirmReset] = useState(false);
    const {
        currentStep,
        data,
        errors,
        isSubmitting,
        stepValidation,
        updateData,
        nextStep,
        prevStep,
        goToStep,
        clearDraft,
        submitTournament,
    } = useTournamentWizard(initialData, tournamentId, { activeInvitationCount });

    const isEditing = Boolean(tournamentId);
    const locked = isEditing && !isSuperAdmin;
    const isLastStep = currentStep === WIZARD_STEPS.length;
    const isFirstStep = currentStep === 1;
    const nextTitle = WIZARD_STEPS[currentStep]?.title;

    const renderStep = () => {
        switch (currentStep) {
            case 1:
                return <StepBasicInfo data={data} updateData={updateData} errors={errors} isEditMode={locked} />;
            case 2:
                return <StepFormatRules data={data} updateData={updateData} errors={errors} isEditMode={locked} tournamentId={tournamentId} participantsCount={participantsCount} />;
            case 3:
                return <StepBranding data={data} updateData={updateData} errors={errors} />;
            case 4:
                return <StepPrizeDistribution data={data} updateData={updateData} errors={errors} isEditMode={locked} />;
            case 5:
                return <StepRegistration data={data} updateData={updateData} errors={errors} isEditMode={locked} activeInvitationCount={activeInvitationCount} />;
            case 6:
                return <StepSettings data={data} updateData={updateData} errors={errors} />;
            case 7:
                return <StepReview data={data} errors={errors} onEdit={goToStep} />;
            default:
                return null;
        }
    };

    const primaryLabel = isLastStep
        ? (isEditing ? 'Save changes' : 'Create tournament')
        : `Continue to ${nextTitle?.toLowerCase() ?? 'next step'}`;

    return (
        <CommandShell>
            <div className="px-4 pb-6 pt-8 sm:px-6 md:px-10 md:pt-12">
                <PageIntro
                    eyebrow={isEditing ? 'Edit tournament' : 'Full setup'}
                    title={isEditing ? (data.name || 'Edit tournament') : 'Create a tournament'}
                    description={isEditing
                        ? 'Changes apply as soon as you save. Some fields lock once players have registered.'
                        : 'Seven short steps. Your progress saves on this device, so you can leave and come back.'}
                />

                <div className="mt-10">
                    <WizardProgress currentStep={currentStep} stepValidation={stepValidation} onStepClick={goToStep} steps={WIZARD_STEPS} />
                </div>

                <div className="mt-10 max-w-4xl">
                    <AnimatePresence mode="wait">{renderStep()}</AnimatePresence>
                </div>

                <ActionBar
                    sticky
                    className="mt-10"
                    start={
                        <>
                            {!isFirstStep && (
                                <CommandButton variant="secondary" size="sm" onClick={prevStep}>
                                    <ArrowLeft className="h-4 w-4" aria-hidden />
                                    Back
                                </CommandButton>
                            )}
                            {!isEditing && (
                                <CommandButton variant="ghost" size="sm" onClick={() => setConfirmReset(true)}>
                                    <RotateCcw className="h-4 w-4" aria-hidden />
                                    <span className="hidden sm:inline">Start over</span>
                                </CommandButton>
                            )}
                        </>
                    }
                    status={isEditing ? undefined : 'Saved on this device'}
                    end={
                        <CommandButton
                            variant="primary"
                            size="md"
                            slide
                            onClick={isLastStep ? submitTournament : nextStep}
                            disabled={isSubmitting || (isLastStep && Object.keys(errors).length > 0)}
                            className="min-w-[200px]"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                                    {isEditing ? 'Saving' : 'Creating'}
                                </>
                            ) : (
                                <>
                                    {primaryLabel}
                                    {!isLastStep && <ArrowRight className="h-4 w-4" aria-hidden />}
                                </>
                            )}
                        </CommandButton>
                    }
                />
            </div>

            <AlertDialog open={confirmReset} onOpenChange={setConfirmReset}>
                <AlertDialogContent className="border-white/10 bg-card text-white">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Start over?</AlertDialogTitle>
                        <AlertDialogDescription className="text-zinc-400">
                            This clears everything you've entered and takes you back to step 1. It can't be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel asChild>
                            <CommandButton variant="secondary" size="sm">Keep my progress</CommandButton>
                        </AlertDialogCancel>
                        <AlertDialogAction asChild>
                            <CommandButton variant="danger" size="sm" onClick={() => { clearDraft(); setConfirmReset(false); }}>
                                Clear and start over
                            </CommandButton>
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </CommandShell>
    );
};

export default WizardContainer;
