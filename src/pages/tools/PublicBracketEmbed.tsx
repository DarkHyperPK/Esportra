import React, { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiClient, getApiErrorMessage } from "@/lib/apiClient";
import { BracketRenderer } from "@/components/bracket/BracketRenderer";
import { adaptPublicBracketPayload, normalizeToolBracketResponse } from "./publicToolUtils";

const PublicBracketEmbed = () => {
  const { token } = useParams();
  const [hoveredTeamId, setHoveredTeamId] = useState<string | null>(null);
  const { data, isLoading, error } = useQuery({
    queryKey: ["tool-bracket-embed", token],
    queryFn: async () => {
      const raw = await apiClient.get<any>(`/api/tools/brackets/share/${token}`);
      return normalizeToolBracketResponse(raw);
    },
    enabled: Boolean(token),
  });

  const matches = useMemo(() => (data ? adaptPublicBracketPayload(data.payload) : []), [data]);

  if (isLoading) {
    return (
      <main className="flex h-dvh items-center justify-center bg-[#09090b] text-sm text-zinc-500">
        Loading bracket...
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="flex h-dvh items-center justify-center bg-[#09090b] px-4 text-center text-sm text-zinc-400">
        {getApiErrorMessage(error, "This bracket embed is unavailable.")}
      </main>
    );
  }

  return (
    <main className="h-dvh w-full overflow-auto bg-[#09090b] p-2 sm:p-3">
      <div className="mb-2 px-1">
        <p className="truncate text-sm font-semibold text-white">{data.title}</p>
        <p className="text-[11px] uppercase tracking-wider text-zinc-500">Powered by Esportra</p>
      </div>
      <BracketRenderer
        matches={matches}
        activeFilter={{ type: "all" }}
        disableAnimations
        hoveredTeamId={hoveredTeamId}
        onTeamHover={setHoveredTeamId}
        cardWidth={260}
        cardHeight={86}
        roundGap={64}
        matchGap={18}
      />
    </main>
  );
};

export default PublicBracketEmbed;
