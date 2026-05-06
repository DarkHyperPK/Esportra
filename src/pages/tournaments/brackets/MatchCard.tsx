import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, PlayCircle, Swords, Eye, ChevronDown, X, Bot, MessageCircle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import ManualAdjustmentMenu from '@/components/tournament/ManualAdjustmentMenu';

// =============================================================================
// LAYOUT CONSTANTS
// =============================================================================
const CARD_WIDTH = 320;
const CARD_HEIGHT = 180;
import { formatLocalTime } from '@/lib/timeUtils';
import EntityAvatar from '@/components/ui/EntityAvatar';

interface MatchCardProps {
    match: any; // BracketMatch or BracketNode
    x?: number;
    y?: number;
    label?: string;
    expandedMatchId?: string | null;
    onToggleExpand?: (id: string) => void;
    isOrganizer?: boolean;
    isProcessing?: boolean;
    onScoreChange?: (id: string, t: 't1' | 't2', v: string) => void;
    onGoLive?: (m: any, code?: string) => Promise<void> | void;
    onMapVeto?: (m: any) => void;
    onPartyCode?: (m: any) => void;
    onSaveScore?: (m: any) => void;
    scoreDraftRef?: React.MutableRefObject<Record<string, { t1: string; t2: string }>>;
    proofs?: string[];
    onByeAdvance?: (matchId: string) => void;
    onMatchClick?: () => void;
    onAdjustmentMade?: () => void;
    tournamentId?: string;
    versionId?: string | null;
    automatedStatus?: 'idle' | 'processing' | 'verified' | 'failed' | 'partial' | null;
    onViewResults?: (match: any) => void;
    onMatchRoom?: (match: any) => void;
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
        prev.onMatchRoom === next.onMatchRoom &&
        prev.proofs?.length === next.proofs?.length
    );
};

export const MatchCard: React.FC<MatchCardProps> = React.memo(({
    match, x, y, label,
    expandedMatchId, onToggleExpand,
    isOrganizer, isProcessing,
    onScoreChange, onGoLive, onMapVeto, onSaveScore,
    scoreDraftRef, proofs, onByeAdvance, onMatchClick, onAdjustmentMade,
    tournamentId, versionId,
    automatedStatus,
    onViewResults, onMatchRoom
}) => {
    const id = String(match.id);
    const isExp = expandedMatchId === id;
    const getRawId = (id: string | number) => String(id).replace(/^(db-|wb-|lb-)/, '');
    const isDbMatch = (id: string | number) => String(id).startsWith('db-');
    const draft = scoreDraftRef?.current?.[getRawId(id)] || { t1: '', t2: '' };
    const isLive = match.status === 'in_progress';
    const isComplete = match.status === 'completed';
    const hasBoth = match.team1?.name && match.team2?.name && !match.team1.name.includes('TBD');
    const canAct = isOrganizer && isDbMatch(id);
    const w1 = match.winner?.id === match.team1?.id;

    // Schedule validation: can't go live more than 15 minutes before scheduled time
    const isTooEarlyForLive = (() => {
        const st = match.scheduledTime || match.scheduled_time;
        if (!st) return false;
        const scheduledMs = new Date(st).getTime();
        const nowMs = Date.now();
        return scheduledMs - nowMs > 15 * 60 * 1000;
    })();
    const w2 = match.winner?.id === match.team2?.id;
    const [showProofs, setShowProofs] = useState(false);
    const [actionMode, setActionMode] = useState<'default' | 'party_code'>('default');
    const [partyCode, setPartyCode] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    // Scoring Hints based on BestOf
    const bestOf = match.bestOf || (match as any).best_of || 1;
    const isBo1 = bestOf === 1;
    const inputPlaceholder = isBo1 ? "13" : "0";
    const scoreTitle = isBo1 ? "Enter Rounds (e.g. 13)" : "Enter Map Wins (e.g. 2)";

    // Calculate max score for BO3/BO5 (First to X wins)
    // BO1 has no limit (rounds can go to OT)
    const maxScore = isBo1 ? undefined : Math.ceil(bestOf / 2);
    void maxScore;

    const handleScoreInput = (team: 't1' | 't2', value: string) => {
        // Allow empty input
        if (value === '') {
            onScoreChange?.(id, team, value);
            return;
        }

        const num = parseInt(value);
        if (isNaN(num)) return;

        // Validation relaxed to allow Round Scores even if BO3 (User request)
        // if (maxScore !== undefined && num > maxScore) {
        //    return; // Ignore input if it exceeds max
        // }

        onScoreChange?.(id, team, value);
    };

    const handleStart = async () => {
        if (!partyCode.trim()) return;
        setIsSubmitting(true);
        try {
            await onGoLive?.(match, partyCode.trim());
        } finally {
            setIsSubmitting(false);
            setActionMode('default');
            setPartyCode('');
        }
    };

    // Check if this is a BYE match (has exactly one team)
    // Check if this is a BYE match (has exactly one team)
    // Also consider it a BYE if one team is "TBD" or has no ID
    const t1Valid = match.team1?.id && match.team1.name !== 'TBD';
    const t2Valid = match.team2?.id && match.team2.name !== 'TBD';
    const isByeMatch = (t1Valid && !t2Valid) || (!t1Valid && t2Valid);
    const byeTeam = match.team1?.id ? match.team1 : match.team2;
    void byeTeam;

    // Status Badge Color
    const statusColor = isLive ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : isComplete ? 'bg-zinc-800 text-zinc-400 border-zinc-700' : 'bg-zinc-800/50 text-zinc-500 border-zinc-800';

    const showInputs = canAct && (isLive || isEditing);
    const canOpenMatchRoom = canAct && hasBoth && !!onMatchRoom;

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

                <div className="p-5 relative cursor-pointer" onClick={() => onToggleExpand ? onToggleExpand(id) : onMatchClick?.()}>

                    {/* VS Divider - Minimalist */}
                    <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none opacity-30 group-hover:opacity-50 transition-opacity">
                        <div className="w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent absolute"></div>
                    </div>

                    {/* Team 1 */}
                    <div
                        className={`flex items-center justify-between mb-6`}
                    >
                        <div className="flex items-center gap-3">
                            <EntityAvatar
                                src={match.team1?.logo_url}
                                name={match.team1?.name}
                                entityId={match.team1?.id}
                                type="team"
                                size="w-8 h-8"
                                className="mr-0"
                            />
                            <span className={`text-sm font-medium truncate max-w-[140px] ${w1 && !isEditing ? 'text-white' : 'text-zinc-400'}`}>
                                {match.team1?.name || (isComplete ? 'BYE' : 'TBD')}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            {(!match.team1?.name || match.team1.name === 'TBD') && (
                                <Trophy className="w-4 h-4 text-zinc-800" />
                            )}
                            {showInputs ? (
                                <AnimatePresence mode="wait" initial={false}>
                                    <motion.input
                                        key="input-t1"
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.8 }}
                                        transition={{ duration: 0.2 }}
                                        type="number"
                                        min="0"
                                        // max={maxScore} // Removed to allow freer input (rounds vs maps)
                                        className="w-10 h-8 bg-white/10 border border-white/20 text-center rounded-md font-bold text-sm focus:border-green-400 focus:outline-none"
                                        defaultValue={draft.t1 || match.team1_score?.toString() || ''}
                                        placeholder={inputPlaceholder}
                                        title={scoreTitle}
                                        onChange={(e) => handleScoreInput('t1', e.target.value)}
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                </AnimatePresence>
                            ) : (
                                <AnimatePresence mode="wait" initial={false}>
                                    <motion.span
                                        key="score-t1"
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.8 }}
                                        transition={{ duration: 0.2 }}
                                        className={`text-lg font-bold w-6 text-right ${w1 ? 'text-white' : 'text-zinc-600'}`}
                                    >
                                        {match.team1_score ?? '-'}
                                    </motion.span>
                                </AnimatePresence>
                            )}
                        </div>
                    </div>

                    {/* Team 2 */}
                    <div
                        className={`flex items-center justify-between mt-6`}
                    >
                        <div className="flex items-center gap-3">
                            <EntityAvatar
                                src={match.team2?.logo_url}
                                name={match.team2?.name}
                                entityId={match.team2?.id}
                                type="team"
                                size="w-8 h-8"
                                className="mr-0"
                            />
                            <span className={`text-sm font-medium truncate max-w-[140px] ${w2 && !isEditing ? 'text-white' : 'text-zinc-400'}`}>
                                {match.team2?.name || (isComplete ? 'BYE' : 'TBD')}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            {(!match.team2?.name || match.team2.name === 'TBD') && (
                                <Trophy className="w-4 h-4 text-zinc-800" />
                            )}
                            {showInputs ? (
                                <AnimatePresence mode="wait" initial={false}>
                                    <motion.input
                                        key="input-t2"
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.8 }}
                                        transition={{ duration: 0.2 }}
                                        type="number"
                                        min="0"
                                        // max={maxScore}
                                        className="w-10 h-8 bg-white/10 border border-white/20 text-center rounded-md font-bold text-sm focus:border-green-400 focus:outline-none"
                                        defaultValue={draft.t2 || match.team2_score?.toString() || ''}
                                        placeholder={inputPlaceholder}
                                        title={scoreTitle}
                                        onChange={(e) => handleScoreInput('t2', e.target.value)}
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                </AnimatePresence>
                            ) : (
                                <AnimatePresence mode="wait" initial={false}>
                                    <motion.span
                                        key="score-t2"
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.8 }}
                                        transition={{ duration: 0.2 }}
                                        className={`text-lg font-bold w-6 text-right ${w2 ? 'text-white' : 'text-zinc-600'}`}
                                    >
                                        {match.team2_score ?? '-'}
                                    </motion.span>
                                </AnimatePresence>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-4 py-2 bg-black/20 border-t border-white/5 flex justify-between items-center h-9">
                    <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border ${statusColor}`}>
                            {label}
                        </span>
                        {match.scheduledTime && (
                            <span className="text-[10px] font-medium text-zinc-500 flex items-center">
                                {formatLocalTime(match.scheduledTime, 'MMM d • h:mm a')}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        {/* BYE Button - Show when match has exactly one team and is not complete */}
                        {canAct && isByeMatch && !isComplete && onByeAdvance && (
                            <Button
                                size="sm"
                                className="h-6 px-3 bg-amber-600 hover:bg-amber-500 text-white font-medium rounded text-xs"
                                onClick={(e) => { e.stopPropagation(); onByeAdvance(getRawId(id)); }}
                                disabled={isProcessing}
                            >
                                Advance BYE
                            </Button>
                        )}
                        {canAct && isComplete && !isEditing && (
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-6 px-3 border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-800 font-medium rounded text-xs"
                                onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
                                disabled={isProcessing}
                            >
                                Edit
                            </Button>
                        )}
                        {canAct && (isLive || isEditing) && (
                            <Button
                                size="sm"
                                className={`h-6 px-3 ${isEditing ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-green-600 hover:bg-green-500'} text-white font-medium rounded text-xs`}
                                onClick={async (e) => {
                                    e.stopPropagation();
                                    if (onSaveScore) await onSaveScore(match);
                                    setIsEditing(false);
                                }}
                                disabled={isProcessing}
                            >
                                {isEditing ? 'Update' : 'Save'}
                            </Button>
                        )}
                        {/* Manual Adjustment Menu for organizers */}
                        {canAct && (
                            <ManualAdjustmentMenu
                                matchId={getRawId(id)}
                                tournamentId={tournamentId}
                                versionId={versionId}
                                team1Id={match.team1?.id}
                                team2Id={match.team2?.id}
                                team1Name={match.team1?.name || 'Team 1'}
                                team2Name={match.team2?.name || 'Team 2'}
                                matchStatus={match.status}
                                onAdjustmentMade={onAdjustmentMade}
                                bestOf={bestOf}
                            />
                        )}
                        <ChevronDown className={`w-3 h-3 text-zinc-600 transition-transform cursor-pointer ${isExp ? 'rotate-180' : ''}`} onClick={() => onToggleExpand?.(id)} />
                    </div>
                </div>

                {/* Expanded Actions */}
                <AnimatePresence>
                    {isExp && (
                        <motion.div
                            initial={{ opacity: 0, gridTemplateRows: '0fr' }}
                            animate={{ opacity: 1, gridTemplateRows: '1fr' }}
                            exit={{ opacity: 0, gridTemplateRows: '0fr' }}
                            transition={{ duration: 0.2, ease: 'easeOut' }}
                            style={{ display: 'grid', overflow: 'hidden' }}
                            className="bg-black/20"
                        >
                        <div style={{ minHeight: 0, overflow: 'hidden' }}>
                            <div className="p-3 space-y-3 border-t border-white/5">

                                {/* Action Toolbar - Only show if both teams present */}
                                {hasBoth && (
                                    <AnimatePresence mode="wait">
                                        {actionMode === 'default' ? (
                                            <motion.div
                                                key="default-actions"
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -10 }}
                                                transition={{ duration: 0.2 }}
                                                className="flex gap-2 flex-wrap"
                                                layout
                                            >
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className={cn(
                                                        "flex-1 min-w-[80px] h-8 bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800",
                                                        automatedStatus === 'verified' && "border-blue-500/30 text-blue-400 bg-blue-500/5 hover:bg-blue-500/10"
                                                    )}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (onViewResults) {
                                                            onViewResults(match);
                                                        } else {
                                                            setShowProofs(!showProofs);
                                                        }
                                                    }}
                                                >
                                                    {automatedStatus === 'verified' ? (
                                                        <Bot className="w-3.5 h-3.5 mr-1.5" />
                                                    ) : (
                                                        <Eye className="w-3.5 h-3.5 mr-1.5" />
                                                    )}
                                                    Results
                                                </Button>

                                                {isOrganizer && (
                                                    <>
                                                        {!isLive && !isComplete && (
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className={cn(
                                                                    "flex-1 min-w-[80px] h-8",
                                                                    isTooEarlyForLive
                                                                        ? "bg-zinc-900/20 border-zinc-700/30 text-zinc-500 cursor-not-allowed"
                                                                        : "bg-green-900/20 border-green-900/30 text-green-400 hover:bg-green-900/40 hover:text-green-300"
                                                                )}
                                                                onClick={(e) => { e.stopPropagation(); if (!isTooEarlyForLive) setActionMode('party_code'); }}
                                                                disabled={isTooEarlyForLive}
                                                                title={isTooEarlyForLive ? 'Cannot go live before scheduled time' : undefined}
                                                            >
                                                                <PlayCircle className="w-3.5 h-3.5 mr-1.5" /> {isTooEarlyForLive ? 'Not Yet' : 'Go Live'}
                                                            </Button>
                                                        )}

                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="flex-1 min-w-[80px] h-8 bg-purple-500/10 border-purple-500/20 text-purple-400 hover:bg-purple-500/20 hover:text-purple-300"
                                                            onClick={(e) => { e.stopPropagation(); onMapVeto?.(match); }}
                                                        >
                                                            <Swords className="w-3.5 h-3.5 mr-1.5" /> Veto
                                                        </Button>

                                                        {canOpenMatchRoom && (
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="h-8 px-2 bg-cyan-500/10 border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/20 hover:text-cyan-300"
                                                                onClick={(e) => { e.stopPropagation(); onMatchRoom(match); }}
                                                                title="Open match room"
                                                                aria-label="Open match room"
                                                            >
                                                                <MessageCircle className="w-3.5 h-3.5" />
                                                                <ExternalLink className="w-3 h-3 ml-1" />
                                                            </Button>
                                                        )}
                                                    </>
                                                )}
                                            </motion.div>
                                        ) : (
                                            <motion.div
                                                key="party-code-input"
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -10 }}
                                                transition={{ duration: 0.2 }}
                                                className="flex gap-2 items-center"
                                                onClick={(e) => e.stopPropagation()}
                                                layout
                                            >
                                                <input
                                                    type="text"
                                                    className="flex-1 h-8 bg-black/40 border border-green-500/30 rounded px-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-green-500/50 uppercase tracking-widest font-mono"
                                                    placeholder="CODE"
                                                    value={partyCode}
                                                    onChange={(e) => setPartyCode(e.target.value.toUpperCase())}
                                                    autoFocus
                                                    disabled={isSubmitting}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter' && partyCode.trim()) {
                                                            handleStart();
                                                        }
                                                        if (e.key === 'Escape') {
                                                            setActionMode('default');
                                                            setPartyCode('');
                                                        }
                                                    }}
                                                />
                                                <Button
                                                    size="sm"
                                                    className="h-8 px-3 bg-green-600 hover:bg-green-500 text-white"
                                                    disabled={!partyCode.trim() || isProcessing || isSubmitting}
                                                    onClick={handleStart}
                                                >
                                                    {isSubmitting ? '...' : 'Start'}
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-8 px-2 text-zinc-400 hover:text-white"
                                                    onClick={() => {
                                                        setActionMode('default');
                                                        setPartyCode('');
                                                    }}
                                                    disabled={isSubmitting}
                                                >
                                                    <X className="w-4 h-4" />
                                                </Button>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                )}

                                {/* Proofs View */}
                                {showProofs && proofs && proofs.length > 0 && (
                                    <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="flex gap-2 overflow-x-auto pb-2 pt-1">
                                        {proofs.map((url, i) => (
                                            <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block w-16 h-12 rounded-lg overflow-hidden border border-white/10 hover:border-purple-500/50 transition-colors shrink-0" onClick={(e) => e.stopPropagation()}>
                                                <img src={url} loading="lazy" alt="Proof" className="w-full h-full object-cover" />
                                            </a>
                                        ))}
                                    </motion.div>
                                )}


                            </div>
                        </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div >
    );
}, areMatchPropsEqual);
