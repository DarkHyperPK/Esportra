import { useState } from "react";
import { useBroadcastShow, usePushShowConfig } from "./useBroadcastShow";
import { useBroadcastNodes } from "./useBroadcastNodes";
import {
  useBroadcastShowSegments,
  useAddSegment,
} from "./useBroadcastShowSegments";
import { useBroadcastCrew } from "./useBroadcastCrew";
import { useBroadcastSponsors } from "./useBroadcastSponsors";
import { useBroadcastTalent } from "./useBroadcastTalent";
import { useNow } from "./useNow";

export function useShowPreparation(showId: string) {
  const showQuery = useBroadcastShow(showId),
    show = showQuery.data;
  const nodes = useBroadcastNodes(show?.orgId),
    segments = useBroadcastShowSegments(showId),
    crew = useBroadcastCrew(showId),
    sponsors = useBroadcastSponsors(showId),
    talent = useBroadcastTalent(showId);
  const push = usePushShowConfig(showId),
    add = useAddSegment(showId),
    now = useNow(5000);
  const online =
    nodes.data?.filter(
      (node) => node.lastSeenAt && now - Date.parse(node.lastSeenAt) < 30000,
    ).length ?? 0;
  const [segmentTitle, setSegmentTitle] = useState("");
  const checks = [
    !!show?.title,
    !!show?.tournamentId,
    !!show?.matchSlots.length &&
      show.matchSlots.every((slot) => !!slot.matchCode),
    online > 0,
    (crew.data?.crew.length ?? 0) > 0,
    (talent.data?.length ?? 0) > 0,
    (sponsors.data?.length ?? 0) > 0,
    (segments.data?.length ?? 0) > 0,
    !!show?.lastSyncedAt,
  ];
  return {
    showQuery,
    show,
    nodes,
    segments,
    crew,
    sponsors,
    talent,
    push,
    add,
    online,
    checks,
    segmentTitle,
    setSegmentTitle,
  };
}
