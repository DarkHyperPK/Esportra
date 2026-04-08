import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Eye,
  EyeOff,
  ChevronUp,
  ChevronDown,
  RefreshCw,
  Save,
  RotateCcw,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useDashboardWidgets,
  useDashboardPreferences,
  useSaveDashboardPreferences,
  type DashboardWidget,
  type WidgetConfig,
} from '@/hooks/useAdminQueries';

// ── Constants ──────────────────────────────────────────────────────────────────

const CATEGORIES = [
  'All',
  'Platform',
  'Analytics',
  'Tournaments',
  'Finance',
  'Moderation',
  'Security',
  'Compliance',
] as const;

type Category = (typeof CATEGORIES)[number];

const CATEGORY_BADGE: Record<string, string> = {
  platform:    'bg-blue-500/15 text-blue-400 border-blue-500/30',
  analytics:   'bg-purple-500/15 text-purple-400 border-purple-500/30',
  tournaments: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  finance:     'bg-green-500/15 text-green-400 border-green-500/30',
  moderation:  'bg-rose-500/15 text-rose-400 border-rose-500/30',
  security:    'bg-amber-500/15 text-amber-400 border-amber-500/30',
  compliance:  'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
};

// ── Helpers ────────────────────────────────────────────────────────────────────

const categoryBadgeClass = (cat: string) =>
  CATEGORY_BADGE[cat.toLowerCase()] ?? 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30';

/** Build a fresh layout from the widget catalog (all visible, sequential positions). */
function buildDefaultLayout(widgets: DashboardWidget[]): WidgetConfig[] {
  return widgets.map((w, i) => ({
    widgetId: w.id,
    position: i,
    visible: true,
    refreshInterval: w.defaultRefreshInterval ?? null,
  }));
}

/** Merge saved preferences with catalog — add any missing widgets at the end. */
function mergePreferences(
  saved: WidgetConfig[],
  widgets: DashboardWidget[],
): WidgetConfig[] {
  const savedIds = new Set(saved.map((s) => s.widgetId));
  const merged = [...saved];
  // Use max existing position + 1 so new catalog widgets don't collide with saved ones
  let nextPos = saved.length > 0 ? Math.max(...saved.map(s => s.position)) + 1 : 0;
  for (const w of widgets) {
    if (!savedIds.has(w.id)) {
      merged.push({
        widgetId: w.id,
        position: nextPos++,
        visible: false,
        refreshInterval: w.defaultRefreshInterval ?? null,
      });
    }
  }
  return merged.sort((a, b) => a.position - b.position);
}

function layoutsEqual(a: WidgetConfig[], b: WidgetConfig[]): boolean {
  if (a.length !== b.length) return false;
  return a.every(
    (item, i) =>
      item.widgetId === b[i].widgetId &&
      item.visible === b[i].visible &&
      item.position === b[i].position &&
      item.refreshInterval === b[i].refreshInterval,
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

interface WidgetRowLeftProps {
  widget: DashboardWidget;
  config: WidgetConfig;
  onToggle: (id: string) => void;
}

function WidgetRowLeft({ widget, config, onToggle }: WidgetRowLeftProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -12 }}
      transition={{ duration: 0.18 }}
      className="flex items-start gap-4 p-4 rounded-2xl bg-[#121214] border border-white/5
                 hover:border-white/10 transition-colors group"
    >
      {/* Toggle */}
      <div className="pt-0.5 shrink-0">
        <Switch
          checked={config.visible}
          onCheckedChange={() => onToggle(widget.id)}
          aria-label={config.visible ? `Hide ${widget.name}` : `Show ${widget.name}`}
        />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`text-sm font-semibold transition-colors ${
              config.visible ? 'text-white' : 'text-zinc-500'
            }`}
          >
            {widget.name}
          </span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full border font-medium ${categoryBadgeClass(widget.category)}`}
          >
            {widget.category}
          </span>
        </div>
        <p className="text-xs text-zinc-500 mt-1 leading-relaxed line-clamp-2">
          {widget.description}
        </p>
      </div>

      {/* Eye indicator */}
      <div className="shrink-0 text-zinc-600 group-hover:text-zinc-400 transition-colors">
        {config.visible ? (
          <Eye className="w-4 h-4 text-emerald-500/70" />
        ) : (
          <EyeOff className="w-4 h-4" />
        )}
      </div>
    </motion.div>
  );
}

interface OrderRowProps {
  widget: DashboardWidget | undefined;
  config: WidgetConfig;
  index: number;
  total: number;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  onRefreshChange: (id: string, value: number | null) => void;
}

function OrderRow({
  widget,
  config,
  index,
  total,
  onMoveUp,
  onMoveDown,
  onRefreshChange,
}: OrderRowProps) {
  const handleRefresh = (raw: string) => {
    const n = parseInt(raw, 10);
    onRefreshChange(config.widgetId, isNaN(n) || n < 0 ? null : n);
  };

  return (
    <motion.div
      layout
      key={config.widgetId}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.18 }}
      className="flex items-center gap-3 p-3 rounded-2xl bg-[#121214] border border-white/5
                 hover:border-white/10 transition-colors"
    >
      {/* Position badge */}
      <span className="w-7 h-7 flex items-center justify-center rounded-xl bg-white/5
                        text-xs font-bold text-zinc-400 shrink-0">
        {index + 1}
      </span>

      {/* Name */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">
          {widget?.name ?? config.widgetId}
        </p>
        {widget && (
          <p className="text-xs text-zinc-600 truncate">{widget.category}</p>
        )}
      </div>

      {/* Refresh interval */}
      <div className="flex items-center gap-1.5 shrink-0">
        <RefreshCw className="w-3.5 h-3.5 text-zinc-600" />
        <Input
          type="number"
          min={0}
          value={config.refreshInterval ?? ''}
          onChange={(e) => handleRefresh(e.target.value)}
          placeholder="—"
          className="w-20 h-7 text-xs bg-[#0a0a0c] border-white/10 rounded-xl text-center
                     focus:border-rose-500/50 [appearance:textfield]
                     [&::-webkit-outer-spin-button]:appearance-none
                     [&::-webkit-inner-spin-button]:appearance-none"
          aria-label={`Refresh interval for ${widget?.name ?? config.widgetId} in seconds`}
        />
        <span className="text-xs text-zinc-600">s</span>
      </div>

      {/* Up / Down */}
      <div className="flex flex-col gap-0.5 shrink-0">
        <button
          onClick={() => onMoveUp(config.widgetId)}
          disabled={index === 0}
          aria-label={`Move ${widget?.name ?? config.widgetId} up`}
          className="w-6 h-6 flex items-center justify-center rounded-lg
                     text-zinc-500 hover:text-white hover:bg-white/10
                     disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronUp className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onMoveDown(config.widgetId)}
          disabled={index === total - 1}
          aria-label={`Move ${widget?.name ?? config.widgetId} down`}
          className="w-6 h-6 flex items-center justify-center rounded-lg
                     text-zinc-500 hover:text-white hover:bg-white/10
                     disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  );
}

// ── Skeleton ───────────────────────────────────────────────────────────────────

function DashboardCustomizationSkeleton() {
  return (
    <div className="min-h-screen p-4 lg:p-8 max-w-7xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Skeleton className="w-12 h-12 rounded-2xl" />
        <div className="space-y-2">
          <Skeleton className="w-56 h-6 rounded-xl" />
          <Skeleton className="w-36 h-4 rounded-xl" />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="w-full h-20 rounded-2xl" />
          ))}
        </div>
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="w-full h-14 rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Error State ────────────────────────────────────────────────────────────────

function ErrorRetry({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="flex flex-col items-center gap-4 text-center max-w-sm">
        <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center">
          <AlertCircle className="w-7 h-7 text-red-500" />
        </div>
        <div>
          <p className="text-white font-semibold">Failed to load</p>
          <p className="text-zinc-500 text-sm mt-1">{message}</p>
        </div>
        <Button onClick={onRetry} variant="outline" size="sm">
          Try again
        </Button>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function DashboardCustomization() {
  const { data: widgetsRaw, isLoading: loadingWidgets, error: widgetsError, refetch: refetchWidgets } =
    useDashboardWidgets();
  const { data: prefsRaw, isLoading: loadingPrefs, error: prefsError, refetch: refetchPrefs } =
    useDashboardPreferences();
  const save = useSaveDashboardPreferences();

  const widgets: DashboardWidget[] = useMemo(() => widgetsRaw ?? [], [widgetsRaw]);

  // ── Local layout state ──────────────────────────────────────────────────────
  const [layout, setLayout] = useState<WidgetConfig[]>([]);
  const [savedLayout, setSavedLayout] = useState<WidgetConfig[]>([]);
  const [activeCategory, setActiveCategory] = useState<Category>('All');

  // Seed layout once data arrives
  // isSeeded prevents background refetches from overwriting unsaved edits
  const isSeeded = useRef(false);
  useEffect(() => {
    if (!widgets.length || loadingPrefs) return;
    if (isSeeded.current) return; // Don't overwrite unsaved edits on background refetch
    const merged = prefsRaw?.layout
      ? mergePreferences(prefsRaw.layout, widgets)
      : buildDefaultLayout(widgets);
    setLayout(merged);
    setSavedLayout(merged);
    isSeeded.current = true;
  }, [widgets, prefsRaw, loadingPrefs]);

  // ── Dirty tracking ──────────────────────────────────────────────────────────
  const isDirty = useMemo(() => !layoutsEqual(layout, savedLayout), [layout, savedLayout]);

  // Warn on unload when dirty
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const toggleWidget = useCallback((id: string) => {
    setLayout((prev) =>
      prev.map((c) => (c.widgetId === id ? { ...c, visible: !c.visible } : c)),
    );
  }, []);

  const moveUp = useCallback((id: string) => {
    setLayout((prev) => {
      const idx = prev.findIndex((c) => c.widgetId === id);
      if (idx <= 0) return prev;
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next.map((c, i) => ({ ...c, position: i }));
    });
  }, []);

  const moveDown = useCallback((id: string) => {
    setLayout((prev) => {
      const idx = prev.findIndex((c) => c.widgetId === id);
      if (idx < 0 || idx >= prev.length - 1) return prev;
      const next = [...prev];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      return next.map((c, i) => ({ ...c, position: i }));
    });
  }, []);

  const changeRefresh = useCallback((id: string, value: number | null) => {
    setLayout((prev) =>
      prev.map((c) => (c.widgetId === id ? { ...c, refreshInterval: value } : c)),
    );
  }, []);

  const resetToDefault = useCallback(() => {
    if (!widgets.length) return;
    const def = buildDefaultLayout(widgets);
    setLayout(def);
  }, [widgets]);

  const handleSave = async () => {
    await save.mutateAsync({ layout });
    setSavedLayout(layout);
  };

  // ── Derived data ─────────────────────────────────────────────────────────────

  const widgetMap = useMemo(
    () => new Map(widgets.map((w) => [w.id, w])),
    [widgets],
  );

  const filteredWidgets = useMemo(() => {
    if (activeCategory === 'All') return widgets;
    return widgets.filter(
      (w) => w.category.toLowerCase() === activeCategory.toLowerCase(),
    );
  }, [widgets, activeCategory]);

  const filteredConfigs = useMemo(
    () =>
      filteredWidgets
        .map((w) => layout.find((c) => c.widgetId === w.id))
        .filter((c): c is WidgetConfig => c !== undefined),
    [filteredWidgets, layout],
  );

  const visibleConfigs = useMemo(
    () => layout.filter((c) => c.visible).sort((a, b) => a.position - b.position),
    [layout],
  );

  // ── Loading / error guards ──────────────────────────────────────────────────

  if (loadingWidgets || loadingPrefs) return <DashboardCustomizationSkeleton />;

  if (widgetsError || prefsError) {
    return (
      <ErrorRetry
        message={(widgetsError || prefsError)?.message ?? 'Unknown error'}
        onRetry={() => {
          void refetchWidgets();
          void refetchPrefs();
        }}
      />
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen p-4 lg:p-8 max-w-7xl mx-auto">

      {/* ── Header ── */}
      <motion.header
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center shrink-0">
            <LayoutDashboard className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight text-white">
                Dashboard Layout
              </h1>
              <AnimatePresence>
                {isDirty && (
                  <motion.span
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    className="flex items-center gap-1.5 text-xs text-amber-400 font-medium"
                    aria-live="polite"
                  >
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    Unsaved changes
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
            <p className="text-sm text-zinc-500 mt-0.5">
              Control which widgets appear on the admin dashboard and in what order.
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-3 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={resetToDefault}
            className="gap-2 border-white/10 text-zinc-400 hover:text-white hover:border-white/20"
          >
            <RotateCcw className="w-4 h-4" />
            Reset to Default
          </Button>
          <Button
            size="sm"
            onClick={() => void handleSave()}
            disabled={!isDirty || save.isPending}
            className="gap-2 bg-rose-500 hover:bg-rose-400 active:bg-rose-600 text-white
                       disabled:opacity-40 disabled:cursor-not-allowed min-w-[120px]"
          >
            {save.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </motion.header>

      <Separator className="bg-white/5 mb-8" />

      {/* ── Two-panel layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6 items-start">

        {/* ── Left panel: Available Widgets ── */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-[#0a0a0c] rounded-3xl border border-white/5 overflow-hidden"
          aria-label="Available widgets"
        >
          {/* Panel header */}
          <div className="px-6 py-5 border-b border-white/5">
            <h2 className="text-base font-bold text-white">Available Widgets</h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Toggle widgets on or off — visible ones appear in the order panel.
            </p>
          </div>

          {/* Category filter */}
          <div className="px-4 pt-4 pb-2 overflow-x-auto">
            <Tabs
              value={activeCategory}
              onValueChange={(v) => setActiveCategory(v as Category)}
            >
              <TabsList className="bg-[#121214] border border-white/5 gap-0.5 h-9 flex-nowrap w-max">
                {CATEGORIES.map((cat) => (
                  <TabsTrigger
                    key={cat}
                    value={cat}
                    className="text-xs px-3 h-7 data-[state=active]:bg-white/10
                               data-[state=active]:text-white text-zinc-500 rounded-xl"
                  >
                    {cat}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          {/* Widget list */}
          <div className="p-4 space-y-2">
            {filteredConfigs.length === 0 ? (
              <div className="py-12 text-center text-zinc-600 text-sm">
                No widgets in this category.
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
                {filteredConfigs.map((config) => {
                  const widget = widgetMap.get(config.widgetId);
                  if (!widget) return null;
                  return (
                    <WidgetRowLeft
                      key={config.widgetId}
                      widget={widget}
                      config={config}
                      onToggle={toggleWidget}
                    />
                  );
                })}
              </AnimatePresence>
            )}
          </div>

          {/* Footer summary */}
          <div className="px-6 py-4 border-t border-white/5 flex items-center justify-between">
            <span className="text-xs text-zinc-600">
              {layout.filter((c) => c.visible).length} of {layout.length} widgets visible
            </span>
            <Badge variant="outline" className="text-xs border-white/10 text-zinc-400">
              {widgets.length} total
            </Badge>
          </div>
        </motion.section>

        {/* ── Right panel: Widget Order ── */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-[#0a0a0c] rounded-3xl border border-white/5 overflow-hidden sticky top-6"
          aria-label="Widget order"
        >
          {/* Panel header */}
          <div className="px-6 py-5 border-b border-white/5">
            <h2 className="text-base font-bold text-white">Widget Order</h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Reorder visible widgets and set refresh intervals (seconds).
            </p>
          </div>

          {/* Order list */}
          <div className="p-4 space-y-2 max-h-[600px] overflow-y-auto">
            {visibleConfigs.length === 0 ? (
              <div className="py-12 text-center text-zinc-600 text-sm">
                No widgets are currently visible.
                <br />
                <span className="text-zinc-700">Enable some widgets in the left panel.</span>
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
                {visibleConfigs.map((config, idx) => (
                  <OrderRow
                    key={config.widgetId}
                    widget={widgetMap.get(config.widgetId)}
                    config={config}
                    index={idx}
                    total={visibleConfigs.length}
                    onMoveUp={moveUp}
                    onMoveDown={moveDown}
                    onRefreshChange={changeRefresh}
                  />
                ))}
              </AnimatePresence>
            )}
          </div>

          {/* Footer hint */}
          {visibleConfigs.length > 0 && (
            <div className="px-6 py-4 border-t border-white/5">
              <p className="text-xs text-zinc-700">
                Use ↑↓ arrows to change order · Set refresh to 0 or leave blank to disable auto-refresh.
              </p>
            </div>
          )}
        </motion.section>
      </div>
    </div>
  );
}
