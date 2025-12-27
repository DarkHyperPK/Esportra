import React from 'react';
import { Check } from 'lucide-react';
import { WIZARD_STEPS } from '@/types/tournamentWizard';
import { cn } from '@/lib/utils';

interface WizardProgressProps {
    currentStep: number;
    stepValidation: Record<number, boolean>;
    onStepClick: (step: number) => void;
}

const WizardProgress: React.FC<WizardProgressProps> = ({
    currentStep,
    stepValidation,
    onStepClick,
}) => {
    return (
        <div className="w-full mb-8">
            {/* Desktop view */}
            <div className="hidden md:flex items-center justify-between">
                {WIZARD_STEPS.map((step, index) => {
                    const isComplete = stepValidation[step.id] === true;
                    const isCurrent = currentStep === step.id;
                    const isPast = currentStep > step.id;
                    const canClick = isPast || isComplete || step.id <= currentStep;

                    return (
                        <React.Fragment key={step.id}>
                            {/* Step circle and label */}
                            <div
                                className={cn(
                                    "flex flex-col items-center cursor-pointer group",
                                    !canClick && "opacity-50 cursor-not-allowed"
                                )}
                                onClick={() => canClick && onStepClick(step.id)}
                            >
                                <div
                                    className={cn(
                                        "w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold transition-all duration-300",
                                        isCurrent && "bg-emerald-500 text-white ring-4 ring-emerald-500/30 scale-110",
                                        isComplete && !isCurrent && "bg-emerald-600 text-white",
                                        !isCurrent && !isComplete && "bg-gray-700 text-gray-400",
                                        canClick && !isCurrent && "group-hover:scale-105 group-hover:bg-emerald-500/50"
                                    )}
                                >
                                    {isComplete && !isCurrent ? (
                                        <Check className="w-6 h-6" />
                                    ) : (
                                        step.id
                                    )}
                                </div>
                                <div className="mt-2 text-center">
                                    <div className={cn(
                                        "text-sm font-medium",
                                        isCurrent ? "text-white" : "text-gray-400"
                                    )}>
                                        {step.title}
                                    </div>
                                    <div className="text-xs text-gray-500 hidden lg:block">
                                        {step.description}
                                    </div>
                                </div>
                            </div>

                            {/* Connector line */}
                            {index < WIZARD_STEPS.length - 1 && (
                                <div className="flex-1 h-1 mx-4 rounded-full overflow-hidden bg-gray-700">
                                    <div
                                        className={cn(
                                            "h-full transition-all duration-500 ease-out",
                                            isPast || isComplete ? "bg-emerald-600" : "bg-gray-700",
                                            isCurrent && "bg-emerald-500 w-1/2"
                                        )}
                                        style={{
                                            width: isPast || isComplete ? '100%' : isCurrent ? '50%' : '0%'
                                        }}
                                    />
                                </div>
                            )}
                        </React.Fragment>
                    );
                })}
            </div>

            {/* Mobile view */}
            <div className="md:hidden">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-400">
                        Step {currentStep} of {WIZARD_STEPS.length}
                    </span>
                    <span className="text-sm font-medium text-white">
                        {WIZARD_STEPS[currentStep - 1]?.title}
                    </span>
                </div>
                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-emerald-500 transition-all duration-300"
                        style={{ width: `${(currentStep / WIZARD_STEPS.length) * 100}%` }}
                    />
                </div>
                <div className="flex justify-between mt-2">
                    {WIZARD_STEPS.map((step) => (
                        <div
                            key={step.id}
                            className={cn(
                                "w-2 h-2 rounded-full transition-all",
                                currentStep >= step.id ? "bg-emerald-500" : "bg-gray-600",
                                stepValidation[step.id] && "bg-emerald-600"
                            )}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default WizardProgress;
