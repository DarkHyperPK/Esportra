import { useState, useCallback, useEffect } from 'react';
import {
  Globe, UserPlus, Trophy, Shield, HardDrive, Bell,
  Save, Eye, EyeOff, AlertCircle, RefreshCw,
  Loader2,
  type LucideIcon,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { AdminPage } from '@/components/admin/AdminPage';
import {
  CommandButton,
  CommandEmptyState,
  CommandTabButton,
} from '@/components/management/CommandSurface';
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
   Skeleton Loader
   ═══════════════════════════════════════════════════════════════════════ */

const SettingsSkeleton = () => (
  <div className="space-y-4">
    {Array.from({ length: 4 }).map((_, i) => (
      <div
        key={i}
        className="space-y-3 border border-white/10 bg-[#0a0a0c]/92 p-5"
      >
        <Skeleton className="h-4 w-40 -none bg-zinc-800" />
        <Skeleton className="h-3 w-64 -none bg-zinc-800/60" />
        <Skeleton className="h-10 w-full -none bg-zinc-800/40" />
      </div>
    ))}
  </div>
);

/* ═══════════════════════════════════════════════════════════════════════════
   Error State
   ═══════════════════════════════════════════════════════════════════════ */

const ErrorState = ({ message, onRetry }: { message: string; onRetry: () => void }) => (
  <div className="flex flex-col items-center gap-4 border border-red-500/20 bg-red-500/[0.04] p-10">
    <AlertCircle className="h-8 w-8 text-red-300" />
    <p className="text-center font-medium text-red-300">{message}</p>
    <CommandButton variant="danger" size="sm" onClick={onRetry}>
      <RefreshCw className="h-4 w-4" />
      Retry
    </CommandButton>
  </div>
);

/* ═══════════════════════════════════════════════════════════════════════════
   Empty State
   ═══════════════════════════════════════════════════════════════════════ */

const EmptyState = ({ category }: { category: string }) => (
  <CommandEmptyState
    title="No settings found"
    description={
      <>No settings found in <span className="font-medium text-zinc-300">{category}</span></>
    }
  />
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
        className="-none border-white/10 bg-black/40 pr-12 font-mono text-sm text-white"
        autoComplete="off"
      />
      <button
        type="button"
        onClick={() => setRevealed((v) => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 transition-colors hover:text-zinc-300"
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
}: {
  setting: SystemSetting;
  localValue: string;
  isModified: boolean;
  onValueChange: (key: string, value: string) => void;
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
            className="max-w-xs -none border-white/10 bg-black/40 text-white tabular-nums"
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
            className="-none border-white/10 bg-black/40 text-white"
          />
        );

      case 'url':
        return (
          <Input
            type="url"
            value={localValue}
            onChange={(e) => onValueChange(setting.key, e.target.value)}
            placeholder="https://"
            className="-none border-white/10 bg-black/40 text-white"
          />
        );

      default: // 'string'
        return (
          <Input
            type="text"
            value={localValue}
            onChange={(e) => onValueChange(setting.key, e.target.value)}
            className="-none border-white/10 bg-black/40 text-white"
          />
        );
    }
  };

  return (
    <div
      className={
        isModified
          ? 'border border-rose-500/30 bg-rose-500/[0.03] p-4'
          : 'border border-white/10 bg-white/[0.025] p-4'
      }
    >
      <div
        className={`
          flex flex-col gap-3
          ${setting.data_type === 'boolean' ? 'sm:flex-row sm:items-center sm:justify-between' : ''}
        `}
      >
        {/* Label & description */}
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-white">
              {setting.label}
            </label>
            {isModified && (
              <span className="inline-flex h-2 w-2 animate-pulse bg-rose-500" />
            )}
          </div>
          <p className="text-sm leading-relaxed text-zinc-500">
            {setting.description}
          </p>
        </div>

        {/* Input */}
        <div className={setting.data_type === 'boolean' ? 'shrink-0' : 'mt-1'}>
          {renderInput()}
        </div>
      </div>
    </div>
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
    <div key={category} className="space-y-3">
      {settings.map((setting) => {
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
          />
        );
      })}
    </div>
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
    <AdminPage
      eyebrow="System"
      title="Settings"
      description="Configure platform-wide settings and preferences"
      actions={
        <CommandButton
          onClick={handleSave}
          disabled={!hasChanges || updateMutation.isPending}
          className="relative min-w-[140px]"
        >
          {updateMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {updateMutation.isPending
            ? 'Saving…'
            : hasChanges
              ? `Save ${changeCount} change${changeCount > 1 ? 's' : ''}`
              : 'No changes'}
        </CommandButton>
      }
    >
      {/* ── Category Tabs ──────────────────────────────────────────── */}
      <div
        className="flex flex-wrap gap-2"
        role="tablist"
        aria-label="Settings categories"
      >
        {categories.map((cat) => {
          const Icon = cat.icon;
          const isActive = activeCategory === cat.key;

          return (
            <CommandTabButton
              key={cat.key}
              role="tab"
              aria-selected={isActive}
              aria-controls={`panel-${cat.key}`}
              active={isActive}
              onClick={() => setActiveCategory(cat.key)}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{cat.label}</span>
            </CommandTabButton>
          );
        })}
      </div>

      {/* ── Category Description Bar ───────────────────────────────── */}
      {categories
        .filter((c) => c.key === activeCategory)
        .map((cat) => (
          <div
            key={cat.key}
            className="flex items-center gap-3 border border-white/10 bg-[#0a0a0c]/92 px-5 py-3"
          >
            <cat.icon className="h-4 w-4 shrink-0 text-zinc-500" />
            <div>
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-white">
                {cat.label}
              </span>
              <span className="mx-2 text-zinc-700">·</span>
              <span className="text-sm text-zinc-500">{cat.description}</span>
            </div>
          </div>
        ))}

      {/* ── Settings Panel ─────────────────────────────────────────── */}
      <div
        id={`panel-${activeCategory}`}
        role="tabpanel"
        aria-labelledby={activeCategory}
      >
        <CategoryContent
          key={activeCategory}
          category={activeCategory}
          modifiedSettings={modifiedSettings}
          onValueChange={handleValueChange}
        />
      </div>
    </AdminPage>
  );
};

export default SystemSettings;
