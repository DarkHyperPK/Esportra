export const EVENT_RATES = [
  { teams: 64, regular: 20000, price: 12000 },
  { teams: 128, regular: 33000, price: 25000 },
  { teams: 256, regular: 55000, price: 45000 },
  { teams: 512, regular: 90000, price: 80000 },
] as const;

export const MAX_EVENT_TEAMS = 10000;

interface EventPassQuote { kind: 'free' | 'pro' | 'custom'; price: number | null; capacity: number | null; }
interface EventEarningsInput { teams: number; entryFee: number; prizePercent: number; }

export function quoteEventPass(teams: number): EventPassQuote {
  if (!Number.isInteger(teams) || teams < 2 || teams > MAX_EVENT_TEAMS) throw new RangeError('Invalid team count.');
  if (teams <= 32) return { kind: 'free', price: 0, capacity: 32 };
  const rate = EVENT_RATES.find(item => teams <= item.teams);
  return rate ? { kind: 'pro', price: rate.price, capacity: rate.teams } : { kind: 'custom', price: null, capacity: null };
}

export function calculateEventEarnings({ teams, entryFee, prizePercent }: EventEarningsInput) {
  const pass = quoteEventPass(teams);
  if ([entryFee, prizePercent].some(value => !Number.isFinite(value) || value < 0) || prizePercent > 100)
    throw new RangeError('Invalid event earnings inputs.');
  const round = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
  const receipts = round(teams * entryFee);
  const prizes = round(receipts * prizePercent / 100);
  const earnings = pass.price === null ? null : round(receipts - prizes - pass.price);
  return { receipts, prizes, earnings, pass };
}
