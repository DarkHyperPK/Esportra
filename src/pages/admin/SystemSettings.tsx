import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Globe, UserPlus, Trophy, Shield, HardDrive, Bell,
  Settings, Save, Eye, EyeOff, AlertCircle, RefreshCw,
  Inbox, Loader2,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useSystemSettings,
  useUpdateSystemSettings,
  type SystemSetting,
} from '@/hooks/useAdminQueries';

/* ═══════════════════════════════════════════════════════════════════════════
   Category Configuration
   ═══════════════════════════════════════════════════════════════════════ */

interface CategoryMeta {
  key: string;
  label: string;
  icon: LucideIcon;
  description: string;
}

const categories: CategoryMeta[] = [
  { key: 'platform', label: 'Platform', icon: Globe, description: 'General platform configuration' },
  { key: 'registration', label: 'Registration', icon: UserPlus, description: 'User registration rules' },
  { key: 'tournaments', label: 'Tournaments', icon: Trophy, description: 'Tournament defaults & limits' },
  { key: 'security', label: 'Security', icon: Shield, description: 'Authentication & access controls' },
  { key: 'storage', label: 'Storage', icon: HardDrive, description: 'File upload settings' },
  { key: 'notifications', label: 'Notifications', icon: Bell, description: 'Notification channels' },
];

/* ═══════════════════════════════════════════════════════════════════════════
   Animation Variants
   ═══════════════════════════════════════════════════════════════════════ */

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.04, duration: 0.3, ease: 'easeOut' },
  }),
};

const tabContent = {
  hidden: { opacity: 0, x: 8 },
  show: { opacity: 1, x: 0, transition: { duration: 0.25, ease: 'easeOut' } },
  exit: { opacity: 0, x: -8, transition: { duration: 0.15 } },
};

/* ═══════════════════════════════════════════════════════════════════════════
   Skeleton Loader
   ═══════════════════════════════════════════════════════════════════════ */

const SettingsSkeleton = () => (
  <div className="space-y-4">
    {Array.from({ length: 4 }).map((_, i) => (
      <div
        key={i}
        className="rounded-2xl border border-white/5 bg-[#0a0a0c] p-5 space-y-3"
      >
        <Skeleton className="h-4 w-40 bg-zinc-800" />
        <Skeleton className="h-3 w-64 bg-zinc-800/60" />
        <Skeleton className="h-10 w-full bg-zinc-800/40" />
      </div>
    ))}
  </div>
);

/* ═══════════════════════════════════════════════════════════════════════════
   Error State
   ═══════════════════════════════════════════════════════════════════════ */

const ErrorState = ({ message, onRetry }: { message: string; onRetry: () => void }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="flex flex-col items-center gap-4 rounded-2xl border border-red-500/20 bg-red-500/5 p-10"
  >
    <AlertCircle className="h-10 w-10 text-red-400" />
    <p className="text-red-400 font-medium text-center">{message}</p>
    <Button
      variant="outline"
      size="sm"
      onClick={onRetry}
      className="border-red-500/30 text-red-400 hover:bg-red-500/10"
    >
      <RefreshCw className="mr-2 h-4 w-4" />
      Retry
    </Button>
  </motion.div>
);

/* ═══════════════════════════════════════════════════════════════════════════
   Empty State
   ═══════════════════════════════════════════════════════════════════════ */

const EmptyState = ({ category }: { category: string }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="flex flex-col items-center gap-3 rounded-2xl border border-white/5 bg-[#0a0a0c] p-12"
  >
    <Inbox className="h-10 w-10 text-zinc-600" />
    <p className="text-zinc-500 text-sm">
      No settings found in <span className="text-zinc-400 font-medium">{category}</span>
    </p>
  </motion.div>
);

/* ═══════════════════════════════════════════════════════════════════════════
   Sensitive Value Display
   ═══════════════════════════════════════════════════════════════════════ */

const SensitiveField = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (val: string) => void;
}) => {
  const [revealed, setRevealed] = useState(false);

  return (
    <div className="relative">
      <Input
        type={revealed ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-zinc-900 border-zinc-800 text-white pr-12 font-mono text-sm"
        autoComplete="off"
      />
      <button
        type="button"
        onClick={() => setRevealed((v) => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
        aria-label={revealed ? 'Hide value' : 'Reveal value'}
      >
        {revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   Individual Setting Card
   ═══════════════════════════════════════════════════════════════════════ */

const SettingCard = ({
  setting,
  localValue,
  isModified,
  onValueChange,
  index,
}: {
  setting: SystemSetting;
  localValue: string;
  isModified: boolean;
  onValueChange: (key: string, value: string) => void;
  index: number;
}) => {
  const renderInput = () => {
    // Sensitive fields get masked input
    if (setting.is_sensitive) {
      return (
        <SensitiveField
          value={localValue}
          onChange={(val) => onValueChange(setting.key, val)}
        />
      );
    }

    switch (setting.data_type) {
      case 'boolean':
        return (
          <div className="flex items-center gap-3">
            <Switch
              checked={localValue === 'true'}
              onCheckedChange={(checked) =>
                onValueChange(setting.key, checked ? 'true' : 'false')
              }
              className="data-[state=checked]:bg-rose-500"
              aria-label={setting.label}
            />
            <span className="text-sm text-zinc-400">
              {localValue === 'true' ? 'Enabled' : 'Disabled'}
            </span>
          </div>
        );

      case 'number':
        return (
          <Input
            type="number"
            value={localValue}
            onChange={(e) => onValueChange(setting.key, e.target.value)}
            className="bg-zinc-900 border-zinc-800 text-white max-w-xs"
            min={0}
          />
        );

      case 'email':
        return (
          <Input
            type="email"
            value={localValue}
            onChange={(e) => onValueChange(setting.key, e.target.value)}
            placeholder="email@example.com"
            className="bg-zinc-900 border-zinc-800 text-white"
          />
        );

      case 'url':
        return (
          <Input
            type="url"
            value={localValue}
            onChange={(e) => onValueChange(setting.key, e.target.value)}
            placeholder="https://"
            className="bg-zinc-900 border-zinc-800 text-white"
          />
        );

      default: // 'string'
        return (
          <Input
            type="text"
            value={localValue}
            onChange={(e) => onValueChange(setting.key, e.target.value)}
            className="bg-zinc-900 border-zinc-800 text-white"
          />
        );
    }
  };

  return (
    <motion.div
      custom={index}
      variants={fadeUp}
      initial="hidden"
      animate="show"
      className={`
        rounded-2xl border bg-[#0a0a0c] p-5 transition-colors
        ${isModified ? 'border-rose-500/30 bg-rose-500/[0.02]' : 'border-white/5'}
      `}
    >
      <div
        className={`
          flex flex-col gap-3
          ${setting.data_type === 'boolean' ? 'sm:flex-row sm:items-center sm:justify-between' : ''}
        `}
      >
        {/* Label & description */}
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2">
            <label className="text-white font-medium text-sm">
              {setting.label}
            </label>
            {isModified && (
              <span className="inline-flex h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
            )}
          </div>
          <p className="text-sm text-zinc-500 leading-relaxed">
            {setting.description}
          </p>
        </div>

        {/* Input */}
        <div className={setting.data_type === 'boolean' ? 'shrink-0' : 'mt-1'}>
          {renderInput()}
        </div>
      </div>
    </motion.div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   Category Tab Content
   ═══════════════════════════════════════════════════════════════════════ */

const CategoryContent = ({
  category,
  modifiedSettings,
  onValueChange,
}: {
  category: string;
  modifiedSettings: Map<string, string>;
  onValueChange: (key: string, value: string) => void;
}) => {
  const { data: settings, isLoading, error, refetch } = useSystemSettings(category);

  if (isLoading) return <SettingsSkeleton />;
  if (error) return <ErrorState message="Failed to load settings." onRetry={refetch} />;
  if (!settings || settings.length === 0) {
    const meta = categories.find((c) => c.key === category);
    return <EmptyState category={meta?.label ?? category} />;
  }

  return (
    <motion.div
      key={category}
      variants={tabContent}
      initial="hidden"
      animate="show"
      exit="exit"
      className="space-y-3"
    >
      {settings.map((setting, i) => {
        const localValue = modifiedSettings.has(setting.key)
          ? modifiedSettings.get(setting.key)!
          : setting.value;
        const isModified = modifiedSettings.has(setting.key);

        return (
          <SettingCard
            key={setting.key}
            setting={setting}
            localValue={localValue}
            isModified={isModified}
            onValueChange={onValueChange}
            index={i}
          />
        );
      })}
    </motion.div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   Main Page Component
   ═══════════════════════════════════════════════════════════════════════ */

const SystemSettings = () => {
  const [activeCategory, setActiveCategory] = useState('platform');
  const [modifiedSettings, setModifiedSettings] = useState<Map<string, string>>(
    () => new Map()
  );

  const updateMutation = useUpdateSystemSettings();
  const changeCount = modifiedSettings.size;
  const hasChanges = changeCount > 0;

  // Warn on page leave with unsaved changes
  useEffect(() => {
    if (!hasChanges) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [hasChanges]);

  const handleValueChange = useCallback((key: string, value: string) => {
    setModifiedSettings((prev) => {
      const next = new Map(prev);
      next.set(key, value);
      return next;
    });
  }, []);

  const handleSave = useCallback(() => {
    if (!hasChanges) return;

    const payload = Array.from(modifiedSettings.entries()).map(([key, value]) => ({
      key,
      value,
    }));

    updateMutation.mutate(payload, {
      onSuccess: () => {
        setModifiedSettings(new Map());
      },
    });
  }, [hasChanges, modifiedSettings, updateMutation]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10">
            <Settings className="h-5 w-5 text-rose-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white font-[Poppins]">
              System Settings
            </h1>
            <p className="text-sm text-zinc-500">
              Configure platform-wide settings and preferences
            </p>
          </div>
        </div>

        <Button
          onClick={handleSave}
          disabled={!hasChanges || updateMutation.isPending}
          className="
            relative bg-gradient-to-r from-rose-500 to-rose-600
            hover:from-rose-400 hover:to-rose-500
            text-white font-semibold shadow-lg shadow-rose-500/20
            disabled:opacity-40 disabled:shadow-none
            min-w-[140px]
          "
        >
          {updateMutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          {updateMutation.isPending
            ? 'Saving…'
            : hasChanges
              ? `Save ${changeCount} change${changeCount > 1 ? 's' : ''}`
              : 'No changes'}

          {/* Unsaved indicator dot */}
          {hasChanges && !updateMutation.isPending && (
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-rose-500" />
            </span>
          )}
        </Button>
      </motion.div>

      {/* ── Category Tabs ──────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="flex flex-wrap gap-2"
        role="tablist"
        aria-label="Settings categories"
      >
        {categories.map((cat) => {
          const Icon = cat.icon;
          const isActive = activeCategory === cat.key;

          return (
            <button
              key={cat.key}
              role="tab"
              aria-selected={isActive}
              aria-controls={`panel-${cat.key}`}
              onClick={() => setActiveCategory(cat.key)}
              className={`
                flex items-center gap-2 rounded-xl border px-4 py-2.5
                text-sm font-medium transition-all duration-200
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/50
                ${
                  isActive
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 shadow-sm shadow-rose-500/5'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-300 hover:border-zinc-700 hover:bg-zinc-800/50'
                }
              `}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{cat.label}</span>
            </button>
          );
        })}
      </motion.div>

      {/* ── Category Description Bar ───────────────────────────────── */}
      <AnimatePresence mode="wait">
        {categories
          .filter((c) => c.key === activeCategory)
          .map((cat) => (
            <motion.div
              key={cat.key}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
              className="rounded-xl border border-white/5 bg-[#0a0a0c] px-5 py-3 flex items-center gap-3"
            >
              <cat.icon className="h-4 w-4 text-zinc-500 shrink-0" />
              <div>
                <span className="text-sm font-medium text-white">{cat.label}</span>
                <span className="mx-2 text-zinc-700">·</span>
                <span className="text-sm text-zinc-500">{cat.description}</span>
              </div>
            </motion.div>
          ))}
      </AnimatePresence>

      {/* ── Settings Panel ─────────────────────────────────────────── */}
      <div
        id={`panel-${activeCategory}`}
        role="tabpanel"
        aria-labelledby={activeCategory}
      >
        <AnimatePresence mode="wait">
          <CategoryContent
            key={activeCategory}
            category={activeCategory}
            modifiedSettings={modifiedSettings}
            onValueChange={handleValueChange}
          />
        </AnimatePresence>
      </div>
    </div>
  );
};

export default SystemSettings;
