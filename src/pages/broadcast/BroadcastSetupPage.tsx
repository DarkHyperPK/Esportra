import { useParams } from "react-router-dom";
import {
  CommandShell,
  CommandPageGrid,
} from "@/components/management/CommandSurface";
import { BroadcastNavigation } from "@/components/broadcast/BroadcastNavigation";
import { ShowPreparation } from "@/components/broadcast/ShowPreparation";

export default function BroadcastSetupPage() {
  const { showId = "" } = useParams<{ showId: string }>();
  return (
    <CommandShell>
      <CommandPageGrid>
        <BroadcastNavigation />
        <ShowPreparation showId={showId} />
      </CommandPageGrid>
    </CommandShell>
  );
}
