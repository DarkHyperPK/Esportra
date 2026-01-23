import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect, useState } from "react";

export interface TypewriterProps {
    words: string[];
    className?: string;
    cursorClassName?: string;
}

export const TypewriterEffect = ({ words, className, cursorClassName }: TypewriterProps) => {
    const [index, setIndex] = useState(0);
    const baseText = useMotionValue("");
    const count = useMotionValue(0);
    const rounded = useTransform(count, (latest) => Math.round(latest));
    const displayText = useTransform(rounded, (latest) =>
        words[index].slice(0, latest)
    );

    useEffect(() => {
        const controls = animate(count, words[index].length, {
            type: "tween",
            duration: 1.5,
            ease: "easeInOut",
            onComplete: () => {
                setTimeout(() => {
                    const deleteControls = animate(count, 0, {
                        type: "tween",
                        duration: 1,
                        ease: "easeInOut",
                        onComplete: () => {
                            setIndex((prev) => (prev + 1) % words.length);
                        },
                    });
                    return () => deleteControls.stop();
                }, 1500); // Wait before deleting
            },
        });
        return () => controls.stop();
    }, [index, words]);

    return (
        <div className={className}>
            <motion.span>{displayText}</motion.span>
            <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, repeat: Infinity, repeatType: "reverse" }}
                className={`inline-block h-full w-[2px] bg-cyan-500 ml-1 ${cursorClassName}`}
            />
        </div>
    );
};
