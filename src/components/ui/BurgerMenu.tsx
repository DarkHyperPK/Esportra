import { motion } from "framer-motion";

interface BurgerMenuProps {
    isOpen: boolean;
    onClick: () => void;
    className?: string;
}

export function BurgerMenu({ isOpen, onClick, className }: BurgerMenuProps) {
    const variant = isOpen ? "clicked" : "default";

    return (
        <motion.button
            onClick={onClick}
            className={`relative w-12 h-12 rounded-full flex flex-col items-center justify-center gap-[5px] border border-white/10 ${className}`}
            animate={variant}
            initial="default"
            variants={{
                default: { backgroundColor: "rgba(0, 0, 0, 0.5)" },
                clicked: { backgroundColor: "rgba(255, 255, 255, 1)" }
            }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
        >
            <motion.div
                className="relative flex flex-col items-center justify-between h-[16px] w-6" // Container for lines
                variants={{
                    default: { rotate: 0 },
                    clicked: { rotate: 180 }
                }}
                transition={{ duration: 0.4 }}
            >
                {/* Top Line */}
                <motion.div
                    className="w-full h-[2px] rounded-full origin-left"
                    variants={{
                        default: { backgroundColor: "rgba(255, 255, 255, 1)", rotate: 0, y: 0 },
                        clicked: { backgroundColor: "rgba(0, 0, 0, 1)", rotate: 45, y: -2, x: 3 }
                        // Framer used origin point manipulation. 
                        // Let's try to match the visual: top line becomes one stroke of X.
                    }}
                    style={{ originX: 0, originY: 0 }}
                    transition={{ duration: 0.4 }}
                />

                {/* Middle Line */}
                <motion.div
                    className="w-full h-[2px] rounded-full"
                    variants={{
                        default: { backgroundColor: "rgba(255, 255, 255, 1)", opacity: 1, width: "100%" },
                        clicked: { backgroundColor: "rgba(0, 0, 0, 1)", opacity: 0, width: 0 }
                    }}
                    transition={{ duration: 0.2 }}
                />

                {/* Bottom Line */}
                <motion.div
                    className="w-full h-[2px] rounded-full origin-left"
                    variants={{
                        default: { backgroundColor: "rgba(255, 255, 255, 1)", rotate: 0, y: 0 },
                        clicked: { backgroundColor: "rgba(0, 0, 0, 1)", rotate: -45, y: 2, x: 3 }
                    }}
                    style={{ originX: 0, originY: 1 }}
                    transition={{ duration: 0.4 }}
                />
            </motion.div>
        </motion.button>
    );
}
