export interface VetoStepDto {
  actionNumber: number;
  action: 'ban' | 'pick' | 'pick_side' | 'ignore';
  team: 'T1' | 'T2';
  isDecider: boolean;
}

export interface VetoSettingsDto {
  matchId: string;
  mode: number; // 0 = Default, 1 = Custom — integer from API
  defaultSequence: VetoStepDto[];
  customSequence: VetoStepDto[] | null;
  effectiveSequence: VetoStepDto[];
}

export interface VetoStepDraft {
  actionNumber: number; // 1-based, fixed position
  action: 'ban' | 'pick' | 'pick_side' | 'ignore';
  team: 'T1' | 'T2'; // 'T1' sentinel for ignore steps — not rendered
}
