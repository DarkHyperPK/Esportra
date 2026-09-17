import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Loader2, Trash2, Lock, RefreshCw, ChevronLeft, ChevronRight, Wand2,
} from 'lucide-react';
import { AdminPage } from '@/components/admin/AdminPage';
import { CommandButton, CommandSection } from '@/components/management/CommandSurface';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiClient } from '@/lib/apiClient';
import { AVATAR_STYLES, type AvatarStyleId } from '@/components/player/avatarStyles';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// ── Types ─────────────────────────────────────────────────────────────────────

interface AdminPoolItem {
    id: string;
    style: string;
    seed: string;
    claimed_by: string | null;
    claimed_at: string | null;
    created_at: string;
    claimed_by_username: string | null;
}

interface AdminPoolResponse {
    items: AdminPoolItem[];
    total: number;
    claimed: number;
    available: number;
    page: number;
    pageSize: number;
}

// ── Seed generator ────────────────────────────────────────────────────────────

const ADJECTIVES = [
    'swift', 'iron', 'shadow', 'storm', 'frost', 'venom', 'blaze', 'lunar', 'void',
    'azure', 'crimson', 'golden', 'silent', 'rogue', 'wild', 'night', 'cyber', 'nova',
    'phantom', 'apex', 'dark', 'toxic', 'neon', 'hyper', 'stealth', 'epic', 'radiant',
];
const NOUNS = [
    'wolf', 'hawk', 'fang', 'bolt', 'blade', 'claw', 'drake', 'rex', 'viper',
    'titan', 'ghost', 'reaper', 'striker', 'warden', 'forge', 'pulse', 'core',
    'shard', 'lance', 'echo', 'surge', 'nexus', 'rift', 'omen', 'veil', 'scion',
];

function generateRandomSeeds(count: number): string[] {
    const out = new Set<string>();
    while (out.size < count) {
        const a = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
        const n = NOUNS[Math.floor(Math.random() * NOUNS.length)];
        out.add(`${a}${n}`);
    }
    return [...out];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function dicebearUrl(style: string, seed: string) {
    return `https://api.dicebear.com/10.x/${style}/svg?seed=${encodeURIComponent(seed)}`;
}

// ── Pool item card ─────────────────────────────────────────────────────────────

function PoolItemCard({ item, onDelete }: { item: AdminPoolItem; onDelete: (id: string) => void }) {
    const isClaimed = !!item.claimed_by;

    return (
        <div className={cn(
            'group relative border bg-white/[0.025] p-3 flex flex-col gap-2 transition-colors',
            isClaimed ? 'border-white/5' : 'border-white/10 hover:border-white/20',
        )}>
            <div className="flex items-center gap-3">
                <div className={cn(
                    'relative w-10 h-10 rounded-full overflow-hidden shrink-0 ring-1',
                    isClaimed ? 'ring-white/10 opacity-50' : 'ring-white/20',
                )}>
                    <img
                        src={dicebearUrl(item.style, item.seed)}
                        alt={item.seed}
                        className="w-full h-full object-cover"
                    />
                    {isClaimed && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                            <Lock className="w-3 h-3 text-zinc-400" />
                        </div>
                    )}
                </div>

                <div className="flex-1 min-w-0">
                    <p className="font-mono text-[11px] font-bold text-white truncate">{item.seed}</p>
                    <p className="font-mono text-[10px] text-zinc-600 capitalize">{item.style}</p>
                </div>

                {!isClaimed && (
                    <button
                        type="button"
                        onClick={() => onDelete(item.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-zinc-600 hover:text-red-400"
                        title="Delete"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                )}
            </div>

            {isClaimed ? (
                <div className="font-mono text-[9px] text-zinc-600 border-t border-white/5 pt-1.5 truncate">
                    CLAIMED — {item.claimed_by_username ?? 'unknown'}
                </div>
            ) : (
                <div className="font-mono text-[9px] text-emerald-600 border-t border-white/5 pt-1.5">
                    AVAILABLE
                </div>
            )}
        </div>
    );
}

// ── Drop batch panel ──────────────────────────────────────────────────────────

function DropPanel({ onSuccess }: { onSuccess: () => void }) {
    const { toast } = useToast();
    const [style, setStyle] = useState<AvatarStyleId>('critters');
    const [seeds, setSeeds] = useState<string[]>([]);

    const batchMutation = useMutation({
        mutationFn: (items: { Style: string; Seed: string }[]) =>
            apiClient.post<{ inserted: number; total: number }>('/api/admin/avatars/pool/batch', items),
        onSuccess: (data) => {
            toast({
                title: `${data.inserted} avatar${data.inserted === 1 ? '' : 's'} added`,
                description: data.total > data.inserted
                    ? `${data.total - data.inserted} duplicate(s) skipped.`
                    : 'All seeds are now in the pool.',
            });
            setSeeds([]);
            onSuccess();
        },
        onError: (err: any) => {
            toast({ title: 'Drop failed', description: err?.body?.error ?? 'Something went wrong.', variant: 'destructive' });
        },
    });

    const handleGenerate = () => {
        const generated = generateRandomSeeds(10);
        setSeeds(prev => {
            const existing = new Set(prev);
            generated.forEach(s => existing.add(s));
            return [...existing];
        });
    };

    const handleRemove = (seed: string) => setSeeds(prev => prev.filter(s => s !== seed));

    const handleDrop = () => {
        if (seeds.length === 0) return;
        batchMutation.mutate(seeds.map(seed => ({ Style: style, Seed: seed })));
    };

    return (
        <div className="border border-white/10 bg-white/[0.02] p-5 space-y-5">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">Drop Batch</p>

            {/* Style selector */}
            <div className="space-y-1">
                <p className="font-mono text-[10px] uppercase tracking-wider text-zinc-600">Style</p>
                <Select value={style} onValueChange={(v) => setStyle(v as AvatarStyleId)}>
                    <SelectTrigger className="bg-black border-white/10 text-white font-mono text-xs h-9">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-950 border-white/10 text-white">
                        {AVATAR_STYLES.map(({ id, label }) => (
                            <SelectItem key={id} value={id} className="font-mono text-xs focus:bg-white/10">
                                {label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Actions row */}
            <div className="flex items-center gap-2">
                <button
                    type="button"
                    onClick={handleGenerate}
                    className="flex items-center gap-1.5 h-7 px-3 border border-white/10 bg-white/[0.03] font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-400 hover:text-white hover:border-white/20 transition-colors"
                >
                    <Wand2 className="w-3 h-3" />
                    Generate 10
                </button>
                {seeds.length > 0 && (
                    <button
                        type="button"
                        onClick={() => setSeeds([])}
                        className="flex items-center gap-1.5 h-7 px-3 border border-white/10 bg-white/[0.03] font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-600 hover:text-red-400 hover:border-red-500/20 transition-colors"
                    >
                        <Trash2 className="w-3 h-3" />
                        Clear all
                    </button>
                )}
            </div>

            {/* Avatar preview grid */}
            {seeds.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 border border-dashed border-white/10 gap-2">
                    <Wand2 className="w-5 h-5 text-zinc-700" />
                    <p className="font-mono text-[10px] text-zinc-700">Generate avatars to preview them</p>
                </div>
            ) : (
                <div className="max-h-64 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    <div className="grid grid-cols-5 gap-2">
                        {seeds.map(seed => (
                            <button
                                key={seed}
                                type="button"
                                onClick={() => handleRemove(seed)}
                                title={seed}
                                className="group relative aspect-square rounded-full overflow-hidden ring-1 ring-white/10 hover:ring-red-500/50 transition-all"
                            >
                                <img
                                    src={dicebearUrl(style, seed)}
                                    alt={seed}
                                    className="w-full h-full object-cover group-hover:opacity-40 transition-opacity"
                                />
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between pt-1 border-t border-white/10">
                <p className="font-mono text-[10px] text-zinc-600">
                    {seeds.length > 0 ? <span className="text-white">{seeds.length}</span> : '0'} ready
                </p>
                <CommandButton
                    onClick={handleDrop}
                    disabled={seeds.length === 0 || batchMutation.isPending}
                    variant="primary"
                    size="sm"
                >
                    {batchMutation.isPending
                        ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Dropping...</>
                        : <>Drop {seeds.length > 0 ? seeds.length : ''} avatars</>
                    }
                </CommandButton>
            </div>
        </div>
    );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AvatarPoolManagement() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [styleFilter, setStyleFilter] = useState<AvatarStyleId | 'all'>('all');
    const [page, setPage] = useState(0);
    const PAGE_SIZE = 20;

    const { data, isLoading, refetch } = useQuery({
        queryKey: ['admin-avatar-pool', styleFilter, page],
        queryFn: () => {
            const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
            if (styleFilter !== 'all') params.set('style', styleFilter);
            return apiClient.get<AdminPoolResponse>(`/api/admin/avatars/pool?${params}`);
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => apiClient.delete(`/api/admin/avatars/pool/${id}`),
        onSuccess: () => {
            toast({ title: 'Avatar removed', description: 'Item deleted from the pool.' });
            queryClient.invalidateQueries({ queryKey: ['admin-avatar-pool'] });
        },
        onError: (err: any) => {
            toast({ title: 'Cannot delete', description: err?.body?.error ?? 'Something went wrong.', variant: 'destructive' });
        },
    });

    const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0;

    const handleStyleFilter = (s: AvatarStyleId | 'all') => {
        setStyleFilter(s);
        setPage(0);
    };

    return (
        <AdminPage
            eyebrow="Content"
            title="Avatar Pool"
            description="Manage the finite pool of exclusive avatars users can claim."
            actions={
                <CommandButton onClick={() => refetch()} variant="ghost" size="sm">
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                    Refresh
                </CommandButton>
            }
        >
            <div className="p-6 space-y-6">
                {/* Stats strip */}
                <div className="grid grid-cols-3 gap-4">
                    {[
                        { label: 'Total in pool', value: data?.total ?? '—' },
                        { label: 'Claimed', value: data?.claimed ?? '—' },
                        { label: 'Available', value: data?.available ?? '—' },
                    ].map(({ label, value }) => (
                        <div key={label} className="border border-white/10 bg-white/[0.025] p-4">
                            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-600 mb-1">{label}</p>
                            <p className="font-mono text-2xl font-black text-white">{value}</p>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-6">
                    {/* Pool browser */}
                    <CommandSection title="Pool">
                        {/* Style filter */}
                        <div className="flex flex-wrap gap-1.5 mb-5">
                            {(['all', ...AVATAR_STYLES.map(s => s.id)] as const).map((id) => {
                                const label = id === 'all' ? 'All' : AVATAR_STYLES.find(s => s.id === id)?.label ?? id;
                                return (
                                    <button
                                        key={id}
                                        type="button"
                                        onClick={() => handleStyleFilter(id as AvatarStyleId | 'all')}
                                        className={cn(
                                            'h-7 px-3 font-mono text-[10px] font-bold uppercase tracking-wider border transition-colors',
                                            styleFilter === id
                                                ? 'border-rose-500/50 bg-rose-500/10 text-white'
                                                : 'border-white/10 bg-white/[0.03] text-zinc-500 hover:text-white hover:border-white/20',
                                        )}
                                    >
                                        {label}
                                    </button>
                                );
                            })}
                        </div>

                        {isLoading ? (
                            <div className="flex items-center justify-center h-40">
                                <Loader2 className="w-6 h-6 animate-spin text-zinc-600" />
                            </div>
                        ) : data?.items.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-40 gap-2 text-center border border-dashed border-white/10">
                                <Lock className="w-6 h-6 text-zinc-700" />
                                <p className="font-mono text-xs text-zinc-600">No avatars in pool yet</p>
                                <p className="font-mono text-[10px] text-zinc-700">Use the drop panel to add some</p>
                            </div>
                        ) : (
                            <>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                    {data?.items.map(item => (
                                        <PoolItemCard
                                            key={item.id}
                                            item={item}
                                            onDelete={(id) => deleteMutation.mutate(id)}
                                        />
                                    ))}
                                </div>

                                {/* Pagination */}
                                {totalPages > 1 && (
                                    <div className="flex items-center justify-between pt-4 border-t border-white/10 mt-4">
                                        <p className="font-mono text-[10px] text-zinc-600">
                                            Page {page + 1} / {totalPages}
                                            &nbsp;·&nbsp;
                                            {data?.total} items
                                        </p>
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setPage(p => p - 1)}
                                                disabled={page === 0}
                                                className="h-7 w-7 flex items-center justify-center border border-white/10 text-zinc-500 hover:text-white hover:border-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                            >
                                                <ChevronLeft className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setPage(p => p + 1)}
                                                disabled={page + 1 >= totalPages}
                                                className="h-7 w-7 flex items-center justify-center border border-white/10 text-zinc-500 hover:text-white hover:border-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                            >
                                                <ChevronRight className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </CommandSection>

                    {/* Drop panel */}
                    <DropPanel onSuccess={() => {
                        queryClient.invalidateQueries({ queryKey: ['admin-avatar-pool'] });
                    }} />
                </div>
            </div>
        </AdminPage>
    );
}
