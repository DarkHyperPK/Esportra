import React from 'react';
import { StepProgress } from '@/components/ui/kit';

export interface WizardStepConfig {
    id: number;
    title: string;
    description: string;
}

interface WizardProgressProps {
    currentStep: number;
    stepValidation: Record<number, boolean>;
    onStepClick: (step: number) => void;
    steps: WizardStepConfig[];
}

/** Kept for existing imports (tournament and verification wizards); renders the kit stepper. */
const WizardProgress: React.FC<WizardProgressProps> = ({ currentStep, stepValidation, onStepClick, steps }) => (
    <StepProgress steps={steps} current={currentStep} completed={stepValidation} onStepClick={onStepClick} />
);

export default WizardProgress;
