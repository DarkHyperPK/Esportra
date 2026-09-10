import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, AlertTriangle, Check, ChevronDown, Loader2, Lock, Settings2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CtaButton } from '@/components/ui/app-buttons';
import { useVetoSettings } from '@/hooks/useVetoSettings';
import { VetoStepRow } from './VetoStepRow';
import { getVetoActionClasses, getVetoActionNoun } from './vetoActionPresentation';

interface VetoSettingsPanelProps {
  matchId: string;
  vetoStatus: string;
  team1Name: string;
  team2Name: string;
  compact?: boolean;
}

export const VetoSettingsPanel: React.FC<VetoSettingsPanelProps> = ({
  matchId,
  vetoStatus,
  team1Name,
  team2Name,
  compact: _compact,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const {
    settings,
    isLoading,
    fetchError,
    localMode,
    localSteps,
    isDirty,
    externalUpdatePending,
    setLocalMode,
    updateStep,
    save,
    saveStatus,
    saveErrorMessage,
    dismissExternalUpdateWarning,
  } = useVetoSettings({ matchId, vetoStatus, enabled: true });

  const lastPickSideIdx = localSteps.reduce<number>(
    (acc, s, i) => (s.action === 'pick_side' ? i : acc),
    -1,
  );

  return (
    <div className="rounded-xl border border-white/10 bg-black/30 overflow-hidden">
      <button
        type="button"
        onClick={() => setIsExpanded((e) => !e)}
        className="flex w-full items-center justify-between px-3 py-2.5 cursor-pointer select-none"
      >
        <div className="flex items-center gap-1.5">
          <Settings2 className="h-3.5 w-3.5 text-white/50" />
          <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">
            VETO SETTINGS
          </span>
        </div>
        <ChevronDown
          className={cn(
            'h-3.5 w-3.5 text-white/40 transition-transform duration-200',
            isExpanded && 'rotate-180',
          )}
        />
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div className="px-3 pb-3 pt-1">
              {isLoading && (
                <div className="space-y-2 py-2">
                  <div className="h-5 w-full rounded bg-white/10" />
                  <div className="h-8 w-full rounded bg-white/10" />
                  <div className="h-8 w-full rounded bg-white/10" />
                </div>
              )}

              {fetchError && !isLoading && (
                <p className="py-2 text-xs text-rose-400">Failed to load settings.</p>
              )}

              {!isLoading && !fetchError && (
                <Tabs
                  value={localMode}
                  onValueChange={(v) => setLocalMode(v as 'default' | 'custom')}
                >
                  <TabsList className="w-full grid grid-cols-2 mb-3">
                    <TabsTrigger
                      value="default"
                      disabled={vetoStatus === 'in_progress' || saveStatus === 'saving'}
                    >
                      Default
                    </TabsTrigger>
                    <TabsTrigger
                      value="custom"
                      disabled={vetoStatus === 'in_progress' || saveStatus === 'saving'}
                    >
                      Custom
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="default">
                    <div className="text-[10px] font-black text-white/50 uppercase tracking-widest mb-2">
                      Default Sequence
                    </div>
                    <div
                      className="max-h-[180px] overflow-y-auto overscroll-contain pr-0.5"
                      data-lenis-prevent
                    >
                      {(settings?.defaultSequence ?? []).map((step) => (
                        <div
                          key={step.actionNumber}
                          className="flex items-center gap-2 py-1.5 border-b border-white/5 last:border-0"
                        >
                          <div
                            className={cn(
                              'h-7 w-7 shrink-0 flex items-center justify-center rounded-lg font-black text-xs',
                              getVetoActionClasses(step.action),
                            )}
                          >
                            {step.actionNumber}.
                          </div>
                          <span
                            className={cn(
                              'rounded-full px-1.5 py-0.5 text-[10px] font-black uppercase tracking-widest',
                              getVetoActionClasses(step.action),
                            )}
                          >
                            {getVetoActionNoun(step.action)}
                          </span>
                          {step.action !== 'ignore' && (
                            <span className="text-[11px] text-white/60 ml-auto">
                              {step.team === 'T1' ? team1Name : team2Name}
                            </span>
                          )}
                          {step.isDecider && (
                            <span className="rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[9px] font-black px-1.5 py-0.5 uppercase tracking-widest">
                              Decider
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="custom">
                    <div
                      className="max-h-[260px] overflow-y-auto overscroll-contain pr-0.5"
                      data-lenis-prevent
                    >
                      {localSteps.map((step, index) => (
                        <VetoStepRow
                          key={step.actionNumber}
                          index={index}
                          step={step}
                          isDecider={step.action === 'pick_side' && index === lastPickSideIdx}
                          team1Name={team1Name}
                          team2Name={team2Name}
                          onChange={(patch) => updateStep(index, patch)}
                          disabled={vetoStatus === 'in_progress' || saveStatus === 'saving'}
                        />
                      ))}
                    </div>

                    {vetoStatus === 'in_progress' && (
                      <div className="mt-2 flex items-center gap-1.5 pt-2 border-t border-white/5">
                        <Lock className="h-3 w-3 text-white/40 shrink-0" />
                        <span className="text-[11px] text-white/40">
                          Veto is live. Settings locked.
                        </span>
                      </div>
                    )}

                    {externalUpdatePending && (
                      <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5">
                        <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-amber-400" />
                        <p className="text-[11px] text-amber-300 leading-relaxed">
                          Settings updated externally.{' '}
                          <button
                            type="button"
                            onClick={dismissExternalUpdateWarning}
                            className="underline text-amber-200 hover:text-amber-100"
                          >
                            Keep my changes
                          </button>
                          {' '}— saving will overwrite the external changes.
                        </p>
                      </div>
                    )}

                    <div className="mt-3">
                      <CtaButton
                        size="sm"
                        className="w-full"
                        disabled={
                          !isDirty ||
                          saveStatus === 'saving' ||
                          saveStatus === 'success' ||
                          vetoStatus === 'in_progress'
                        }
                        onClick={save}
                      >
                        {saveStatus === 'saving' && (
                          <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                        )}
                        {saveStatus === 'success' && (
                          <Check className="h-3.5 w-3.5 mr-1.5" />
                        )}
                        {saveStatus === 'saving'
                          ? 'Saving...'
                          : saveStatus === 'success'
                            ? 'Saved!'
                            : 'Save Settings'}
                      </CtaButton>
                      {saveStatus === 'error' && saveErrorMessage && (
                        <div className="mt-1.5 flex items-center gap-1.5">
                          <AlertCircle className="h-3 w-3 text-rose-400 shrink-0" />
                          <p className="text-[11px] text-rose-400">{saveErrorMessage}</p>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
