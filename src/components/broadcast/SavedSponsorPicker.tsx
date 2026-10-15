import { CommandButton } from "@/components/management/CommandSurface";
import { InlineNotice } from "@/components/ui/kit/InlineNotice";
import type { Sponsor } from "@/hooks/useSponsors";
export function SavedSponsorPicker({
  sponsors,
  loading,
  failed,
  value,
  onChange,
  disabled,
  onRetry,
}: {
  sponsors: Sponsor[];
  loading: boolean;
  failed: boolean;
  value: string;
  onChange: (id: string) => void;
  disabled: boolean;
  onRetry: () => void;
}) {
  const saved = sponsors.find((sponsor) => sponsor.id === value);
  return (
    <>
      <label className="setup-field">
        Saved sponsor
        <select
          value={value}
          disabled={disabled || loading || failed}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="">Choose sponsor</option>
          {sponsors
            .filter((sponsor) => sponsor.is_active)
            .map((sponsor) => (
              <option
                key={sponsor.id}
                value={sponsor.id}
                disabled={!sponsor.logo_url}
              >
                {sponsor.name}
                {!sponsor.logo_url ? " · Logo missing" : ""}
              </option>
            ))}
        </select>
      </label>
      {saved?.logo_url && (
        <img
          className="setup-sponsor-logo"
          src={saved.logo_url}
          alt={`${saved.name} saved logo`}
        />
      )}
      {failed && (
        <InlineNotice tone="critical">
          Could not load the sponsor list.{" "}
          <CommandButton variant="ghost" onClick={onRetry}>
            Retry list
          </CommandButton>
        </InlineNotice>
      )}
      {!loading && !failed && !sponsors.length && (
        <p className="setup-empty">
          No saved sponsors available. Add a sponsor or skip this step.
        </p>
      )}
    </>
  );
}
