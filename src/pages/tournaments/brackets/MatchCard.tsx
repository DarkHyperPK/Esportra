import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, PlayCircle, Swords, Eye, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { BracketMatch } from '@/types/bracketTypes';

// =============================================================================
// LAYOUT CONSTANTS
// =============================================================================
const CARD_WIDTH = 320;
const CARD_HEIGHT = 180;

interface MatchCardProps {
    match: BracketMatch;
    x?: number;
    y?: number;
    label: string;
    expandedMatchId: string | null;
    onToggleExpand: (id: string) => void;
    isOrganizer: boolean;
    isProcessing: boolean;
    onScoreChange: (id: string, t: 't1' | 't2', v: string) => void;
    onGoLive: (m: BracketMatch) => void;
    onMapVeto: (m: BracketMatch) => void;
    onPartyCode: (m: BracketMatch) => void;
    onSaveScore: (m: BracketMatch) => void;
    scoreDraftRef: React.MutableRefObject<Record<string, { t1: string; t2: string }>>;
    proofs?: string[];
}

const areMatchPropsEqual = (prev: MatchCardProps, next: MatchCardProps) => {
    return (
        prev.match.id === next.match.id &&
        prev.match.status === next.match.status &&
        prev.match.team1_score === next.match.team1_score &&
        prev.match.team2_score === next.match.team2_score &&
        prev.match.team1?.id === next.match.team1?.id &&
        prev.match.team2?.id === next.match.team2?.id &&
        prev.match.winner?.id === next.match.winner?.id &&
        prev.match.partyCode === next.match.partyCode &&
        prev.x === next.x &&
        prev.y === next.y &&
        prev.expandedMatchId === next.expandedMatchId &&
        prev.isProcessing === next.isProcessing &&
        prev.isOrganizer === next.isOrganizer &&
        prev.proofs?.length === next.proofs?.length
    );
};

export const MatchCard: React.FC<MatchCardProps> = React.memo(({
    match, x, y, label,
    expandedMatchId, onToggleExpand,
    isOrganizer, isProcessing,
    onScoreChange, onGoLive, onMapVeto, onPartyCode, onSaveScore,
    scoreDraftRef, proofs
}) => {
    const id = String(match.id);
    const isExp = expandedMatchId === id;
    const getRawId = (id: string | number) => String(id).replace('db-', '');
    const isDbMatch = (id: string | number) => String(id).startsWith('db-');
    const draft = scoreDraftRef.current[getRawId(id)] || { t1: '', t2: '' };
    const isLive = match.status === 'in_progress';
    const isComplete = match.status === 'completed';
    const hasBoth = match.team1?.name && match.team2?.name && !match.team1.name.includes('TBD');
    const canAct = isOrganizer && isDbMatch(id);
    const w1 = match.winner?.id === match.team1?.id;
    const w2 = match.winner?.id === match.team2?.id;
    const [showProofs, setShowProofs] = useState(false);

    // Status Badge Color
    const statusColor = isLive ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : isComplete ? 'bg-zinc-800 text-zinc-400 border-zinc-700' : 'bg-zinc-800/50 text-zinc-500 border-zinc-800';

    const style: React.CSSProperties = x !== undefined && y !== undefined ? {
        position: 'absolute', left: x, top: y, width: CARD_WIDTH, minHeight: CARD_HEIGHT, zIndex: isExp ? 50 : 10
    } : {
        position: 'relative', width: '100%', maxWidth: CARD_WIDTH, minHeight: CARD_HEIGHT, zIndex: isExp ? 50 : 10
    };

    return (
        <div style={style}>
            <div
                className={`rounded-xl overflow-hidden border transition-all duration-300 flex flex-col relative group
          ${isLive ? 'border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.1)]' :
                        isExp ? 'border-zinc-600 bg-zinc-900' :
                            'border-white/10 hover:border-white/20 bg-zinc-900/60 hover:bg-zinc-900/80'}`}
                style={{
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                }}
            >

                <div className="p-5 relative cursor-pointer" onClick={() => onToggleExpand(id)}>

                    {/* VS Divider - Minimalist */}
                    <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none opacity-30 group-hover:opacity-50 transition-opacity">
                        <div className="w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent absolute"></div>
                    </div>

                    {/* Team 1 */}
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            {match.team1?.logo_url ? (
                                <img src={match.team1.logo_url} alt={match.team1.name} className="w-8 h-8 object-contain" />
                            ) : (
                                <span className="text-xs font-semibold text-zinc-500">{(match.team1?.name || 'T1').slice(0, 2).toUpperCase()}</span>
                            )}
                            <span className={`text-sm font-medium truncate max-w-[140px] ${w1 ? 'text-white' : 'text-zinc-400'}`}>
                                {match.team1?.name || 'TBD'}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            {(!match.team1?.name || match.team1.name === 'TBD') && (
                                <Trophy className="w-4 h-4 text-zinc-800" />
                            )}
                            {canAct && isLive ? (
                                <input
                                    type="number"
                                    min="0"
                                    className="w-10 h-8 bg-white/10 border border-white/20 text-center rounded-md font-bold text-sm focus:border-green-400 focus:outline-none"
                                    defaultValue={draft.t1 || match.team1_score?.toString() || ''}
                                    placeholder="0"
                                    onChange={(e) => onScoreChange(id, 't1', e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                />
                            ) : (
                                <span className={`text-lg font-bold w-6 text-right ${w1 ? 'text-white' : 'text-zinc-600'}`}>
                                    {match.team1_score ?? '-'}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Team 2 */}
                    <div className="flex items-center justify-between mt-6">
                        <div className="flex items-center gap-3">
                            {match.team2?.logo_url ? (
                                <img src={match.team2.logo_url} alt={match.team2.name} className="w-8 h-8 object-contain" />
                            ) : (
                                <span className="text-xs font-semibold text-zinc-500">{(match.team2?.name || 'T2').slice(0, 2).toUpperCase()}</span>
                            )}
                            <span className={`text-sm font-medium truncate max-w-[140px] ${w2 ? 'text-white' : 'text-zinc-400'}`}>
                                {match.team2?.name || 'TBD'}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            {(!match.team2?.name || match.team2.name === 'TBD') && (
                                <Trophy className="w-4 h-4 text-zinc-800" />
                            )}
                            {canAct && isLive ? (
                                <input
                                    type="number"
                                    min="0"
                                    className="w-10 h-8 bg-white/10 border border-white/20 text-center rounded-md font-bold text-sm focus:border-green-400 focus:outline-none"
                                    defaultValue={draft.t2 || match.team2_score?.toString() || ''}
                                    placeholder="0"
                                    onChange={(e) => onScoreChange(id, 't2', e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                />
                            ) : (
                                <span className={`text-lg font-bold w-6 text-right ${w2 ? 'text-white' : 'text-zinc-600'}`}>
                                    {match.team2_score ?? '-'}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-4 py-2 bg-black/20 border-t border-white/5 flex justify-between items-center h-9">
                    <span className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border ${statusColor}`}>
                        {label}
                    </span>
                    <div className="flex items-center gap-2">
                        {canAct && isLive && (
                            <Button
                                size="sm"
                                className="h-6 px-3 bg-green-600 hover:bg-green-500 text-white font-medium rounded text-xs"
                                onClick={(e) => { e.stopPropagation(); onSaveScore(match); }}
                                disabled={isProcessing}
                            >
                                Save
                            </Button>
                        )}
                        <ChevronDown className={`w-3 h-3 text-zinc-600 transition-transform cursor-pointer ${isExp ? 'rotate-180' : ''}`} onClick={() => onToggleExpand(id)} />
                    </div>
                </div>

                {/* Expanded Actions */}
                <AnimatePresence>
                    {isExp && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2, ease: 'easeOut' }}
                            className="overflow-hidden bg-black/20"
                        >
                            <div className="p-3 space-y-3 border-t border-white/5">

                                {/* Action Toolbar - Only show if both teams present */}
                                {hasBoth && (
                                    <div className="flex gap-2 flex-wrap">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className={`flex-1 min-w-[80px] h-8 bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800`}
                                            onClick={(e) => { e.stopPropagation(); setShowProofs(!showProofs); }}
                                        >
                                            <Eye className="w-3.5 h-3.5 mr-1.5" /> Results
                                        </Button>

                                        {isOrganizer && (
                                            <>
                                                {!isLive && !isComplete && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="flex-1 min-w-[80px] h-8 bg-green-900/20 border-green-900/30 text-green-400 hover:bg-green-900/40 hover:text-green-300"
                                                        onClick={(e) => { e.stopPropagation(); onGoLive(match); }}
                                                    >
                                                        <PlayCircle className="w-3.5 h-3.5 mr-1.5" /> Go Live
                                                    </Button>
                                                )}

                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="flex-1 min-w-[80px] h-8 bg-purple-500/10 border-purple-500/20 text-purple-400 hover:bg-purple-500/20 hover:text-purple-300"
                                                    onClick={(e) => { e.stopPropagation(); onMapVeto(match); }}
                                                >
                                                    <Swords className="w-3.5 h-3.5 mr-1.5" /> Veto
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                )}

                                {/* Proofs View */}
                                {showProofs && proofs && proofs.length > 0 && (
                                    <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="flex gap-2 overflow-x-auto pb-2 pt-1">
                                        {proofs.map((url, i) => (
                                            <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block w-16 h-12 rounded-lg overflow-hidden border border-white/10 hover:border-purple-500/50 transition-colors shrink-0" onClick={(e) => e.stopPropagation()}>
                                                <img src={url} alt="Proof" className="w-full h-full object-cover" />
                                            </a>
                                        ))}
                                    </motion.div>
                                )}


                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}, areMatchPropsEqual);
