import { motion, useMotionValue, useMotionTemplate, animate } from "framer-motion";
import { useEffect, useState, startTransition } from "react";
import { getWebsiteAssetUrl } from "@/lib/storage";

interface PreloadLogoProps {
    onComplete?: () => void;
    logoSrc?: string;
    backgroundColor?: string;
    logoColor?: string;
}

export function PreloadLogo({
    onComplete,
    logoSrc = getWebsiteAssetUrl('eSportra-Logo/eSPORTRA-white-transparent.png'),
    backgroundColor = "#000000",
    logoColor = "#FFFFFF"
}: PreloadLogoProps) {
    const progress = useMotionValue(0);
    // Inset clip path: inset(top right bottom left) -> inset(0 progress% 0 0) means we reveal from left to right?
    // Wait, framer logic was: inset(0 ${progress}% 0 0).
    // If progress starts at 100, it's fully clipped (invisible). If progress goes to 0, it's fully visible.
    const clipPath = useMotionTemplate`inset(0 ${progress}% 0 0)`;
    const [isComplete, setIsComplete] = useState(false);

    useEffect(() => {
        const animateSequence = async () => {
            // Reset to start (fully hidden)
            progress.set(100);
            setIsComplete(false);

            // Animate from 100 to 0 (revealing the logo)
            await animate(progress, 0, { duration: 1.5, ease: "easeInOut" });

            if (onComplete) {
                onComplete();
            }

            // Delay slightly before hiding to show full logo
            setTimeout(() => {
                startTransition(() => setIsComplete(true));
            }, 500);
        };

        animateSequence();
    }, [onComplete, progress]);

    // If complete, we might want to unmount or just hide.
    // The original component had an upscroll animation to exit.

    if (isComplete && !onComplete) {
        // If we are handling completion externally (e.g. unmounting), we might not strictly need this internal state, 
        // but let's keep the exit animation logic.
    }

    return (
        <div style={{ width: "100%", height: "100%", position: "fixed", inset: 0, zIndex: 9999, pointerEvents: isComplete ? "none" : "auto" }}>
            {/* Background Curtain */}
            <motion.div
                animate={isComplete ? { y: "-100%" } : { y: 0 }}
                transition={{ duration: 0.8, ease: [0.76, 0, 0.24, 1] }}
                style={{
                    width: "100%",
                    height: "100%",
                    backgroundColor: backgroundColor,
                    position: "absolute",
                    top: 0,
                    left: 0
                }}
            />

            {/* Logo Container */}
            <motion.div
                animate={isComplete ? { opacity: 0, y: -50 } : { opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center"
                }}
            >
                {/* Base Logo (Dimmed) */}
                <div
                    style={{
                        position: "absolute",
                        width: "200px",
                        height: "200px",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        opacity: 0.2,
                        zIndex: 1,
                        maskImage: `url(${logoSrc})`,
                        WebkitMaskImage: `url(${logoSrc})`,
                        maskSize: "contain",
                        WebkitMaskSize: "contain",
                        maskRepeat: "no-repeat",
                        WebkitMaskRepeat: "no-repeat",
                        maskPosition: "center",
                        WebkitMaskPosition: "center",
                        backgroundColor: logoColor
                    }}
                />

                {/* Filling Logo (Bright) */}
                <motion.div
                    style={{
                        position: "absolute",
                        width: "200px",
                        height: "200px",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        zIndex: 2,
                        opacity: 1,
                        maskImage: `url(${logoSrc})`,
                        WebkitMaskImage: `url(${logoSrc})`,
                        maskSize: "contain",
                        WebkitMaskSize: "contain",
                        maskRepeat: "no-repeat",
                        WebkitMaskRepeat: "no-repeat",
                        maskPosition: "center",
                        WebkitMaskPosition: "center",
                        backgroundColor: logoColor,
                        clipPath: clipPath
                    }}
                />
            </motion.div>
        </div>
    );
}
