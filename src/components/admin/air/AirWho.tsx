export function AirWho({ email, name, fallback }: { email: string | null; name: string | null; fallback: string }) {
  return (
    <div className="min-w-0">
      <div className="truncate font-medium text-white">{email ?? fallback}</div>
      {name ? <div className="truncate text-xs text-zinc-500">{name}</div> : null}
    </div>
  );
}
