import { motion } from "framer-motion";

const LogoTicker = () => {
    return (
        <div className="py-16 bg-[#0a0a0a] border-y border-white/5 flex flex-col items-center justify-center relative overflow-hidden">
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-center"
            >
                <span className="text-white/20 text-[10px] tracking-[0.8em] uppercase font-bold mb-2 block ml-[0.8em]">
                    Our Partners
                </span>
            </motion.div>

            {/* Subtle background glow to keep it premium */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-full bg-blue-500/5 blur-[100px] rounded-full -z-10" />
        </div>
    );
};

export default LogoTicker;
