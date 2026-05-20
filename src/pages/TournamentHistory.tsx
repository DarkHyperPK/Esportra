import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/apiClient';
import { Link } from 'react-router-dom';
import Footer from '@/components/Footer';
import { Trophy, Calendar, Search, Users, Crown, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { motion } from 'framer-motion';
import { useRawgGame } from '@/hooks/useRawgGame';

interface HistoryCardProps {
    t: any;
}

const HistoryCard = ({ t }: HistoryCardProps) => {
    const { gameBanner } = useRawgGame(t.game || '', { skipRawg: true, enableCarousel: false });
    const isVideo = t.banner_url?.includes('youtube.com/embed/');
    const hasImage = t.banner_url && !isVideo;
    const detailPath = `/tournaments/${t.slug || t.id}`;

    return (
        <motion.div
            key={t.id}
            variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] } }
            }}
            whileHover={{ y: -8, scale: 1.01 }}
            transition={{ duration: 0.3 }}
            className="group relative h-[420px] overflow-hidden bg-[#0a0a0c] border border-white/5"
        >
            <Link
                to={detailPath}
                aria-label={`View results for ${t.name}`}
                className="block h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            >
            {/* Background Image */}
            <div className="absolute inset-0 z-0">
                <motion.div
                    className="w-full h-full"
                    whileHover={{ scale: 1.05 }}
                    transition={{ duration: 0.7 }}
                >
                    {hasImage ? (
                        <img
                            src={t.banner_url}
                            alt={t.name}
                            className="w-full h-full object-cover object-center opacity-50 group-hover:opacity-60 transition-opacity duration-500"
                        />
                    ) : gameBanner ? (
                        <img
                            src={gameBanner}
                            className="w-full h-full object-cover object-center opacity-50"
                            alt={t.game}
                        />
                    ) : (
                        <img
                            src="/placeholder.svg"
                            className="w-full h-full object-cover object-center opacity-50"
                            alt={t.name}
                        />
                    )}
                </motion.div>

                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0c] via-[#0a0a0c]/50 to-transparent" />
            </div>

            {/* Top Bar */}
            <div className="absolute top-0 inset-x-0 p-4 flex justify-between items-start z-10">
                <Badge className="bg-emerald-600 text-white border-none">
                    COMPLETED
                </Badge>

                {t.prize_pool && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#0a0a0c] border border-white/10 text-emerald-400 font-medium text-sm">
                        <Trophy className="w-3.5 h-3.5" />
                        <span>${t.prize_pool}</span>
                    </div>
                )}
            </div>

            {/* Bottom Content */}
            <div className="absolute bottom-0 inset-x-0 p-6 z-20 flex flex-col gap-4">
                {/* Game Label */}
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold tracking-widest text-rose-400 uppercase font-heading">
                        {t.game || 'Tournament'}
                    </span>
                    <div className="h-[1px] flex-grow bg-gradient-to-r from-rose-500/50 to-transparent" />
                </div>

                {/* Title */}
                <h3 className="text-2xl font-bold text-white leading-tight line-clamp-2 group-hover:text-gray-200 transition-colors">
                    {t.name}
                </h3>

                {/* Champion Badge */}
                {t.teams?.name && (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
                        <Crown className="w-5 h-5 text-yellow-400" />
                        <div>
                            <div className="text-[10px] text-yellow-400/70 uppercase tracking-widest">Champion</div>
                            <div className="text-sm font-bold text-yellow-300">{t.teams.name}</div>
                        </div>
                    </div>
                )}

                {/* Metadata */}
                <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-gray-400">
                    <div className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-gray-500" />
                        <span>{t.start_date ? new Date(t.start_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'TBD'}</span>
                    </div>
                    {t.max_teams && (
                        <div className="flex items-center gap-1.5">
                            <Users className="w-4 h-4 text-gray-500" />
                            <span>{t.max_teams} Teams</span>
                        </div>
                    )}
                </div>

                {/* Action Button - Slides up on hover */}
                <div className="h-0 opacity-0 group-hover:h-auto group-hover:opacity-100 transition-all duration-300 overflow-hidden">
                    <span className="inline-flex w-full items-center justify-center rounded-xl bg-white px-4 py-2 font-bold tracking-wide text-black transition-colors duration-300 group-hover:bg-rose-500 group-hover:text-white">
                        <span>View Results</span>
                        <ChevronRight className="w-4 h-4 ml-2" />
                    </span>
                </div>
            </div>

            {/* Decorative Glow Border */}
            <div className="absolute inset-0 border border-white/5 group-hover:border-white/20 transition-colors duration-300 pointer-events-none" />
            </Link>
        </motion.div>
    );
};

const TournamentHistoryPage = () => {
    const [tournaments, setTournaments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const fetchHistory = async () => {
            setLoading(true);
            try {
                const data = await apiClient.get<any[]>('/api/tournaments?status=completed');
                setTournaments(data || []);
            } catch (error) {
                console.error('Error fetching global history:', error);
            }
            setLoading(false);
        };

        fetchHistory();
    }, []);

    const filteredTournaments = tournaments.filter(t =>
    (t.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.game?.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.08 }
        }
    };

    return (
        <div className="min-h-screen text-white flex flex-col pt-24 pb-12">
            <main className="flex-grow container mx-auto px-4 relative max-w-7xl">

                    {/* Header Section */}
                    <div className="mb-12 pb-8 border-b border-white/10">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                            <motion.div
                                initial={{ opacity: 0, y: -20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5 }}
                            >
                                <h1 className="text-4xl md:text-5xl font-bold text-white">
                                    Tournament History
                                </h1>
                                <p className="text-gray-400 font-light tracking-wide mt-2 max-w-xl">
                                    Relive the glory. Browse through all completed tournaments and their champions.
                                </p>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.5, delay: 0.2 }}
                                className="w-full md:w-96 relative"
                            >
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                <Input
                                    placeholder="Search tournaments..."
                                    className="bg-[#0a0a0c] border-white/10 pl-11 h-12 rounded-xl focus:border-rose-500/50 focus:ring-rose-500/20"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </motion.div>
                        </div>

                        {/* Stats Bar */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.4 }}
                            className="flex items-center gap-6 mt-6 text-sm"
                        >
                            <div className="flex items-center gap-2 text-gray-400">
                                <span className="text-white font-bold text-lg">{tournaments.length}</span>
                                <span>Completed Tournaments</span>
                            </div>
                        </motion.div>
                    </div>

                    {/* Loading State */}
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 text-gray-500 gap-4">
                            <div className="w-10 h-10 border-2 border-esports-purple border-t-transparent rounded-full animate-spin" />
                            <p className="font-light tracking-wide">Loading archives...</p>
                        </div>
                    ) : (
                        <motion.div
                            variants={containerVariants}
                            initial="hidden"
                            animate="visible"
                            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                        >
                            {filteredTournaments.length > 0 ? (
                                filteredTournaments.map((t) => (
                                    <HistoryCard key={t.id} t={t} />
                                ))
                            ) : (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="col-span-full flex flex-col items-center justify-center py-20 text-center bg-[#0a0a0c] border border-white/10"
                                >
                                    <Trophy className="w-16 h-16 text-gray-600 mb-4" />
                                    <h3 className="text-2xl font-bold text-white mb-2">No Tournaments Found</h3>
                                    <p className="text-gray-400 max-w-md">
                                        {searchQuery
                                            ? `No completed tournaments match "${searchQuery}".`
                                            : 'There are no completed tournaments in the archive yet.'}
                                    </p>
                                    {searchQuery && (
                                        <Button
                                            variant="outline"
                                            className="mt-6 border-white/10 hover:bg-white/5"
                                            onClick={() => setSearchQuery('')}
                                        >
                                            Clear Search
                                        </Button>
                                    )}
                                </motion.div>
                            )}
                        </motion.div>
                    )}
                </main>

                <div className="relative z-10 mt-20">
                    <Footer />
                </div>
        </div>
    );
};

export default TournamentHistoryPage;
