/** Narrow `unknown` to an Error instance. */
export function toError(err: unknown): Error {
  if (err instanceof Error) return err;
  return new Error(typeof err === 'string' ? err : JSON.stringify(err));
}

/** Extract a human-readable message from any caught value. */
export function getErrorMessage(err: unknown): string {
  return toError(err).message;
}
