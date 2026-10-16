import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BroadcastPanel } from "@/components/organizer/tournament-manage/panels/BroadcastPanel";
import { apiClient } from "@/lib/apiClient";
import type { TournamentBroadcastWorkspace } from "@/hooks/useTournamentBroadcast";

vi.mock("@/lib/apiClient", () => ({
  apiClient: { get: vi.fn(), post: vi.fn() },
  getApiErrorMessage: (_error: unknown, fallback: string) => fallback,
}));
const tournamentId = "5e182c34-49f8-40d3-bf6c-88b576c20c45",
  orgId = "7197a7d3-90fc-41af-859f-45a7c00173c0";
const workspace: TournamentBroadcastWorkspace = {
  tournament: {
    id: tournamentId,
    name: "Invitational",
    slug: "invitational",
    game: "valorant",
    organizationId: orgId,
  },
  access: "ready",
  canManage: true,
  organizations: [],
  shows: [],
};
function Location() {
  const location = useLocation();
  return (
    <output aria-label="Route">
      {location.pathname}
      {location.search}
    </output>
  );
}
function mount(data = workspace) {
  vi.mocked(apiClient.get).mockResolvedValue(data);
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <BroadcastPanel
          tournamentId={tournamentId}
          tournamentName="Invitational"
        />
        <Location />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(apiClient.post).mockResolvedValue({
    showId: tournamentId,
    orgId,
    tournamentId,
  });
});

describe("tournament dashboard broadcast integration", () => {
  it("creates through the tournament-bound endpoint and opens guided setup", async () => {
    mount();
    fireEvent.click(
      await screen.findByRole("button", { name: "Prepare broadcast" }),
    );
    await waitFor(() =>
      expect(apiClient.post).toHaveBeenCalledWith(
        `/api/tournaments/${tournamentId}/broadcast/shows`,
        { title: "Invitational · Broadcast" },
      ),
    );
    await waitFor(() =>
      expect(screen.getByLabelText("Route")).toHaveTextContent(
        `/broadcast/shows/${tournamentId}/setup`,
      ),
    );
  });
  it("pairing uses the tournament organization rather than a default profile organization", async () => {
    mount();
    fireEvent.click(
      await screen.findByRole("button", { name: "Pair production desk" }),
    );
    vi.mocked(apiClient.post).mockResolvedValue({
      code: "TEST061A",
      expiresAt: new Date(Date.now() + 60000).toISOString(),
    });
    fireEvent.click(screen.getByRole("button", { name: "Generate code" }));
    await waitFor(() =>
      expect(apiClient.post).toHaveBeenCalledWith(
        "/api/broadcast/nodes/codes",
        { orgId },
      ),
    );
  });
  it("requires choosing an owned organization before linking an unassigned tournament", async () => {
    mount({
      ...workspace,
      tournament: { ...workspace.tournament, organizationId: null },
      access: "organization_required",
      canManage: false,
      organizations: [{ id: orgId, name: "Owned club" }],
    });
    const create = await screen.findByRole("button", {
      name: "Link organization & prepare",
    });
    expect(create).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Organization you own"), {
      target: { value: orgId },
    });
    fireEvent.click(create);
    await waitFor(() =>
      expect(apiClient.post).toHaveBeenCalledWith(
        `/api/tournaments/${tournamentId}/broadcast/shows`,
        { title: "Invitational · Broadcast", orgId },
      ),
    );
  });
  it("does not offer organization controls to a non-owner tournament organizer", async () => {
    mount({
      ...workspace,
      access: "organization_owner_required",
      canManage: false,
    });
    await screen.findByText(
      /Broadcast administration belongs to the organization owner/,
    );
    expect(
      screen.queryByRole("button", { name: "Prepare broadcast" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Pair production desk" }),
    ).not.toBeInTheDocument();
  });
});
