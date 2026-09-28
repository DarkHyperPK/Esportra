/**
 * QuickCreateFlow
 *
 * State machine for the three Quick Create screens:
 *   entry → game-select → quick-form
 *
 * AnimatePresence wraps each screen so the "game-lock" motion
 * (grid exit + form entrance) plays through framer-motion's exit/enter lifecycle.
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CreateTournamentEntryScreen } from './CreateTournamentEntryScreen';
import { GameTemplateSelectScreen } from './GameTemplateSelectScreen';
import { QuickCreateForm } from './QuickCreateForm';
import type { TournamentTemplateDto } from '@/types/tournamentTemplate';

type Step = 'entry' | 'game-select' | 'quick-form';

export const QuickCreateFlow: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('entry');
  const [selectedTemplate, setSelectedTemplate] = useState<TournamentTemplateDto | null>(null);

  return (
    <AnimatePresence mode="wait">
      {step === 'entry' && (
        <motion.div
          key="entry"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 0.95, y: -8 }}
          transition={{ duration: 0.15, ease: 'easeIn' }}
        >
          <CreateTournamentEntryScreen
            onQuickTemplate={() => setStep('game-select')}
            onAdvanced={() => navigate('/tournaments/create?mode=advanced')}
          />
        </motion.div>
      )}

      {step === 'game-select' && (
        <motion.div
          key="game-select"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.18, ease: [0.4, 0, 1, 1] }}
        >
          <GameTemplateSelectScreen
            onSelect={(template) => {
              setSelectedTemplate(template);
              setStep('quick-form');
            }}
            onBack={() => setStep('entry')}
          />
        </motion.div>
      )}

      {step === 'quick-form' && selectedTemplate && (
        <motion.div
          key="quick-form"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.28, ease: [0, 0, 0.2, 1] }}
        >
          <QuickCreateForm
            template={selectedTemplate}
            onBack={() => setStep('game-select')}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};
