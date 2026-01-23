import React, { useState, useRef, useEffect, startTransition, createContext, useContext } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

// --- Context ---
interface FramerDropdownContextType {
    isOpen: boolean;
    setIsOpen: (v: boolean) => void;
    close: () => void;
    config: {
        backgroundColor: string;
        borderColor: string;
        accentColor: string;
        borderRadius: number;
        padding: number;
        font: any;
        textColor: string;
    };
}

const FramerDropdownContext = createContext<FramerDropdownContextType | undefined>(undefined);

const useFramerDropdown = () => {
    const context = useContext(FramerDropdownContext);
    if (!context) throw new Error("FramerDropdown components must be used within FramerDropdownRoot");
    return context;
};

// --- Props ---
interface FramerDropdownRootProps {
    children: React.ReactNode;
    backgroundColor?: string;
    textColor?: string;
    borderColor?: string;
    accentColor?: string;
    font?: any;
    borderRadius?: number;
    padding?: number;
    className?: string;
}

// --- Root Component ---
export function FramerDropdownRoot({
    children,
    backgroundColor = "#09090b",
    textColor = "#ffffff",
    borderColor = "rgba(255,255,255,0.1)",
    accentColor = "#10b981",
    font = { fontSize: 14 },
    borderRadius = 12,
    padding = 12,
    className,
}: FramerDropdownRootProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const close = () => startTransition(() => setIsOpen(false));

    useEffect(() => {
        if (!isOpen) return;
        const handleClickOutside = (event: MouseEvent) => {
            if (
                containerRef.current &&
                !containerRef.current.contains(event.target as Node)
            ) {
                close();
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen]);

    const contextValue = {
        isOpen,
        setIsOpen,
        close,
        config: {
            backgroundColor,
            borderColor,
            accentColor,
            borderRadius,
            padding,
            font,
            textColor
        }
    };

    return (
        <FramerDropdownContext.Provider value={contextValue}>
            <div
                ref={containerRef}
                className={cn("relative inline-block text-left", className)}
                style={{ zIndex: isOpen ? 50 : 1 }}
            >
                {children}
            </div>
        </FramerDropdownContext.Provider>
    );
}

// --- Trigger ---
export function FramerDropdownTrigger({ children, asChild, className }: { children: React.ReactNode, asChild?: boolean, className?: string }) {
    const { isOpen, setIsOpen } = useFramerDropdown();

    const handleClick = () => startTransition(() => setIsOpen(!isOpen));

    if (asChild && React.isValidElement(children)) {
        return React.cloneElement(children as React.ReactElement<any>, {
            onClick: (e: React.MouseEvent) => {
                children.props.onClick?.(e);
                handleClick();
            },
        });
    }

    return (
        <div onClick={handleClick} className={cn("cursor-pointer", className)}>
            {children}
        </div>
    );
}

// --- Content ---
const menuVariants = {
    closed: {
        opacity: 0,
        y: -4,
        scale: 0.98,
        transition: { duration: 0.15, ease: "easeInOut" },
        pointerEvents: "none" as const,
    },
    open: {
        opacity: 1,
        y: 4,
        scale: 1,
        transition: { duration: 0.2, ease: "easeOut" },
        pointerEvents: "auto" as const,
    },
};

export function FramerDropdownContent({ children, className, width = "100%", align = "start" }: { children: React.ReactNode, className?: string, width?: string | number, align?: "start" | "end" | "center" }) {
    const { isOpen, config } = useFramerDropdown();

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial="closed"
                    animate="open"
                    exit="closed"
                    variants={menuVariants}
                    style={{
                        backgroundColor: config.backgroundColor,
                        border: `1px solid ${config.borderColor}`,
                        borderRadius: config.borderRadius,
                        padding: 4,
                        ...config.font,
                    }}
                    className={cn(
                        `absolute top-full mt-2 z-[1000] min-w-[200px] overflow-hidden rounded-2xl border border-white/10 bg-[#0f111a]/95 text-white shadow-[0_15px_40px_rgba(0,0,0,0.65)] backdrop-blur-2xl ${align === 'end' ? 'right-0' : align === "center" ? "left-1/2 -translate-x-1/2" : "left-0"}`,
                        className
                    )}
                // css not standard here, using style instead for width
                >
                    <div style={{ width: width, minWidth: 200, maxHeight: "80vh", overscrollBehavior: "contain" }}>
                        {children}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

// --- Item ---
interface FramerDropdownItemProps {
    children?: React.ReactNode;
    onClick?: () => void;
    isSelected?: boolean;
    closeOnSelect?: boolean;
    className?: string;
    to?: string;
    icon?: React.ReactNode;
}

export function FramerDropdownItem({
    children,
    onClick,
    isSelected,
    closeOnSelect = true,
    className,
    to,
    icon
}: FramerDropdownItemProps) {
    const { close, config } = useFramerDropdown();
    const [isHovered, setIsHovered] = useState(false);
    const navigate = useNavigate();

    const handleClick = () => {
        if (onClick) onClick();
        if (to) navigate(to);
        if (closeOnSelect) close();
    };

    const accentColor = config.accentColor;
    const textColor = config.textColor;

    return (
        <motion.div
            onClick={handleClick}
            onHoverStart={() => setIsHovered(true)}
            onHoverEnd={() => setIsHovered(false)}
            className={cn("flex items-center justify-between select-none", className)}
            style={{
                padding: `8px ${config.padding}px`,
                cursor: "pointer",
                borderRadius: Math.max(0, config.borderRadius - 2),
                backgroundColor: isSelected
                    ? `${accentColor}15`
                    : "transparent",
                color: isSelected ? accentColor : textColor,
                borderLeft: `2px solid ${isHovered && !isSelected
                    ? `${accentColor}60`
                    : "transparent"
                    }`,
                transition: "border-color 0.2s ease, background-color 0.2s ease",
                paddingLeft: `${config.padding - 2}px`,
            }}
            whileHover={{
                backgroundColor: isSelected ? `${accentColor}15` : `${accentColor}14`,
            }}
        >
            <div className="flex items-center gap-2 overflow-hidden w-full">
                {icon && <span className="flex-shrink-0">{icon}</span>}
                <span className="truncate w-full" style={{ fontWeight: isSelected ? 500 : 400 }}>
                    {children}
                </span>
            </div>

            {isSelected && (
                <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    style={{ color: accentColor }}
                    className="flex-shrink-0 ml-2"
                >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </motion.div>
            )}
        </motion.div>
    );
}

// --- Separator ---
export function FramerDropdownSeparator() {
    const { config } = useFramerDropdown();
    return <div className="h-px w-full my-1" style={{ backgroundColor: config.borderColor }} />;
}

// --- Monolithic Helper (Optional) ---
// Not strictly needed if we migrate everything, but kept for compatibility logic if needed.
