export function lfgErrorMessage(cause: unknown, fallback: string) {
  const message = cause instanceof Error ? cause.message : fallback;
  return message.includes('NO_LINKED_RIOT_ACCOUNT')
    ? 'Connect your Riot account in Account Settings before publishing a Valorant listing.'
    : message;
}
