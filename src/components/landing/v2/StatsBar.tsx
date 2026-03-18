import { motion, useInView } from "framer-motion";
import { useRef, useEffect, useState } from "react";
import { Trophy, Users, Zap, Globe } from "lucide-react";

interface StatItemProps {
    icon: React.ReactNode;
    value: number;
    suffix: string;
    label: string;
    delay: number;
}

const useCountUp = (end: number, duration: number, startCounting: boolean) => {
    const [count, setCount] = useState(0);

    useEffect(() => {
        if (!startCounting) return;
        let startTime: number;
        let animationFrame: number;

        const animate = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / (duration * 1000), 1);
            // Ease out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.floor(eased * end));
            if (progress < 1) {
                animationFrame = requestAnimationFrame(animate);
            }
        };

        animationFrame = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animationFrame);
    }, [end, duration, startCounting]);

    return count;
};

const StatItem = ({ icon, value, suffix, label, delay }: StatItemProps) => {
    const ref = useRef<HTMLDivElement>(null);
    const isInView = useInView(ref, { once: true, amount: 0.5 });
    const count = useCountUp(value, 2, isInView);

    return (
        <motion.div
            ref={ref}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay }}
            className="flex flex-col items-center gap-2 px-6 md:px-12"
        >
            <div className="text-rose-500/60 mb-1">{icon}</div>
            <div className="text-3xl md:text-5xl font-extrabold text-white font-heading tabular-nums">
                {count.toLocaleString()}{suffix}
            </div>
            <div className="text-xs md:text-sm text-white/40 tracking-[0.2em] uppercase font-medium">
                {label}
            </div>
        </motion.div>
    );
};

const StatsBar = () => {
    return (
        <section className="py-16 md:py-20 bg-[#050505] relative overflow-hidden">
            {/* Top accent line */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-rose-500/30 to-transparent" />

            <div className="container mx-auto px-4">
                <div className="flex flex-wrap justify-center items-center gap-8 md:gap-0 md:divide-x md:divide-white/10">
                    <StatItem
                        icon={<Trophy className="w-5 h-5" />}
                        value={500}
                        suffix="+"
                        label="Tournaments"
                        delay={0}
                    />
                    <StatItem
                        icon={<Users className="w-5 h-5" />}
                        value={12000}
                        suffix="+"
                        label="Players"
                        delay={0.1}
                    />
                    <StatItem
                        icon={<Zap className="w-5 h-5" />}
                        value={50000}
                        suffix="+"
                        label="Matches Played"
                        delay={0.2}
                    />
                    <StatItem
                        icon={<Globe className="w-5 h-5" />}
                        value={30}
                        suffix="+"
                        label="Countries"
                        delay={0.3}
                    />
                </div>
            </div>

            {/* Bottom accent line */}
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-rose-500/30 to-transparent" />
        </section>
    );
};

export default StatsBar;
