export { LOW_CONFIDENCE, draftFromParse, otherSlot, updateDraftPlayer } from './draft';
export { buildOcrSubmission, type OcrReportSubmission, type OcrSubmissionContext } from './submission';
export { toFixtureJson } from './fixture';
export { countRecognisedAgents, describeOcrEngine } from './engineLabel';
export { OCR_VIEW_COLUMNS, hasAcs, pickMvpKey, plusMinus, presentColumns, rankByImpact, type OcrViewColumn } from './scoreboardView';
export {
  RIOT_LABELS,
  VERIFICATION_LABELS,
  badgeFor,
  disputeReasonFor,
  liveStatus,
  nameKey,
  needsReview,
  reviewCheck,
  riotCheckSummary,
  type RowCheck,
  type VerificationLabel,
  type VerificationTone,
} from './verification';
export { describeOnlineOcr, type OcrHealthSummary } from './health';
export { mergeRiotMatch } from './riotMerge';
export { compareWithRiot, type ComparedCell, type ComparedRow, type RiotComparison } from './riotComparison';
