import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { getApiErrorMessage } from "@/lib/apiClient";
import { getWebsiteAssetUrl } from "@/lib/storage";
import { useToolBracket } from "@/hooks/useToolBrackets";
import { BracketRenderer } from "@/components/bracket/BracketRenderer";
import { BracketCanvasSkeleton } from "@/components/bracket/BracketCanvasSkeleton";
import { adaptPublicBracketPayload, formatBracketFormat } from "./publicToolUtils";

const ESPORTRA_LOGO = getWebsiteAssetUrl("eSportra-Logo/eSPORTRA-white-transparent.png");

const Message = ({ text }: { text: string }) => (
  <main className="flex h-dvh items-center justify-center bg-background px-4 text-center text-sm text-zinc-400">{text}</main>
);

/** A shared bracket inside someone else's page or stream: a title strip and the tree. */
const PublicBracketEmbed = () => {
  const { token } = useParams();
  const [hoveredTeamId, setHoveredTeamId] = useState<string | null>(null);
  const { data, isLoading, error } = useToolBracket("share", token);
  const matches = useMemo(() => (data ? adaptPublicBracketPayload(data.payload) : []), [data]);

  if (isLoading) return <main className="h-dvh overflow-hidden bg-background"><BracketCanvasSkeleton /></main>;
  if (error || !data) return <Message text={getApiErrorMessage(error, "This bracket isn't available. The owner may have stopped sharing it.")} />;
  if (matches.length === 0) return <Message text="This bracket has no matches yet." />;

  return (
    <main className="flex h-dvh w-full flex-col bg-background text-white">
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-white/[0.07] px-4 py-2.5">
        <div className="min-w-0">
          <p className="truncate font-heading text-[15px] font-bold leading-tight">{data.title}</p>
          <p className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.2em] text-zinc-500">{formatBracketFormat(data.format)} · BO{data.bestOf}</p>
        </div>
        <a href="/" target="_blank" rel="noreferrer" className="flex shrink-0 items-center gap-2 font-mono text-[9px] uppercase tracking-[0.2em] text-zinc-500 hover:text-white">
          Powered by <img src={ESPORTRA_LOGO} alt="Esportra" className="h-4 w-auto" />
        </a>
      </header>
      <div className="bracket-canvas min-h-0 flex-1 overflow-auto">
        <BracketRenderer matches={matches} activeFilter={{ type: "all" }} disableAnimations hoveredTeamId={hoveredTeamId} onTeamHover={setHoveredTeamId} />
      </div>
    </main>
  );
};

export default PublicBracketEmbed;
