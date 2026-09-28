export function isPowerOf2(n: number): boolean {
  return n > 1 && (n & (n - 1)) === 0;
}

export function nextPowerOf2(n: number): number {
  if (n <= 1) return 2;
  return Math.pow(2, Math.ceil(Math.log2(n)));
}
