import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ShowPreparation } from "../ShowPreparation";
import { apiClient } from "@/lib/apiClient";
import type { BroadcastShowDetail } from "@/types/broadcast";

vi.mock("@/lib/apiClient", () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  getApiErrorMessage: (_error: unknown, fallback: string) => fallback,
}));
vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => ({ limit: async () => ({ data: [], error: null }) }),
        }),
      }),
    }),
  },
}));
const id = "5e182c34-49f8-40d3-bf6c-88b576c20c45",
  matchId = "cf507ae4-9468-4f40-96aa-5a5ff01459c5";
const show: BroadcastShowDetail = {
  id,
  orgId: id,
  title: "Final Show",
  status: "draft",
  tournamentId: id,
  tournamentName: "Invitational",
  scheduledAt: null,
  startedAt: null,
  endedAt: null,
  createdAt: "2026-10-13T10:00:00Z",
  nodeCount: 1,
  matchSlotCount: 0,
  matchSlotsWithCode: 0,
  talentCount: 0,
  sponsorCount: 0,
  crewCount: 0,
  matchSlots: [],
  lastSyncedAt: null,
};
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(apiClient.get).mockImplementation(
    async <T,>(path: string): Promise<T> => {
      if (path.endsWith("/available-matches"))
        return [{ id: matchId, teamA: "A", teamB: "B" }] as T;
      if (path.endsWith("/configuration")) return { showId: id, title: show.title, matches: [], rundown: [] } as T;
      if (path.includes("/nodes?"))
        return [
          { id, name: "Desk", lastSeenAt: new Date().toISOString() },
        ] as T;
      if (path.endsWith("/crew")) return { crew: [], pendingInvites: [] } as T;
      if (path.endsWith("/talent") || path.endsWith("/sponsors"))
        return [] as T;
      return show as T;
    },
  );
  vi.mocked(apiClient.post).mockResolvedValue({ success: true });
});
function mount(step = 0) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter
        initialEntries={[`/broadcast/get-started?showId=${id}&step=${step}`]}
      >
        <ShowPreparation showId={id} orgId={id} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
describe("real preparation controls", () => {
  it("shows all nine steps and treats crew as optional", async () => {
    mount(4);
    await screen.findByRole("heading", { name: "Crew" });
    expect(
      screen
        .getByRole("navigation", { name: "Setup steps" })
        .querySelectorAll("button"),
    ).toHaveLength(9);
    expect(
      screen.getByRole("button", { name: "Skip this step" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/solo producer can skip/)).toBeInTheDocument();
  });
  it("adds a real bracket match with its selected code", async () => {
    mount(2);
    await screen.findByRole("option", { name: "A vs B" });
    fireEvent.change(screen.getByLabelText("Bracket match"), {
      target: { value: matchId },
    });
    fireEvent.change(screen.getByLabelText("Match code"), {
      target: { value: "gf1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add match" }));
    await waitFor(() =>
      expect(apiClient.post).toHaveBeenCalledWith(
        `/api/broadcast/shows/${id}/matches`,
        { matchId, matchCode: "GF1", displayOrder: 0 },
      ),
    );
  });
  it("submits on-air talent instead of leaving the add button inert", async () => {
    mount(5);
    await screen.findByRole("heading", { name: "On-air talent" });
    fireEvent.change(screen.getByLabelText("Display name"), {
      target: { value: "Caster One" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add talent" }));
    await waitFor(() =>
      expect(apiClient.post).toHaveBeenCalledWith(
        `/api/broadcast/shows/${id}/talent`,
        { name: "Caster One", role: "caster" },
      ),
    );
  });
  it("sends the configuration and distinguishes delivery from local readiness", async () => {
    mount(8);
    await screen.findByRole("button", { name: "Send configuration" });
    fireEvent.click(screen.getByRole("button", { name: "Send configuration" }));
    await screen.findByText(
      "Configuration sent. Verify receipt and readiness in the desktop app.",
    );
    expect(apiClient.post).toHaveBeenCalledWith(
      `/api/broadcast/shows/${id}/push-config`,
    );
  });
});
