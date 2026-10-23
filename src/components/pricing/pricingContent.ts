export const EVENT_RATES = [
  { teams: 64, regular: 20000, price: 12000 },
  { teams: 128, regular: 33000, price: 25000 },
  { teams: 256, regular: 55000, price: 45000 },
  { teams: 512, regular: 90000, price: 80000 },
] as const;

export interface PricingSelection { teams: string; viaPointer: boolean; }
export type SelectPricingTeams = (teams: string, viaPointer: boolean) => void;

export function formatPkr(value: number) {
  return new Intl.NumberFormat('en-PK').format(value);
}

export const FEATURE_GROUPS = [
  { heading: 'Formats & brackets', rows: [
    { label: 'Single & double elimination', free: true, pro: true },
    { label: 'Swiss & battle royale', free: true, pro: true },
    { label: 'Multi-stage tournaments', free: true, pro: true },
    { label: 'Teams per event', free: 'Up to 32', pro: 'Up to 512 · custom beyond' },
    { label: 'Published events per month', free: '2 events', pro: 'By arrangement' },
  ] },
  { heading: 'Tournament operations', rows: [
    { label: 'Team & player registration', free: true, pro: true },
    { label: 'Match scheduling & time slots', free: true, pro: true },
    { label: 'Match rooms & check-in', free: true, pro: true },
    { label: 'Score reporting & results', free: true, pro: true },
    { label: 'Live standings & leaderboards', free: true, pro: true },
    { label: 'Custom prize distribution', free: true, pro: true },
    { label: 'Dispute centre', free: true, pro: true },
    { label: 'Unlimited drafts', free: true, pro: true },
  ] },
  { heading: 'Veto, streaming & communications', rows: [
    { label: 'Standard map veto', free: true, pro: true },
    { label: 'Custom veto sequences', free: false, pro: true },
    { label: 'Match room veto overlay', free: false, pro: true },
    { label: 'OBS stream overlay', free: false, pro: true },
    { label: 'Discord DMs to teams', free: false, pro: true },
  ] },
];

export const FAQ_ITEMS = [
  { q: 'Is Free a trial in disguise?', a: 'No card, no trial countdown. Free includes two published events per calendar month, with up to 32 teams each. Registration, scheduling, brackets, match rooms, results and standard map veto are included. You can finish your cup on Free.' },
  { q: 'So what am I paying for with Pro?', a: 'A larger bracket, custom pick-and-ban sequences, veto overlays and Discord DMs to teams. Your rate is based on bracket size, and every paid size includes all Pro features. There is no separate Pro fee on top.' },
  { q: 'What happens in months when I don’t host?', a: 'There is no recurring Pro charge to keep paying, and no subscription to cancel. Pro is paid per event. Your two-event Free allowance resets each calendar month.' },
  { q: 'What counts toward my two free events?', a: 'Published events count when registration is open or the event is live. Draft as many events as you like: drafts are free and do not use your allowance. The quota resets on the first day of each calendar month.' },
  { q: 'What if my event outgrows Free?', a: 'Contact us for a bracket above 32 teams or an additional event after your two free events. Brackets up to 512 teams have the published event rates above; larger brackets get a custom quote. We confirm the price with you before arranging payment.' },
  { q: 'How do I book Pro and pay?', a: 'Send us your event details and team count. We confirm the price, share bank transfer details and activate Pro for that tournament once payment is confirmed. Pro is arranged directly with our team; there is no self-serve checkout yet.' },
];
