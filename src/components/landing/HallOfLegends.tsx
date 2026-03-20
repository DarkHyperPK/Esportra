import { motion } from "framer-motion";

const testimonials = [
    {
        name: "Alex 'Apex' Rivers",
        role: "Professional Player",
        quote: "Esportra didn't just give me tournaments; they gave me a trajectory. The verified results made me visible to scouts.",
        image: "https://images.unsplash.com/photo-1566492031773-4f4e44671857?q=80&w=800&auto=format&fit=crop"
    },
    {
        name: "Sarah 'Sera' Chen",
        role: "League Organizer",
        quote: "Managing 128-team brackets used to be a nightmare of spreadsheets. Now it's a few clicks. Game changer.",
        image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=800&auto=format&fit=crop"
    },
    {
        name: "Marcus Thorne",
        role: "Venue Owner",
        quote: "Our LAN nights have tripled in attendance since we listed our space here. The community found us.",
        image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=800&auto=format&fit=crop"
    }
];

const HallOfLegends = () => {
    return (
        <section className="py-32 bg-[#0a0a0a] overflow-hidden border-t border-white/5">
            <div className="container mx-auto px-4 mb-20 text-center">
                <motion.span
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    className="text-emerald-400 text-sm tracking-[0.4em] uppercase font-medium mb-4 block"
                >
                    Community Voices
                </motion.span>
                <motion.h2
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    className="text-4xl md:text-6xl font-light text-white font-heading"
                >
                    Join the ranks <br />
                    <span className="font-medium italic">of the elite.</span>
                </motion.h2>
            </div>

            <div className="flex gap-8 px-4 overflow-x-auto pb-12 snap-x hide-scrollbar">
                {testimonials.map((item, index) => (
                    <motion.div
                        key={item.name}
                        initial={{ opacity: 0, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: index * 0.1 }}
                        className="flex-none w-[300px] md:w-[450px] snap-center bg-white/[0.02] border border-white/10 p-8 md:p-12 group hover:border-emerald-400/30 transition-all duration-500"
                    >
                        <div className="relative mb-8 w-20 h-20 overflow-hidden rounded-full grayscale group-hover:grayscale-0 transition-all duration-700">
                            <img src={item.image} loading="lazy" alt={item.name} className="object-cover w-full h-full scale-110 group-hover:scale-100 transition-transform duration-700" />
                        </div>
                        <p className="text-xl md:text-2xl text-white font-light font-heading leading-relaxed mb-8">
                            "{item.quote}"
                        </p>
                        <div>
                            <h4 className="text-white font-medium text-lg">{item.name}</h4>
                            <p className="text-white/40 text-sm tracking-widest uppercase">{item.role}</p>
                        </div>
                    </motion.div>
                ))}
            </div>
        </section>
    );
};

export default HallOfLegends;
