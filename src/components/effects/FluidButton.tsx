import React, { forwardRef } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface FluidButtonProps extends React.ComponentProps<typeof Button> {
    children: React.ReactNode;
    liquidColor?: string;
}

export const FluidButton = forwardRef<HTMLButtonElement, FluidButtonProps>(
    ({ children, className, liquidColor = "#a259ff", ...props }, ref) => {
        return (
            <Button
                ref={ref}
                className={cn("relative overflow-hidden group border-0", className)}
                {...props}
            >
                <motion.div
                    className="absolute inset-0 z-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 translate-x-[-200%]"
                    variants={{
                        hover: { translateX: "200%" }
                    }}
                    transition={{ duration: 1, ease: "easeInOut", repeat: Infinity, repeatDelay: 1 }}
                />

                {/* Liquid Background Effect */}
                <motion.div
                    className="absolute inset-0 z-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{ background: liquidColor }}
                    layoutId={`fluid-bg-${Math.random()}`}
                />

                {/* Content */}
                <span className="relative z-10 flex items-center gap-2">
                    {children}
                </span>
            </Button>
        );
    }
);

FluidButton.displayName = 'FluidButton';
