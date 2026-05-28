import React, { useState, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Layers, Plus, Trophy, ArrowUp, ArrowDown, Trash2, Users, ArrowRight, AlertTriangle, ChevronDown, ChevronRight, FileText, Hash, LogOut, LogIn, Pencil, Check, X, RotateCcw } from 'lucide-react';
import { apiClient, ApiError } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';
import { Database } from '@/integrations/supabase/types';
import BRStageGroupSection from '@/components/organizer/br/BRStageGroupSection';
import { getBRConfig } from '@/utils/gameFeatures';
import esportsGames from '@/data/esportsGames.json';

type TournamentStage = Database['public']['Tables']['tournament_stages']['Row'];

interface Participant {
    team_id?: string | null;
    status?: string;
}

interface ScoringPreset {
    placements: number[];
    killPoints: number;
    killCap: number | null;
}

interface StageTemplate {
    id: string;
    name: string;
    description: string;
    icon: string;
    teamRange: string;
    minTeams: number;
    maxTeams: number;
    stages: { name: string; capacity: number | null; advancementCount: number | null }[];
}

/**
 * Generate format-aware BR stage templates.
 *
 * All capacities and team ranges are derived from `lobbySize` — the maximum
 * number of competing UNITS (players / duos / squads) that fit in one game
 * lobby, calculated as: Math.floor(game.playersPerLobby / team_size).
 *
 * Examples for a 100-player-lobby game:
 *   Solo  (team_size=1): lobbySize=100 → single lobby fits 100 players
 *   Duo   (team_size=2): lobbySize=50  → single lobby fits 50 duos
 *   Squad (team_size=4): lobbySize=25  → single lobby fits 25 squads
 *
 * The fallback (lobbySize=null) uses the old hardcoded values so existing
 * behaviour is preserved for games without a configured playersPerLobby.
 */
function getBRTemplates(lobbySize: number | null, unitsLabel: string): StageTemplate[] {
    const L = lobbySize ?? 20; // fallback to legacy value when game has no config
    const half = Math.max(1, Math.floor(L / 2));
    const twoThirds = Math.max(1, Math.floor((L * 2) / 3));

    return [
        {
            id: 'single_lobby',
            name: 'Single Lobby',
            description: `All ${unitsLabel} in one lobby. Best for small events that fit within a single game session.`,
            icon: '',
            teamRange: `4–${L} ${unitsLabel}`,
            minTeams: 4,
            maxTeams: L,
            stages: [
                { name: 'Main Event', capacity: null, advancementCount: null },
            ],
        },
        {
            id: 'open_qualifier',
            name: 'Qualifier → Finals',
            description: `2-stage format. ${unitsLabel.charAt(0).toUpperCase() + unitsLabel.slice(1)} compete across qualifier lobbies; top performers advance to a single finals lobby.`,
            icon: '',
            teamRange: `${L + 1}–${L * 3} ${unitsLabel}`,
            minTeams: L + 1,
            maxTeams: L * 3,
            stages: [
                { name: 'Qualifiers', capacity: L, advancementCount: half },
                { name: 'Grand Finals', capacity: null, advancementCount: null },
            ],
        },
        {
            id: 'dual_group',
            name: 'Dual Group → Finals',
            description: `2 parallel groups compete separately; top ${unitsLabel} from each merge into one finals lobby.`,
            icon: '',
            teamRange: `${L + 1}–${L * 2} ${unitsLabel}`,
            minTeams: L + 1,
            maxTeams: L * 2,
            stages: [
                { name: 'Group Stage', capacity: L, advancementCount: half },
                { name: 'Grand Finals', capacity: null, advancementCount: null },
            ],
        },
        {
            id: 'triple_stage',
            name: 'Groups → Semis → Finals',
            description: `3-stage progression. Large pool narrows through semi-finals into a single finals lobby.`,
            icon: '',
            teamRange: `${L * 2 + 1}–${L * 5} ${unitsLabel}`,
            minTeams: L * 2 + 1,
            maxTeams: L * 5,
            stages: [
                { name: 'Group Stage', capacity: L, advancementCount: half },
                { name: 'Semi-Finals', capacity: L, advancementCount: twoThirds },
                { name: 'Grand Finals', capacity: null, advancementCount: null },
            ],
        },
        {
            id: 'four_stage',
            name: 'Full Circuit (4 Stages)',
            description: `Open → Quarter → Semi → Finals. Best for large-scale events with high ${unitsLabel} counts.`,
            icon: '',
            teamRange: `${L * 4 + 1}–${L * 10} ${unitsLabel}`,
            minTeams: L * 4 + 1,
            maxTeams: L * 10,
            stages: [
                { name: 'Open Qualifiers', capacity: L, advancementCount: twoThirds },
                { name: 'Quarter-Finals', capacity: L, advancementCount: half },
                { name: 'Semi-Finals', capacity: L, advancementCount: twoThirds },
                { name: 'Grand Finals', capacity: null, advancementCount: null },
            ],
        },
    ];
}

interface StageFlowInfo {
    teamsEntering: number;
    groupsFormed: number;
    teamsAdvancing: number | null;
    isFinal: boolean;
    isConfigured: boolean;
}

interface StageReadiness {
    canReviewAdvancement: boolean;
    lockedLabel: string;
    helperText: string;
}

interface BRStageManagementTabProps {
    tournamentId: string;
    stages: TournamentStage[];
    participants: Participant[];
    maxParticipants?: number | null;
    teamSize?: number | null;
    game?: string;
    scoringPreset: ScoringPreset;
    onUpdate: () => void;
}

export const BRStageManagementTab: React.FC<BRStageManagementTabProps> = ({ tournamentId, stages: stagesProp, participants: participantsProp, maxParticipants, teamSize, game, scoringPreset, onUpdate }) => {
    // Defensive defaults — prevent .map() on undefined if parent passes undefined during loading
    const stages = stagesProp ?? [];
    const participants = participantsProp ?? [];
    const { toast } = useToast();
    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [expandedStageId, setExpandedStageId] = useState<string | null>(null);
    const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
    const [applyingTemplate, setApplyingTemplate] = useState(false);
    const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
    const [isResetting, setIsResetting] = useState(false);

    // Template config step
    const [selectedTemplate, setSelectedTemplate] = useState<StageTemplate | null>(null);
    const [templateConfig, setTemplateConfig] = useState<{ capacity: number; advancement: number; groupCount: number }[]>([]);

    // Advance teams confirmation
    const [advanceConfirmStageId, setAdvanceConfirmStageId] = useState<string | null>(null);
    const [isAdvancing, setIsAdvancing] = useState(false);

    // Inline editing state
    const [editingField, setEditingField] = useState<{ stageId: string; field: 'name' | 'capacity' | 'advancement' } | null>(null);
    const [editValue, setEditValue] = useState('');

    // Add stage form
    const [newName, setNewName] = useState('');
    const [newGroupCount, setNewGroupCount] = useState<number>(1);
    const [newAdvancement, setNewAdvancement] = useState<number>(1);
    const [newIsFinal, setNewIsFinal] = useState<boolean>(false);
    const [addStageErrors, setAddStageErrors] = useState<string[]>([]);

    const sortedStages = useMemo(() => [...stages].sort((a, b) => a.stage_order - b.stage_order), [stages]);

    const acceptedTeamCount = useMemo(() => {
        if (teamSize === 1) {
            // Solo: participants compete individually, no team_id
            return participants.filter(
                p => !p.team_id && (p.status === 'accepted' || p.status === 'approved')
            ).length;
        }
        const teamIds = new Set<string>();
        for (const p of participants) {
            if (p.team_id && (p.status === 'accepted' || p.status === 'approved')) {
                teamIds.add(p.team_id);
            }
        }
        return teamIds.size;
    }, [participants, teamSize]);

    // Always use tournament max_participants for stage config — accepted count is display-only
    const registeredTeamCount = maxParticipants || 0;

    // Max players per lobby from game config (e.g. 100 for Fortnite, 64 for PUBG, 60 for Apex)
    const brConfig = useMemo(() => getBRConfig(game || ''), [game]);

    // Resolve effective teamSize: use prop if set, otherwise infer from the game's default format.
    // This handles older tournaments where team_size was never persisted to the DB.
    const effectiveTeamSize = useMemo(() => {
        if (teamSize != null && teamSize > 0) return teamSize;
        // Fallback: look up the game's default format team size
        const gameConfig = game ? (esportsGames.games as { name: string; formats: { value: string; teamSize: number }[]; defaultFormat: string }[]).find(g => g.name.toLowerCase() === (game || '').toLowerCase()) : null;
        if (gameConfig) {
            const fmt = gameConfig.formats.find(f => f.value === gameConfig.defaultFormat) ?? gameConfig.formats[0];
            return fmt?.teamSize ?? 1;
        }
        return 1; // ultimate fallback: solo
    }, [teamSize, game]);

    // playersPerLobby is total player count; divide by effectiveTeamSize to get competing-unit capacity
    const maxLobbySize = brConfig
        ? Math.floor(brConfig.playersPerLobby / Math.max(1, effectiveTeamSize))
        : null;

    // Format-aware unit labels — all "team/teams" labels in the UI derive from these
    const unitLabel  = effectiveTeamSize === 1 ? 'player'  : effectiveTeamSize === 2 ? 'duo'  : effectiveTeamSize === 3 ? 'trio'  : 'team';
    const unitsLabel = effectiveTeamSize === 1 ? 'players' : effectiveTeamSize === 2 ? 'duos' : effectiveTeamSize === 3 ? 'trios' : 'teams';
    const UnitsLabel = unitsLabel.charAt(0).toUpperCase() + unitsLabel.slice(1);

    // Format-aware stage templates — recomputed whenever the game or team format changes
    const brTemplates = useMemo(() => getBRTemplates(maxLobbySize, unitsLabel), [maxLobbySize, unitsLabel]);

    // Validate the template config and return per-stage error messages
    const templateConfigErrors = useMemo((): string[] => {
        if (!selectedTemplate) return [];
        const errors: string[] = [];
        let teamsIn = registeredTeamCount || 0;

        for (let i = 0; i < selectedTemplate.stages.length; i++) {
            const isFinal = i === selectedTemplate.stages.length - 1;
            const cfg = templateConfig[i];

            if (isFinal) {
                // Final stage: validate that teams entering fit within max lobby
                if (maxLobbySize && teamsIn > maxLobbySize) {
                    errors.push(`Stage ${i + 1} (${selectedTemplate.stages[i].name}): ${teamsIn} ${unitsLabel} advancing to finals exceeds the max lobby size of ${maxLobbySize} ${unitsLabel} for this game. Reduce advancement in the previous stage.`);
                } else {
                    errors.push('');
                }
            } else {
                if (!cfg) { errors.push(''); continue; }
                const groupCount = cfg.groupCount || 1;
                const teamsPerGroup = groupCount > 0 ? Math.ceil(teamsIn / groupCount) : teamsIn;
                const advancement = Math.min(cfg.advancement || 1, teamsPerGroup);
                const totalAdvancing = advancement * groupCount;

                if (teamsIn === 0) {
                    errors.push(`Stage ${i + 1}: No teams entering. Check the previous stage's advancement count.`);
                } else if (advancement >= teamsPerGroup && groupCount === 1) {
                    // Single group advancing everyone = pointless qualifier
                    errors.push(`Stage ${i + 1} (${selectedTemplate.stages[i].name}): Advancing all ${teamsPerGroup} ${unitsLabel} from a single group is pointless — everyone passes through. Reduce advancement or add more groups.`);
                } else if (totalAdvancing >= teamsIn && groupCount === 1) {
                    errors.push(`Stage ${i + 1} (${selectedTemplate.stages[i].name}): Advancing ${totalAdvancing} of ${teamsIn} ${unitsLabel} means no one is eliminated. Set advancement below ${teamsIn}.`);
                } else if (maxLobbySize && teamsPerGroup > maxLobbySize) {
                    errors.push(`Stage ${i + 1} (${selectedTemplate.stages[i].name}): Lobby size ${teamsPerGroup} ${unitsLabel} exceeds the game's max of ${maxLobbySize} ${unitsLabel}/lobby. Add more groups.`);
                } else {
                    errors.push('');
                }

                // Advance teamsIn to next stage
                teamsIn = totalAdvancing;
            }
        }
        return errors;
    }, [selectedTemplate, templateConfig, registeredTeamCount, maxLobbySize]);

    const hasTemplateErrors = templateConfigErrors.some(e => e !== '');

    // Compute flow info for each stage (teams entering, groups formed, teams advancing)
    const stageFlows = useMemo((): Map<string, StageFlowInfo> => {
        const flows = new Map<string, StageFlowInfo>();
        let teamsEntering = registeredTeamCount;

        for (let i = 0; i < sortedStages.length; i++) {
            const stage = sortedStages[i];
            const isFinal = i === sortedStages.length - 1;
            // groupsFormed: if no capacity set, it's a single lobby (1 group)
            const groupsFormed = stage.capacity && stage.capacity > 0
                ? Math.ceil(teamsEntering / stage.capacity)
                : 1;
            const advPerGroup = stage.advancement_count ?? null;
            const teamsAdvancing = advPerGroup != null && !isFinal ? advPerGroup * groupsFormed : null;
            // isConfigured: finals always configured; non-finals need advancement_count set
            const isConfigured = isFinal ? true : stage.advancement_count != null;

            flows.set(stage.id, { teamsEntering, groupsFormed, isFinal, teamsAdvancing, isConfigured });

            // FIX 1: null advancement → 0 (unconfigured), not carried forward stale count
            if (isFinal) {
                teamsEntering = 0; // doesn't matter — no next stage
            } else {
                teamsEntering = teamsAdvancing ?? 0; // null → 0, not carried forward
            }
        }
        return flows;
    }, [sortedStages, registeredTeamCount]);

    // Save a single field inline
    const saveInlineEdit = useCallback(async (stageId: string, field: 'name' | 'capacity' | 'advancement', value: string) => {
        try {
            const stageDtos = stages.map(s => {
                const dto: any = {
                    id: s.id,
                    name: s.name,
                    format: s.format || 'battle_royale',
                    stageOrder: s.stage_order,
                    bestOf: 1,
                    capacity: s.capacity,
                    advancementCount: s.advancement_count,
                    startsAt: s.starts_at || null,
                    endsAt: s.ends_at || null,
                };
                if (s.id === stageId) {
                    if (field === 'name') dto.name = value.trim();
                    if (field === 'capacity') dto.capacity = value && value !== 'none' ? parseInt(value) : null;
                    if (field === 'advancement') dto.advancementCount = value && value !== 'none' ? parseInt(value) : null;
                }
                return dto;
            });

            await apiClient.put(`/api/tournaments/${tournamentId}/stages`, { stages: stageDtos });
            toast({ title: 'Updated', description: `Stage ${field} saved.` });
            setEditingField(null);
            onUpdate();
        } catch (error: any) {
            toast({ title: 'Error', description: error.message || 'Failed to update', variant: 'destructive' });
        }
    }, [stages, tournamentId, toast, onUpdate]);

    const handleAddStage = async () => {
        if (!newName.trim()) return;

        // Derive incomingTeams for validation
        const incomingTeams = addStageContext?.incomingTeams ?? registeredTeamCount;
        const lobbySize = newIsFinal ? null : (newGroupCount > 0 && incomingTeams > 0 ? Math.ceil(incomingTeams / newGroupCount) : null);

        // FIX 10 — Validate before saving
        const errs: string[] = [];
        if (!newIsFinal) {
            if (newGroupCount < 1) errs.push('Group count must be at least 1.');
            if (newAdvancement < 1) errs.push('Advance per group must be at least 1.');
            if (lobbySize != null && newAdvancement >= lobbySize) {
                errs.push(`Advance per group (${newAdvancement}) must be less than lobby size (${lobbySize}) — at least 1 ${unitLabel} must be eliminated.`);
            }
            if (maxLobbySize && lobbySize != null && lobbySize > maxLobbySize) {
                errs.push(`Lobby size ${lobbySize} exceeds game max of ${maxLobbySize}. Add more groups.`);
            }
        }
        if (errs.length > 0) {
            setAddStageErrors(errs);
            return;
        }
        setAddStageErrors([]);

        try {
            const newOrder = stages.length + 1;
            const stageDtos = stages.map(s => ({
                id: s.id,
                name: s.name,
                format: s.format || 'battle_royale',
                stageOrder: s.stage_order,
                bestOf: 1,
                capacity: s.capacity,
                advancementCount: s.advancement_count,
                startsAt: s.starts_at || null,
                endsAt: s.ends_at || null,
            }));

            stageDtos.push({
                id: null as any,
                name: newName.trim(),
                format: 'battle_royale',
                stageOrder: newOrder,
                bestOf: 1,
                capacity: newIsFinal ? null : lobbySize,
                advancementCount: newIsFinal ? null : newAdvancement,
                startsAt: null,
                endsAt: null,
            });

            await apiClient.put(`/api/tournaments/${tournamentId}/stages`, { stages: stageDtos });

            // Auto-create groups for non-final stages — match by stage_order to avoid TOCTOU
            if (!newIsFinal && newGroupCount > 0 && lobbySize != null) {
                try {
                    const freshStages = await apiClient.get<any[]>(`/api/tournaments/${tournamentId}/stages`);
                    const newStage = freshStages.find((s: any) => s.stage_order === newOrder);
                    if (newStage) {
                        await apiClient.post(`/api/stages/${newStage.id}/br/groups`, {
                            groupCount: newGroupCount,
                            lobbySize,
                        });
                    }
                } catch {
                    // Non-critical — groups can be created later
                }
            }

            toast({ title: 'Stage added', description: `${newName} has been added.` });
            setAddDialogOpen(false);
            setNewName('');
            setNewGroupCount(1);
            setNewAdvancement(1);
            setNewIsFinal(false);
            setAddStageErrors([]);
            onUpdate();
        } catch (error: any) {
            toast({ title: 'Error', description: error.message || 'Failed to add stage', variant: 'destructive' });
        }
    };

    const handleDeleteStage = async (stageId: string) => {
        try {
            await apiClient.post(`/api/tournaments/${tournamentId}/stages/delete`, { deleteIds: [stageId] });
            // Re-sequence remaining stages in a single PUT instead of N sequential PATCHes
            const remaining = stages
                .filter(s => s.id !== stageId)
                .sort((a, b) => a.stage_order - b.stage_order);
            if (remaining.length > 0) {
                const resequenced = remaining.map((s, i) => ({
                    id: s.id,
                    name: s.name,
                    format: s.format || 'battle_royale',
                    stageOrder: i + 1,
                    bestOf: 1,
                    capacity: s.capacity,
                    advancementCount: s.advancement_count,
                    startsAt: s.starts_at || null,
                    endsAt: s.ends_at || null,
                }));
                await apiClient.put(`/api/tournaments/${tournamentId}/stages`, { stages: resequenced });
            }
            toast({ title: 'Stage deleted' });
            setDeleteConfirmId(null);
            if (expandedStageId === stageId) setExpandedStageId(null);
            onUpdate();
        } catch (error: any) {
            toast({ title: 'Error', description: error.message || 'Failed to delete stage', variant: 'destructive' });
        }
    };

    const handleReorder = async (stageId: string, direction: 'up' | 'down') => {
        const idx = sortedStages.findIndex(s => s.id === stageId);
        if (idx === -1) return;
        if (direction === 'up' && idx === 0) return;
        if (direction === 'down' && idx === sortedStages.length - 1) return;

        const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
        const current = sortedStages[idx];
        const target = sortedStages[targetIdx];

        try {
            const stageDtos = stages.map(s => ({
                id: s.id,
                name: s.name,
                format: s.format || 'battle_royale',
                stageOrder: s.id === current.id ? target.stage_order : s.id === target.id ? current.stage_order : s.stage_order,
                bestOf: 1,
                capacity: s.capacity,
                advancementCount: s.advancement_count,
                startsAt: s.starts_at || null,
                endsAt: s.ends_at || null,
            }));

            await apiClient.put(`/api/tournaments/${tournamentId}/stages`, { stages: stageDtos });
            onUpdate();
        } catch (error: any) {
            toast({ title: 'Error', description: 'Failed to reorder stages', variant: 'destructive' });
        }
    };

    const handleStatusChange = async (stageId: string, status: string) => {
        try {
            await apiClient.patch(`/api/stages/${stageId}/status`, { status });
            toast({ title: 'Status updated', description: `Stage is now ${status}.` });
            onUpdate();
        } catch (error: any) {
            toast({ title: 'Error', description: error.message || 'Failed to update status', variant: 'destructive' });
        }
    };

    const handleResetAllStages = async () => {
        setIsResetting(true);
        try {
            const deleteIds = stages.map(s => s.id);
            await apiClient.post(`/api/tournaments/${tournamentId}/stages/delete`, { deleteIds });
            toast({ title: 'All stages cleared', description: 'You can start fresh with templates or add stages manually.' });
            setResetConfirmOpen(false);
            setExpandedStageId(null);
            onUpdate();
        } catch (error: any) {
            toast({ title: 'Error', description: error.message || 'Failed to reset stages', variant: 'destructive' });
        } finally {
            setIsResetting(false);
        }
    };

    const handleSelectTemplate = (template: StageTemplate) => {
        // Warn if there are already stages configured
        if (stages.length > 0) {
          const confirmed = window.confirm(
            `Applying this template will replace your ${stages.length} existing stage${stages.length !== 1 ? 's' : ''}. This action cannot be undone.\n\nContinue?`
          );
          if (!confirmed) return;
        }
        setSelectedTemplate(template);
        const totalTeams = registeredTeamCount || 0;
        const configs: { capacity: number; advancement: number; groupCount: number }[] = [];
        for (let j = 0; j < template.stages.length; j++) {
            const s = template.stages[j];
            const tIn = j === 0
                ? totalTeams
                : (configs[j - 1]?.advancement || 1) * (configs[j - 1]?.groupCount || 1);
            // Clamp template hint by game's actual max lobby size (if known)
            const effectiveCapacity = s.capacity
              ? (maxLobbySize ? Math.min(s.capacity, maxLobbySize) : s.capacity)
              : (maxLobbySize ?? 20);
            const defaultGroups = tIn > 0 ? Math.max(1, Math.ceil(tIn / effectiveCapacity)) : 1;
            const groups = Math.max(1, defaultGroups);
            const lobbySize = groups > 0 && tIn > 0 ? Math.ceil(tIn / groups) : tIn;
            const teamsPerGroup = lobbySize;
            const adv = Math.min(s.advancementCount ?? 1, teamsPerGroup || 1);
            configs.push({ capacity: lobbySize, advancement: adv, groupCount: groups });
        }
        setTemplateConfig(configs);
    };

    const handleApplyTemplate = async () => {
        if (!selectedTemplate) return;
        setApplyingTemplate(true);
        try {
            if (stages.length > 0) {
                await apiClient.post(`/api/tournaments/${tournamentId}/stages/delete`, {
                    deleteIds: stages.map(s => s.id),
                });
            }
            const isSingleLobbyTemplate = selectedTemplate.stages.length === 1;
            const stageDtos = selectedTemplate.stages.map((ts, i) => ({
                id: null as any,
                name: isSingleLobbyTemplate ? 'Main Event' : ts.name,
                format: 'battle_royale',
                stageOrder: i + 1,
                bestOf: 1,
                capacity: isSingleLobbyTemplate || i < selectedTemplate.stages.length - 1
                    ? templateConfig[i]?.capacity || maxLobbySize || registeredTeamCount || null
                    : templateConfig[i]?.capacity || maxLobbySize || null,
                advancementCount: i < selectedTemplate.stages.length - 1 ? templateConfig[i]?.advancement ?? null : null,
                startsAt: null,
                endsAt: null,
            }));

            await apiClient.put(`/api/tournaments/${tournamentId}/stages`, { stages: stageDtos });

            // Auto-create groups for each non-final stage in parallel (avoids N sequential requests)
            try {
                const freshStages = await apiClient.get<any[]>(`/api/tournaments/${tournamentId}/stages`);
                // Match by stage_order (1-based) not array index — immune to concurrent inserts
                const nonFinalCount = isSingleLobbyTemplate ? 0 : selectedTemplate.stages.length - 1;
                await Promise.all(
                    Array.from({ length: nonFinalCount }, (_, i) => {
                        const cfg = templateConfig[i];
                        const stage = freshStages.find((s: any) => s.stage_order === i + 1);
                        if (!stage || !cfg || cfg.groupCount <= 0 || cfg.capacity <= 0) return Promise.resolve();
                        return apiClient.post(`/api/stages/${stage.id}/br/groups`, {
                            groupCount: cfg.groupCount,
                            lobbySize: cfg.capacity,
                        });
                    })
                );
            } catch {
                // Non-critical — groups can be created later from Groups & Rounds section
            }

            toast({
                title: 'Template Applied',
                description: isSingleLobbyTemplate
                    ? '"Single Lobby" is ready with one main lobby.'
                    : `"${selectedTemplate.name}" — ${selectedTemplate.stages.length} stages with groups created.`,
            });
            setTemplateDialogOpen(false);
            setSelectedTemplate(null);
            onUpdate();
        } catch (error: any) {
            toast({ title: 'Error', description: error.message || 'Failed to apply template', variant: 'destructive' });
        } finally {
            setApplyingTemplate(false);
        }
    };

    const handleAdvanceTeams = async (stageId: string, advancementCount: number) => {
        setIsAdvancing(true);
        try {
            const data = await apiClient.post<{ advanced: number; to_stage: string }>(
                `/api/stages/${stageId}/br/advance?preview=false`,
                { teamsPerGroup: advancementCount }
            );
            toast({ title: `${data.advanced} teams advanced to ${data.to_stage}` });
            setAdvanceConfirmStageId(null);
            onUpdate();
        } catch (error: any) {
            const msg = error instanceof ApiError && typeof error.body === 'object' && error.body?.error
                ? error.body.error : error.message;
            toast({ title: 'Advancement failed', description: msg, variant: 'destructive' });
        } finally {
            setIsAdvancing(false);
        }
    };

    // Pre-fill add stage dialog from previous stage's output
    const openAddStageDialog = () => {
        const incomingTeams = sortedStages.length > 0
            ? (stageFlows.get(sortedStages[sortedStages.length - 1].id)?.teamsAdvancing ?? 0)
            : registeredTeamCount;

        // Default groups: split into multiple if exceeds max lobby size
        const defaultGroups = maxLobbySize && incomingTeams > maxLobbySize
            ? Math.ceil(incomingTeams / maxLobbySize)
            : 1;
        const defaultLobbySize = defaultGroups > 0 && incomingTeams > 0
            ? Math.ceil(incomingTeams / defaultGroups)
            : incomingTeams;
        const defaultAdv = Math.max(1, Math.floor(defaultLobbySize / 2));

        setNewName(sortedStages.length === 0 ? 'Group Stage' : sortedStages.length === 1 ? 'Grand Finals' : `Stage ${sortedStages.length + 1}`);
        setNewGroupCount(defaultGroups);
        setNewAdvancement(defaultAdv);
        setNewIsFinal(sortedStages.length >= 1 && (stageFlows.get(sortedStages[sortedStages.length - 1].id)?.teamsAdvancing ?? 0) === 0 ? false : sortedStages.length === 1);
        setAddStageErrors([]);
        setAddDialogOpen(true);
    };

    const startInlineEdit = (stageId: string, field: 'name' | 'capacity' | 'advancement', currentValue: string) => {
        setEditingField({ stageId, field });
        setEditValue(currentValue);
    };

    // Context info for the add stage dialog
    const addStageContext = useMemo(() => {
        if (sortedStages.length === 0) {
            return { fromStageName: null, incomingTeams: registeredTeamCount };
        }
        const lastStage = sortedStages[sortedStages.length - 1];
        const lastFlow = stageFlows.get(lastStage.id);
        return {
            fromStageName: lastStage.name,
            incomingTeams: lastFlow?.teamsAdvancing ?? 0,
        };
    }, [sortedStages, stageFlows, registeredTeamCount]);

    const getStageReadiness = useCallback((stage: TournamentStage, flow: StageFlowInfo | undefined, isLast: boolean): StageReadiness => {
        if (isLast) {
            return {
                canReviewAdvancement: false,
                lockedLabel: 'Final stage',
                helperText: 'This stage decides the winner and does not advance into another lobby.',
            };
        }

        if (!flow?.isConfigured || !stage.advancement_count) {
            return {
                canReviewAdvancement: false,
                lockedLabel: 'Set advancement',
                helperText: 'Define how many players advance from this stage before opening advancement review.',
            };
        }

        if ((flow.teamsAdvancing ?? 0) <= 0) {
            return {
                canReviewAdvancement: false,
                lockedLabel: 'No output',
                helperText: 'This stage currently produces no advancing players.',
            };
        }

        if ((stage.status || 'upcoming') !== 'completed') {
            return {
                canReviewAdvancement: false,
                lockedLabel: 'Complete stage',
                helperText: 'Finish and mark this stage completed before reviewing qualifiers for the next stage.',
            };
        }

        return {
            canReviewAdvancement: true,
            lockedLabel: 'Ready',
            helperText: 'Review the qualifying players, then advance them into the next stage.',
        };
    }, []);

    return (
        <>
            <Card className="relative bg-black/20 backdrop-blur-md border border-white/10 rounded-3xl overflow-hidden p-6 sm:p-8 mb-6">
                <CardHeader className="p-0 pb-4 border-b border-white/5 mb-4 flex flex-row items-center justify-between space-y-0">
                    <div>
                        <div className="flex items-center gap-2">
                            <CardTitle>Battle Royale Stages</CardTitle>
                            {(
                                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400">
                                    {effectiveTeamSize === 1 ? 'Solo' : effectiveTeamSize === 2 ? 'Duo' : effectiveTeamSize === 3 ? 'Trio' : effectiveTeamSize === 4 ? 'Squads' : `${effectiveTeamSize}-player`}
                                </span>
                            )}
                        </div>
                        <p className="text-sm text-gray-400 mt-1">
                            Configure the tournament progression. Click any value to edit it inline.
                        </p>
                    </div>
                    {sortedStages.length > 0 && (
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setResetConfirmOpen(true)}
                                className="border-red-500/20 text-red-400/70 hover:text-red-400 hover:bg-red-500/10 flex items-center gap-2"
                            >
                                <RotateCcw className="w-3.5 h-3.5" />
                                Reset
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => setTemplateDialogOpen(true)}
                                className="border-white/10 text-gray-300 hover:text-white flex items-center gap-2"
                            >
                                <FileText className="w-4 h-4" />
                                Templates
                            </Button>
                            <Button
                                onClick={openAddStageDialog}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-2"
                            >
                                <Plus className="w-4 h-4" />
                                Add Stage
                            </Button>
                        </div>
                    )}
                </CardHeader>

                <CardContent className="p-0">
                    {/* Pipeline Summary */}
                    {sortedStages.length > 1 && (
                        <div className="mb-5 p-3 bg-white/[0.02] border border-white/5 rounded-xl">
                            <div className="flex items-center gap-2 flex-wrap justify-center">
                                <span className="text-xs font-medium text-white bg-emerald-500/15 border border-emerald-500/20 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                                    <Users className="w-3 h-3" />
                                    {registeredTeamCount} {unitsLabel}
                                </span>
                                {sortedStages.map((stage, i) => {
                                    const flow = stageFlows.get(stage.id);
                                    return (
                                        <React.Fragment key={stage.id}>
                                            <ArrowRight className="w-3.5 h-3.5 text-emerald-500/40 flex-shrink-0" />
                                            <span className="text-xs text-gray-400 bg-white/5 px-2.5 py-1 rounded-lg whitespace-nowrap">
                                                {stage.name}
                                                {flow && flow.groupsFormed > 1 && (
                                                    <span className="text-gray-600 ml-1">({flow.groupsFormed}g)</span>
                                                )}
                                            </span>
                                            {flow?.teamsAdvancing && i < sortedStages.length - 1 && (
                                                <>
                                                    <ArrowRight className="w-3.5 h-3.5 text-amber-500/40 flex-shrink-0" />
                                                    <span className="text-xs text-amber-400/80 whitespace-nowrap">{flow.teamsAdvancing}t</span>
                                                </>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {sortedStages.length === 0 ? (
                        <div className="text-center py-12 border-2 border-dashed border-white/10 rounded-xl">
                            <Layers className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                            <p className="text-gray-400 mb-1">No stages defined yet.</p>
                            <p className="text-sm text-gray-500 mb-4">
                                Use a template for a quick setup, or add stages manually.
                            </p>
                            <div className="flex items-center justify-center gap-3">
                                <Button
                                    variant="outline"
                                    onClick={() => setTemplateDialogOpen(true)}
                                    className="border-white/10 text-gray-300 hover:text-white"
                                >
                                    <FileText className="w-4 h-4 mr-2" />
                                    Browse Templates
                                </Button>
                                <Button
                                    onClick={openAddStageDialog}
                                    className="bg-emerald-600 hover:bg-emerald-500 text-white"
                                >
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add Stage
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-0">
                            {sortedStages.map((stage, index) => {
                                const flow = stageFlows.get(stage.id);
                                const isExpanded = expandedStageId === stage.id;
                                const isLast = index === sortedStages.length - 1;
                                const prevStage = index > 0 ? sortedStages[index - 1] : null;
                                const readiness = getStageReadiness(stage, flow, isLast);

                                return (
                                    <div key={stage.id}>
                                        {/* Stage Card */}
                                        <div className={`p-5 border rounded-xl transition-all ${
                                            isExpanded
                                                ? 'bg-emerald-500/[0.03] border-emerald-500/20'
                                                : 'bg-white/[0.02] border-white/10 hover:border-white/20'
                                        }`}>
                                            {/* Header Row */}
                                            <div className="flex flex-col gap-4">
                                                <div className="flex items-start justify-between gap-3">
                                                    {/* Left: Stage number + name + status */}
                                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                                                            stage.status === 'live' ? 'bg-red-500/15 border border-red-500/30 text-red-400' :
                                                            stage.status === 'completed' ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400' :
                                                            'bg-white/5 border border-white/10 text-gray-400'
                                                        }`}>
                                                            {index + 1}
                                                        </div>
                                                        <div className="min-w-0">
                                                            {editingField?.stageId === stage.id && editingField.field === 'name' ? (
                                                                <div className="flex items-center gap-1.5">
                                                                    <Input
                                                                        value={editValue}
                                                                        onChange={(e) => setEditValue(e.target.value)}
                                                                        className="h-7 text-sm w-48 [color-scheme:dark]"
                                                                        autoFocus
                                                                        onKeyDown={(e) => {
                                                                            if (e.key === 'Enter' && editValue.trim()) saveInlineEdit(stage.id, 'name', editValue);
                                                                            if (e.key === 'Escape') setEditingField(null);
                                                                        }}
                                                                    />
                                                                    <Button size="icon" variant="ghost" className="h-6 w-6 text-emerald-400" onClick={() => editValue.trim() && saveInlineEdit(stage.id, 'name', editValue)}>
                                                                        <Check className="w-3 h-3" />
                                                                    </Button>
                                                                    <Button size="icon" variant="ghost" className="h-6 w-6 text-gray-500" onClick={() => setEditingField(null)}>
                                                                        <X className="w-3 h-3" />
                                                                    </Button>
                                                                </div>
                                                            ) : (
                                                                <button
                                                                    className="text-left group/name"
                                                                    onClick={() => startInlineEdit(stage.id, 'name', stage.name)}
                                                                >
                                                                    <h4 className="font-bold text-white text-base flex items-center gap-1.5">
                                                                        {stage.name}
                                                                        <Pencil className="w-3 h-3 text-gray-600 opacity-0 group-hover/name:opacity-100 transition-opacity" />
                                                                    </h4>
                                                                </button>
                                                            )}
                                                            <div className="flex items-center gap-2 mt-0.5">
                                                                <span className={`text-[10px] uppercase tracking-widest px-1.5 py-0.5 rounded font-semibold ${
                                                                    stage.status === 'live' ? "bg-red-500/20 text-red-400" :
                                                                    stage.status === 'completed' ? "bg-emerald-500/20 text-emerald-400" :
                                                                    "bg-blue-500/15 text-blue-400"
                                                                }`}>
                                                                    {stage.status || 'upcoming'}
                                                                </span>
                                                                {isLast && (
                                                                    <span className="text-[10px] uppercase tracking-widest px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 font-semibold">
                                                                        Finals
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Right: Actions */}
                                                    <div className="flex items-center gap-1.5 flex-shrink-0">
                                                        <Select
                                                            value={stage.status || 'upcoming'}
                                                            onValueChange={(v) => handleStatusChange(stage.id, v)}
                                                        >
                                                            <SelectTrigger className="w-[110px] h-7 text-[11px]">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="upcoming">Upcoming</SelectItem>
                                                                <SelectItem value="live">Live</SelectItem>
                                                                <SelectItem value="completed">Completed</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                        <div className="flex flex-col">
                                                            <Button size="icon" variant="ghost" className="h-5 w-5 text-gray-500 hover:text-white" disabled={index === 0} onClick={() => handleReorder(stage.id, 'up')}>
                                                                <ArrowUp className="w-2.5 h-2.5" />
                                                            </Button>
                                                            <Button size="icon" variant="ghost" className="h-5 w-5 text-gray-500 hover:text-white" disabled={isLast} onClick={() => handleReorder(stage.id, 'down')}>
                                                                <ArrowDown className="w-2.5 h-2.5" />
                                                            </Button>
                                                        </div>
                                                        <Button size="icon" variant="ghost" className="h-7 w-7 text-red-400/60 hover:text-red-400 hover:bg-red-400/10" onClick={() => setDeleteConfirmId(stage.id)}>
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </Button>
                                                    </div>
                                                </div>

                                                {/* Flow Metrics Row */}
                                                <div className="grid grid-cols-3 gap-2">
                                                    {/* Teams Entering */}
                                                    <div className="bg-white/[0.03] border border-white/5 rounded-lg p-2.5 text-center">
                                                        <div className="flex items-center justify-center gap-1 text-gray-500 mb-1">
                                                            <LogIn className="w-3 h-3" />
                                                            <span className="text-[10px] uppercase tracking-wider font-medium">{UnitsLabel} In</span>
                                                        </div>
                                                        <p className="text-lg font-bold text-white">{flow?.teamsEntering || '—'}</p>
                                                        {prevStage && (
                                                            <p className="text-[10px] text-gray-600 mt-0.5 truncate">from {prevStage.name}</p>
                                                        )}
                                                    </div>

                                                    {/* Lobby Size */}
                                                    <div className="bg-white/[0.03] border border-white/5 rounded-lg p-2.5 text-center">
                                                        <div className="flex items-center justify-center gap-1 text-gray-500 mb-1">
                                                            <Hash className="w-3 h-3" />
                                                            <span className="text-[10px] uppercase tracking-wider font-medium">Lobby Size</span>
                                                        </div>
                                                        <p className="text-lg font-bold text-white">
                                                            {stage.capacity ? `${stage.capacity}` : '∞'}
                                                        </p>
                                                        <p className="text-[10px] text-gray-600 mt-0.5">
                                                            {(flow?.groupsFormed || 1) > 1
                                                                ? `→ ${flow?.groupsFormed} groups`
                                                                : 'single lobby'}
                                                        </p>
                                                    </div>

                                                    {/* Teams Advancing */}
                                                    <div className={`border rounded-lg p-2.5 text-center ${
                                                        isLast
                                                            ? 'bg-amber-500/[0.04] border-amber-500/10'
                                                            : !stage.advancement_count
                                                                ? 'bg-red-500/[0.04] border-red-500/10'
                                                                : 'bg-white/[0.03] border-white/5'
                                                    }`}>
                                                        <div className="flex items-center justify-center gap-1 text-gray-500 mb-1">
                                                            <LogOut className="w-3 h-3" />
                                                            <span className="text-[10px] uppercase tracking-wider font-medium">
                                                                {isLast ? 'Winner' : 'Advance'}
                                                            </span>
                                                        </div>
                                                        {isLast ? (
                                                            <div>
                                                                <Trophy className="w-5 h-5 text-amber-400 mx-auto" />
                                                                <p className="text-[10px] text-amber-400/70 mt-0.5">Final stage</p>
                                                            </div>
                                                        ) : stage.advancement_count ? (
                                                            <div>
                                                                <p className="text-lg font-bold text-white">
                                                                    {flow?.teamsAdvancing || '—'}
                                                                </p>
                                                                <p className="text-[10px] text-gray-600 mt-0.5">
                                                                    {(flow?.groupsFormed || 1) > 1
                                                                        ? `${stage.advancement_count}/grp × ${flow?.groupsFormed} grps`
                                                                        : `top ${stage.advancement_count}`}
                                                                </p>
                                                            </div>
                                                        ) : (
                                                            <div>
                                                                <p className="text-sm font-medium text-amber-400 flex items-center justify-center gap-1">
                                                                    <AlertTriangle className="w-3 h-3" />
                                                                    Not set
                                                                </p>
                                                                <p className="text-[10px] text-amber-400/50 mt-0.5">configure via template</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* FIX 3 — Not configured warning banner for non-final stages */}
                                                {!isLast && !flow?.isConfigured && (
                                                    <div className="flex items-start gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/25 rounded-lg">
                                                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                                                        <p className="text-xs text-amber-300 leading-snug">
                                                            <strong>Stage not ready</strong> — advancement count is not set. Configure via Templates or set it manually.
                                                        </p>
                                                    </div>
                                                )}

                                                <div className="grid gap-2 lg:grid-cols-[1fr_1fr]">
                                                    <div className="flex min-h-[64px] items-center rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2 text-left">
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">Round operations</p>
                                                            <p className="mt-1 text-xs text-gray-300">
                                                                Create rounds, set schedules, manage lobby codes, save results, and complete rounds from the Games tab.
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className={`min-h-[64px] justify-start px-3 text-left ${
                                                            isExpanded
                                                                ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-300'
                                                                : 'border-white/10 text-gray-300 hover:text-white'
                                                        }`}
                                                        onClick={() => setExpandedStageId(isExpanded ? null : stage.id)}
                                                    >
                                                        <div className="flex w-full items-center gap-3">
                                                            {isExpanded ? <ChevronDown className="h-4 w-4 text-emerald-400" /> : <ChevronRight className="h-4 w-4 text-zinc-500" />}
                                                            <div className="min-w-0 flex-1">
                                                                <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">Lobbies & Rounds</p>
                                                                <p className="mt-1 text-xs">
                                                                    {isExpanded ? 'Stage operations open' : 'Seed lobbies and run rounds'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </Button>

                                                    <Button
                                                        variant={readiness.canReviewAdvancement ? 'default' : 'secondary'}
                                                        size="sm"
                                                        disabled={!readiness.canReviewAdvancement}
                                                        className={`min-h-[64px] justify-start px-3 text-left ${
                                                            readiness.canReviewAdvancement
                                                                ? 'border-emerald-500/30 bg-emerald-600/15 text-emerald-200 hover:bg-emerald-600'
                                                                : 'border-white/10 bg-white/[0.02] text-zinc-500'
                                                        }`}
                                                        onClick={() => readiness.canReviewAdvancement && setAdvanceConfirmStageId(stage.id)}
                                                    >
                                                        <div className="flex w-full items-center gap-3">
                                                            <ArrowRight className={`h-4 w-4 ${readiness.canReviewAdvancement ? 'text-emerald-300' : 'text-zinc-600'}`} />
                                                            <div className="min-w-0 flex-1">
                                                                <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">Advancement</p>
                                                                <p className="mt-1 text-xs">
                                                                    {readiness.canReviewAdvancement && flow?.teamsAdvancing
                                                                        ? `Review top ${flow.teamsAdvancing} ${UnitsLabel}`
                                                                        : readiness.lockedLabel}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </Button>
                                                </div>

                                                <div className={`rounded-lg border px-3 py-2 text-xs ${
                                                    readiness.canReviewAdvancement
                                                        ? 'border-emerald-500/20 bg-emerald-500/[0.05] text-emerald-200'
                                                        : 'border-white/8 bg-white/[0.02] text-zinc-400'
                                                }`}>
                                                    {readiness.helperText}
                                                </div>
                                            </div>

                                            {/* Inline Group Management (expanded) */}
                                            {isExpanded && (
                                                <div className="mt-4 pt-4 border-t border-white/5">
                                                    <BRStageGroupSection
                                                        stageId={stage.id}
                                                        stageCapacity={stage.capacity}
                                                        registeredTeamCount={flow?.teamsEntering ?? registeredTeamCount}
                                                        scoringPreset={scoringPreset}
                                                        hasNextStage={!isLast}
                                                        advancementCount={stage.advancement_count}
                                                        stageStatus={stage.status}
                                                        onUpdate={onUpdate}
                                                    />
                                                </div>
                                            )}
                                        </div>

                                        {/* Advancement Connector */}
                                        {!isLast && (
                                            <div className="flex justify-center py-1">
                                                <div className="flex flex-col items-center gap-0.5">
                                                    <div className="w-px h-2 bg-emerald-500/20" />
                                                    <div className="flex items-center gap-1.5 text-[10px] text-gray-500 px-2 py-0.5">
                                                        <ArrowDown className="w-3 h-3 text-emerald-500/40" />
                                                        {flow?.teamsAdvancing != null && flow.teamsAdvancing > 0 ? (
                                                            <span className="text-emerald-400/60">{flow.teamsAdvancing} advance</span>
                                                        ) : (
                                                            <span className="text-amber-500/70 flex items-center gap-1">
                                                                <AlertTriangle className="w-2.5 h-2.5" />
                                                                — not configured
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="w-px h-2 bg-emerald-500/20" />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Add Stage Dialog — groups-first, dynamic & validated */}
            <Dialog open={addDialogOpen} onOpenChange={(open) => { setAddDialogOpen(open); if (!open) setAddStageErrors([]); }}>
                <DialogContent className="bg-[#0a0a0c] border-white/10">
                    <DialogHeader>
                        <DialogTitle>Add Stage</DialogTitle>
                        <DialogDescription>
                            {addStageContext?.fromStageName
                                ? `This stage will receive ${unitsLabel} advancing from "${addStageContext.fromStageName}".`
                                : 'Add the first stage of your tournament.'}
                        </DialogDescription>
                    </DialogHeader>

                    {/* Context Banner — incoming teams from previous stage */}
                    {addStageContext?.fromStageName && addStageContext.incomingTeams > 0 && (
                        <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-sm">
                            <LogIn className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                            <span className="text-emerald-300">
                                ~<strong>{addStageContext.incomingTeams}</strong> {unitsLabel} expected from <strong>{addStageContext.fromStageName}</strong>
                            </span>
                        </div>
                    )}

                    {/* Warning: previous stage has no advancement configured */}
                    {addStageContext?.fromStageName && addStageContext.incomingTeams === 0 && (
                        <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-sm">
                            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                            <span className="text-amber-300">
                                <strong>"{addStageContext.fromStageName}"</strong> has no advancement count set — it doesn't know how many {unitsLabel} to pass forward. Configure it first, or this stage will have no defined input.
                            </span>
                        </div>
                    )}

                    {(() => {
                        const incomingTeams = addStageContext?.incomingTeams ?? registeredTeamCount;
                        const lobbySize = newGroupCount > 0 && incomingTeams > 0
                            ? Math.ceil(incomingTeams / newGroupCount)
                            : incomingTeams || 0;
                        const maxGroups = Math.max(1, Math.min(incomingTeams, 64));
                        const advancementOptions = lobbySize > 1
                            ? Array.from({ length: lobbySize - 1 }, (_, k) => k + 1)
                            : [1];
                        const lobbyOverMax = maxLobbySize != null && lobbySize > maxLobbySize;

                        return (
                            <div className="space-y-4 py-2">
                                {/* Stage Name */}
                                <div className="space-y-1.5">
                                    <Label>Stage Name</Label>
                                    <Input
                                        value={newName}
                                        onChange={(e) => setNewName(e.target.value)}
                                        placeholder="e.g., Group Stage, Semi-Finals, Grand Finals"
                                        className="[color-scheme:dark]"
                                    />
                                </div>

                                {/* Stage Type Toggle */}
                                <div className="space-y-1.5">
                                    <Label>Stage Type</Label>
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setNewIsFinal(false)}
                                            className={`flex-1 py-2 px-3 rounded-lg border text-xs font-semibold transition-all ${!newIsFinal ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300' : 'bg-white/[0.02] border-white/10 text-gray-400 hover:border-white/20'}`}
                                        >
                                            Intermediate Stage
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setNewIsFinal(true)}
                                            className={`flex-1 py-2 px-3 rounded-lg border text-xs font-semibold transition-all ${newIsFinal ? 'bg-amber-500/15 border-amber-500/40 text-amber-300' : 'bg-white/[0.02] border-white/10 text-gray-400 hover:border-white/20'}`}
                                        >
                                            <Trophy className="w-3 h-3 inline mr-1" />
                                            Final Stage
                                        </button>
                                    </div>
                                </div>

                                {!newIsFinal && (
                                    <>
                                        {/* Dead-end guard: lobbySize <= 1 means nothing can be eliminated */}
                                        {incomingTeams > 0 && lobbySize <= 1 ? (
                                            <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                                                <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                                                <p className="text-xs text-amber-300">
                                                    Only <strong>1 {unitLabel} per group</strong> — an intermediate stage with 1 {unitLabel} per lobby can't eliminate anyone. Either reduce the group count or set this as a Final Stage.
                                                </p>
                                            </div>
                                        ) : (
                                            <>
                                                {/* Groups */}
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="space-y-1.5">
                                                        <Label className="text-xs text-gray-400">Groups</Label>
                                                        <Select
                                                            value={String(newGroupCount)}
                                                            onValueChange={(v) => {
                                                                const g = parseInt(v);
                                                                setNewGroupCount(g);
                                                                const newLobby = incomingTeams > 0 ? Math.ceil(incomingTeams / g) : 0;
                                                                setNewAdvancement(prev => Math.min(prev, Math.max(1, newLobby - 1)));
                                                            }}
                                                        >
                                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                                            <SelectContent>
                                                                {Array.from({ length: maxGroups }, (_, k) => k + 1).map(n => (
                                                                    <SelectItem key={n} value={String(n)}>
                                                                        {n} {n === 1 ? 'group' : 'groups'}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>

                                                    {/* Lobby Size (read-only derived) */}
                                                    <div className="space-y-1.5">
                                                        <Label className="text-xs text-gray-400">Lobby Size (derived)</Label>
                                                        <div className={`h-9 flex items-center px-3 rounded-md border text-sm ${lobbyOverMax ? 'bg-red-500/10 border-red-500/30 text-red-300' : 'bg-white/[0.03] border-white/10 text-gray-300'}`}>
                                                            {incomingTeams > 0 ? `${lobbySize} ${unitsLabel}` : '—'}
                                                            {lobbyOverMax && <AlertTriangle className="w-3 h-3 ml-1.5 text-red-400" />}
                                                        </div>
                                                        <p className="text-[10px] text-gray-600">
                                                            {maxLobbySize ? `game max: ${maxLobbySize}` : 'no game limit'}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Advance per Group */}
                                                <div className="space-y-1.5">
                                                    <Label className="text-xs text-gray-400">Advance per Group</Label>
                                                    <Select
                                                        value={String(Math.min(newAdvancement, Math.max(1, lobbySize - 1)))}
                                                        onValueChange={(v) => setNewAdvancement(parseInt(v))}
                                                    >
                                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                                        <SelectContent>
                                                            {advancementOptions.map(n => (
                                                                <SelectItem key={n} value={String(n)}>Top {n}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    {incomingTeams > 0 && (
                                                        <p className="text-xs text-amber-400/80">
                                                            → <strong>{Math.min(newAdvancement, Math.max(1, lobbySize - 1)) * newGroupCount}</strong> {unitsLabel} total will advance to the next stage
                                                        </p>
                                                    )}
                                                </div>

                                                {/* Lobby size warning */}
                                                {lobbyOverMax && (
                                                    <div className="flex items-start gap-2 p-2.5 bg-red-500/10 border border-red-500/20 rounded-lg">
                                                        <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
                                                        <p className="text-xs text-red-300">
                                                            Lobby size {lobbySize} {unitsLabel} exceeds game max of {maxLobbySize} {unitsLabel}/lobby. Add more groups to split them.
                                                        </p>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </>
                                )}

                                {/* Validation errors */}
                                {addStageErrors.length > 0 && (
                                    <div className="space-y-1">
                                        {addStageErrors.map((err, i) => (
                                            <div key={i} className="flex items-start gap-2 p-2.5 bg-red-500/10 border border-red-500/20 rounded-lg">
                                                <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
                                                <p className="text-xs text-red-300">{err}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })()}

                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setAddDialogOpen(false)}>Cancel</Button>
                        <Button
                            onClick={handleAddStage}
                            disabled={
                                !newName.trim() ||
                                addStageErrors.length > 0 ||
                                // Can't add intermediate stage when lobbySize=1 (no one to eliminate)
                                (!newIsFinal && addStageContext != null && addStageContext.incomingTeams > 0 &&
                                    Math.ceil(addStageContext.incomingTeams / newGroupCount) <= 1)
                            }
                            className="bg-emerald-600 hover:bg-emerald-500"
                        >
                            Add Stage
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
                <DialogContent className="bg-[#0a0a0c] border-white/10">
                    <DialogHeader>
                        <DialogTitle>Delete Stage?</DialogTitle>
                        <DialogDescription>
                            This will remove the stage and all its groups, rounds, and results. This cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    {/* FIX 9 — Flow cascade warning */}
                    {(() => {
                        if (!deleteConfirmId) return null;
                        const stageIdx = sortedStages.findIndex(s => s.id === deleteConfirmId);
                        const prevStage = stageIdx > 0 ? sortedStages[stageIdx - 1] : null;
                        const nextStage = stageIdx < sortedStages.length - 1 ? sortedStages[stageIdx + 1] : null;
                        const isMiddleStage = prevStage != null && nextStage != null;

                        if (isMiddleStage) {
                            return (
                                <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                                    <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                                    <p className="text-xs text-amber-300 leading-relaxed">
                                        This stage connects <strong>"{prevStage.name}"</strong> → <strong>"{nextStage.name}"</strong>.
                                        Deleting it will break the flow — <strong>"{nextStage.name}"</strong> will no longer have a defined input.
                                    </p>
                                </div>
                            );
                        }
                        if (!prevStage && nextStage) {
                            return (
                                <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                                    <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                                    <p className="text-xs text-amber-300 leading-relaxed">
                                        <strong>"{nextStage.name}"</strong> currently receives {unitsLabel} from this stage. After deletion, it will have no input source.
                                    </p>
                                </div>
                            );
                        }
                        return null;
                    })()}
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
                        <Button variant="destructive" onClick={() => deleteConfirmId && handleDeleteStage(deleteConfirmId)}>
                            Delete Stage
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Template Picker Dialog — two-step: browse → configure → apply */}
            <Dialog open={templateDialogOpen} onOpenChange={(open) => {
                setTemplateDialogOpen(open);
                if (!open) setSelectedTemplate(null);
            }}>
                <DialogContent className="bg-[#0a0a0c] border-white/10 max-w-2xl p-0 overflow-hidden">
                    {!selectedTemplate ? (
                        <>
                            <div className="px-6 pt-6 pb-4 border-b border-white/5">
                                <DialogHeader>
                                    <DialogTitle className="text-lg font-semibold text-white">
                                        Stage Templates
                                    </DialogTitle>
                                    <DialogDescription className="text-gray-500 text-sm">
                                        {stages.length > 0
                                            ? 'Applying a template will replace all existing stages.'
                                            : 'Select a structure that fits your tournament size.'}
                                    </DialogDescription>
                                </DialogHeader>
                            </div>
                            <div className="px-6 py-4 space-y-3 max-h-[65vh] overflow-y-auto">
                                {brTemplates.map((t) => {
                                    // FIX 7 — Fit badge
                                    const fitBadge = (() => {
                                        if (registeredTeamCount <= 0) {
                                            return <span className="text-[10px] text-gray-500 px-2 py-0.5 rounded bg-white/[0.03] border border-white/5">Set {unitsLabel} count first</span>;
                                        }
                                        const n = registeredTeamCount;
                                        const within = n >= t.minTeams && n <= t.maxTeams;
                                        const slightlyOutside = !within && n >= t.minTeams * 0.8 && n <= t.maxTeams * 1.2;
                                        if (within) {
                                            return <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">✓ Fits your {n} {unitsLabel}</span>;
                                        }
                                        if (slightlyOutside) {
                                            return <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400">~ Slightly outside range</span>;
                                        }
                                        return <span className="text-[10px] px-2 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-red-400">✗ Not recommended for {n} {unitsLabel}</span>;
                                    })();

                                    return (
                                    <button
                                        key={t.id}
                                        onClick={() => handleSelectTemplate(t)}
                                        className="w-full text-left p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:border-emerald-500/30 hover:bg-emerald-500/[0.04] transition-all group"
                                    >
                                        <div className="flex items-center justify-between mb-2.5">
                                            <h4 className="font-semibold text-white text-sm group-hover:text-emerald-300 transition-colors">
                                                {t.name}
                                            </h4>
                                            <div className="flex items-center gap-2">
                                                {fitBadge}
                                                <span className="text-[10px] uppercase tracking-widest text-gray-600 font-medium bg-white/[0.03] px-2 py-0.5 rounded">
                                                    {t.minTeams}–{t.maxTeams} {unitsLabel}
                                                </span>
                                            </div>
                                        </div>
                                        <p className="text-xs text-gray-500 leading-relaxed">{t.description}</p>
                                    </button>
                                    );
                                })}
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="px-6 pt-6 pb-4 border-b border-white/5">
                                <DialogHeader>
                                    <DialogTitle className="text-lg font-semibold text-white">
                                        Configure — {selectedTemplate.name}
                                    </DialogTitle>
                                    <DialogDescription className="text-gray-500 text-sm">
                                        Configure lobby size, groups and advancement per stage.
                                        {acceptedTeamCount > 0
                                            ? ` ${acceptedTeamCount} ${unitsLabel} checked in.`
                                            : maxParticipants
                                                ? ` Using tournament limit of ${maxParticipants} ${unitsLabel}.`
                                                : ''}
                                    </DialogDescription>
                                </DialogHeader>
                            </div>
                            <div className="px-6 py-4 space-y-4 max-h-[65vh] overflow-y-auto">
                                {registeredTeamCount === 0 && (
                                    <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                                        <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                                        <p className="text-xs text-red-300">No {unitLabel} count available. Set a participant limit in tournament settings first.</p>
                                    </div>
                                )}
                                {acceptedTeamCount === 0 && maxParticipants && maxParticipants > 0 && (
                                    <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                                        <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                                        <p className="text-xs text-amber-300">No check-ins yet — using tournament max of <strong>{maxParticipants}</strong> {unitsLabel} as estimate. Reconfigure after check-in closes.</p>
                                    </div>
                                )}
                                {(() => {
                                    return selectedTemplate.stages.map((s, i) => {
                                    const isFinalStage = i === selectedTemplate.stages.length - 1;
                                    const cfg = templateConfig[i];

                                    // Compute teamsIn cumulatively from registered count
                                    let teamsIn = registeredTeamCount || 0;
                                    if (i > 0) {
                                        for (let j = 0; j < i; j++) {
                                            const prev = templateConfig[j];
                                            teamsIn = (prev?.advancement || 1) * (prev?.groupCount || 1);
                                        }
                                    }

                                    const groupCount = cfg?.groupCount || 1;
                                    // lobby size = ceil(teamsIn / groupCount), capped by cfg.capacity if set
                                    const autoLobbySize = groupCount > 0 ? Math.ceil(teamsIn / groupCount) : teamsIn;
                                    const lobbySize = cfg?.capacity || autoLobbySize;
                                    const teamsPerGroup = groupCount > 0 ? Math.ceil(teamsIn / groupCount) : teamsIn;
                                    // Max groups = teamsIn (1 team per group is ridiculous but valid upper bound)
                                    const maxGroups = Math.min(teamsIn, 64);
                                    // Advancement options: 1 to teamsPerGroup (can't advance more than in group)
                                    const advancementOptions = Array.from(
                                        { length: Math.max(1, teamsPerGroup) },
                                        (_, k) => k + 1
                                    );

                                    return (
                                        <div key={i} className={`p-4 rounded-xl border ${isFinalStage ? 'border-amber-500/15 bg-amber-500/[0.03]' : 'border-white/[0.06] bg-white/[0.02]'}`}>
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold ${isFinalStage ? 'bg-amber-500/15 text-amber-400' : 'bg-white/5 text-gray-400'}`}>
                                                        {i + 1}
                                                    </div>
                                                    <h4 className="font-semibold text-white text-sm">{s.name}</h4>
                                                    {isFinalStage && <span className="text-[10px] text-amber-400 uppercase tracking-widest">Finals</span>}
                                                </div>
                                                <span className="text-[10px] text-gray-500 font-medium">
                                                    {teamsIn > 0 ? `${teamsIn} ${unitsLabel} entering` : 'Awaiting registrations'}
                                                </span>
                                            </div>

                                            {!isFinalStage ? (
                                                teamsIn === 0 ? (
                                                    <p className="text-xs text-gray-500">No {unitsLabel} to configure. Register {unitsLabel} first.</p>
                                                ) : (
                                                <div className="grid grid-cols-3 gap-3">
                                                    {/* Groups — primary control, organizer sets this */}
                                                    <div className="space-y-1.5">
                                                        <Label className="text-xs text-gray-500">Groups</Label>
                                                        <Select
                                                            value={String(groupCount)}
                                                            onValueChange={(v) => {
                                                                const next = [...templateConfig];
                                                                const newGroups = parseInt(v);
                                                                const newLobbySize = Math.ceil(teamsIn / newGroups);
                                                                const newTeamsPerGroup = Math.ceil(teamsIn / newGroups);
                                                                const clampedAdv = Math.min(next[i]?.advancement || 4, newTeamsPerGroup);
                                                                next[i] = { ...next[i], groupCount: newGroups, capacity: newLobbySize, advancement: clampedAdv };
                                                                setTemplateConfig(next);
                                                            }}
                                                        >
                                                            <SelectTrigger className="h-9 bg-white/5 border-white/10 text-white text-sm">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {Array.from({ length: maxGroups }, (_, k) => k + 1).map(n => (
                                                                    <SelectItem key={n} value={String(n)}>
                                                                        {n} {n === 1 ? 'group' : 'groups'}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                        <p className="text-[10px] text-gray-600">
                                                            {teamsPerGroup} {unitsLabel}/group
                                                        </p>
                                                    </div>
                                                    {/* Lobby Size — derived from groups, read-only */}
                                                    <div className="space-y-1.5">
                                                        <Label className="text-xs text-gray-500">Lobby Size</Label>
                                                        <div className={`h-9 flex items-center px-3 rounded-md border text-sm ${maxLobbySize && teamsPerGroup > maxLobbySize ? 'bg-red-500/10 border-red-500/30 text-red-300' : 'bg-white/[0.03] border-white/10 text-gray-300'}`}>
                                                            {teamsPerGroup} {unitsLabel}
                                                            {maxLobbySize && teamsPerGroup > maxLobbySize && <AlertTriangle className="w-3 h-3 ml-1.5 text-red-400" />}
                                                        </div>
                                                        <p className="text-[10px] text-gray-600">
                                                            {maxLobbySize ? `max ${maxLobbySize}` : 'auto from groups'}
                                                        </p>
                                                    </div>
                                                    {/* Advance per Group */}
                                                    <div className="space-y-1.5">
                                                        <Label className="text-xs text-gray-500">Advance per Group</Label>
                                                        <Select
                                                            value={String(Math.min(cfg?.advancement || 1, teamsPerGroup))}
                                                            onValueChange={(v) => {
                                                                const next = [...templateConfig];
                                                                next[i] = { ...next[i], advancement: parseInt(v) };
                                                                setTemplateConfig(next);
                                                            }}
                                                        >
                                                            <SelectTrigger className="h-9 bg-white/5 border-white/10 text-white text-sm">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {advancementOptions.map(n => (
                                                                    <SelectItem key={n} value={String(n)}>Top {n}</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                        <p className="text-[10px] text-emerald-500/70">
                                                            {Math.min(cfg?.advancement || 1, teamsPerGroup) * groupCount} total advance
                                                        </p>
                                                    </div>
                                                </div>
                                                )
                                            ) : (
                                                <p className="text-xs text-gray-500">
                                                    {teamsIn > 0
                                                        ? <>
                                                            Receives <strong className="text-white">{teamsIn}</strong> teams from previous stage.
                                                            {maxLobbySize && <span className="text-gray-600"> Game max: {maxLobbySize}/lobby.</span>}
                                                          </>
                                                        : `Awaiting ${unitsLabel} from previous stage.`}
                                                </p>
                                            )}

                                            {/* Per-stage validation error */}
                                            {templateConfigErrors[i] && (
                                                <div className="mt-3 flex items-start gap-2 p-2.5 bg-red-500/10 border border-red-500/20 rounded-lg">
                                                    <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
                                                    <p className="text-xs text-red-300 leading-relaxed">{templateConfigErrors[i]}</p>
                                                </div>
                                            )}
                                        </div>
                                    );
                                });
                                })()}
                            </div>
                            <div className="px-6 py-4 border-t border-white/5 flex items-center gap-3">
                                <Button variant="ghost" className="text-gray-400" onClick={() => setSelectedTemplate(null)}>
                                    Back
                                </Button>
                                {hasTemplateErrors && (
                                    <p className="text-xs text-red-400 flex items-center gap-1.5 flex-1">
                                        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                                        Fix the errors above before applying.
                                    </p>
                                )}
                                <Button
                                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-40 disabled:cursor-not-allowed"
                                    onClick={handleApplyTemplate}
                                    disabled={applyingTemplate || hasTemplateErrors || registeredTeamCount === 0}
                                    title={hasTemplateErrors ? 'Resolve validation errors first' : registeredTeamCount === 0 ? `No ${unitLabel} count available` : undefined}
                                >
                                    {applyingTemplate ? 'Applying...' : `Apply ${selectedTemplate.stages.length} Stages`}
                                </Button>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {/* Advance Teams Confirmation */}
            <AlertDialog open={!!advanceConfirmStageId} onOpenChange={() => setAdvanceConfirmStageId(null)}>
                <AlertDialogContent className="bg-[#0a0a0c] border-white/10">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-white flex items-center gap-2">
                            <ArrowRight className="w-5 h-5 text-emerald-400" />
                            Advance {UnitsLabel}
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-gray-400">
                            {(() => {
                                const stage = sortedStages.find(s => s.id === advanceConfirmStageId);
                                const flow = stage ? stageFlows.get(stage.id) : null;
                                if (!stage) return '';
                                return `This will advance the top ${flow?.teamsAdvancing || '?'} ${unitsLabel} (${stage.advancement_count}/group) from "${stage.name}" to the next stage. This stage will be marked as completed.`;
                            })()}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="border-white/10 text-white hover:bg-white/10">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-emerald-600 hover:bg-emerald-500 text-white"
                            disabled={isAdvancing}
                            onClick={() => {
                                const stage = sortedStages.find(s => s.id === advanceConfirmStageId);
                                if (stage?.advancement_count && advanceConfirmStageId) {
                                    handleAdvanceTeams(advanceConfirmStageId, stage.advancement_count);
                                }
                            }}
                        >
                            {isAdvancing ? 'Advancing...' : `Advance ${UnitsLabel}`}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Reset All Stages Confirmation */}
            <AlertDialog open={resetConfirmOpen} onOpenChange={setResetConfirmOpen}>
                <AlertDialogContent className="bg-[#0a0a0c] border-white/10">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-white flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-red-400" />
                            Reset All Stages
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-gray-400">
                            This will permanently delete all {sortedStages.length} stages, including their groups, rounds, and results. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="border-white/10 text-white hover:bg-white/10">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-red-600 hover:bg-red-700 text-white"
                            disabled={isResetting}
                            onClick={handleResetAllStages}
                        >
                            {isResetting ? 'Resetting...' : 'Reset All Stages'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

        </>
    );
};
