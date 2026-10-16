import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ShowPreparation } from "../ShowPreparation";
import { apiClient } from "@/lib/apiClient";
import { DEFAULT_APPEARANCE } from '@/schemas/broadcastAppearanceSchema';
import type { BroadcastShowDetail } from "@/types/broadcast";

vi.mock("@/lib/apiClient", () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() },
  getApiErrorMessage: (_error: unknown, fallback: string) => fallback,
}));
vi.mock("@/hooks/useHudPreviewFonts", () => ({
  useHudPreviewFonts: () => ({ data: undefined, isError: false }),
}));
const fixtures = vi.hoisted(() => ({
  rows: [] as Record<string, unknown>[],
  update: vi.fn(),
}));
vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: () => {
      const query = {
        select: () => query,
        eq: () => query,
        order: () => query,
        limit: async () => ({ data: fixtures.rows, error: null }),
        update: (patch: unknown) => {
          fixtures.update(patch);
          return { eq: () => ({ eq: async () => ({ error: null }) }) };
        },
      };
      return query;
    },
  },
}));
const id = "5e182c34-49f8-40d3-bf6c-88b576c20c45";
const matchId = "cf507ae4-9468-4f40-96aa-5a5ff01459c5";
const nextMatch = "7197a7d3-90fc-41af-859f-45a7c00173c0";
let current: BroadcastShowDetail;
let online: boolean;
beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  online = true;
  current = {
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
    matchSlotCount: 1,
    matchSlotsWithCode: 1,
    talentCount: 0,
    sponsorCount: 0,
    crewCount: 0,
    lastSyncedAt: null,
    matchSlots: [
      {
        id,
        showId: id,
        matchId,
        matchCode: "FINAL",
        displayOrder: 0,
        matchTitle: "North vs South",
        teamA: "North",
        teamB: "South",
        bestOf: 3,
        matchStatus: "pending",
      },
    ],
  };
  fixtures.rows = [
    {
      id,
      show_id: id,
      type: "pre_show",
      title: "Opening",
      duration_seconds: 60,
      status: "pending",
      display_order: 0,
      config: { overlay: "starting-soon", matchId },
    },
  ];
  vi.mocked(apiClient.get).mockImplementation(
    async <T,>(path: string): Promise<T> => {
      if (path.endsWith('/appearance')) return {} as T;
      if (path.endsWith('/enrollment')) return { enabled: false, stageIds: [], revision: 0, checkedAt: null, atCapacity: false, stages: [{ id, name: 'Finals' }] } as T;
      if (path.endsWith("/available-matches"))
        return [
          {
            id: nextMatch,
            teamA: "Aurora",
            teamB: "Falcons",
            status: "scheduled",
            scheduledAt: "2026-11-20T12:00:00Z",
            tournamentName: "Invitational",
          },
          {
            id,
            teamA: "Played team",
            teamB: "Finished opponent",
            status: "completed",
          },
        ] as T;
      if (path.includes("/nodes?"))
        return (
          online
            ? [
                {
                  id,
                  name: "Desk",
                  isActive: true,
                  lastSeenAt: new Date().toISOString(),
                },
              ]
            : []
        ) as T;
      if (path.endsWith("/crew")) return { crew: [], pendingInvites: [] } as T;
      if (
        path.endsWith("/talent") ||
        path.endsWith("/sponsors") ||
        path === "/api/sponsors/active"
      )
        return [] as T;
      return current as T;
    },
  );
  vi.mocked(apiClient.post).mockResolvedValue({ success: true });
});
function mount(step = 0, selected = true) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter
        initialEntries={[
          "/broadcast/get-started?showId=" + id + "&step=" + step + (selected ? "&match=" + matchId : ""),
        ]}
      >
        <ShowPreparation showId={id} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
describe("focused eight-step setup", () => {
  it("requires an explicit match choice and explains a blocked next action", async () => {
    mount(1, false);
    await screen.findByRole("button", { name: /Aurora vs Falcons/ });
    expect(screen.getByLabelText("Selected broadcast match")).toHaveTextContent("No match selected.");
    expect(screen.getByRole("button", { name: "Preview the HUD" })).toBeDisabled();
    expect(screen.getByText("Choose an eligible match before continuing.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /North vs South/ }));
    expect(screen.getByRole("button", { name: "Preview the HUD" })).not.toBeDisabled();
    expect(sessionStorage.getItem("air-web-setup:" + id + ":match")).toBe(matchId);
  });
  it("offers pairing as the primary recovery instead of a disabled Continue", async () => {
    online = false;
    mount(0, false);
    await screen.findByRole("heading", { name: "Connect your production desk." });
    expect(screen.getByRole("button", { name: "Generate pairing code" })).not.toBeDisabled();
  });

  it("restores an explicit match selection when returning to the preview", async () => {
    const view = mount(1, false);
    fireEvent.click(await screen.findByRole("button", { name: /North vs South/ }));
    view.unmount();
    mount(2, false);
    expect(await screen.findByTitle("HUD preview · ingame")).toBeInTheDocument();
    expect(screen.getByLabelText("Selected broadcast match")).toHaveTextContent("North vs South");
  });
  it("does not resume a played match and offers another selection", async () => {
    current.matchSlots[0] = { ...current.matchSlots[0], matchStatus: "completed" };
    mount(1);
    await screen.findByText(/The previous match is no longer available/);
    expect(screen.getByRole("button", { name: "Choose another match" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Preview the HUD" })).toBeDisabled();
  });
  it("keeps unsaved HUD changes in the current step and saves from the next-action footer", async () => {
    vi.mocked(apiClient.put).mockResolvedValue({ ...DEFAULT_APPEARANCE, bannerTheme: "compact" });
    mount(2);
    const theme = await screen.findByLabelText("Banner theme");
    await waitFor(() => expect(theme).not.toBeDisabled());
    fireEvent.change(theme, { target: { value: "compact" } });
    await screen.findByRole("button", { name: "Save HUD changes" });
    fireEvent.click(screen.getByRole("button", { name: /4\. Choose broadcast screens/ }));
    expect(await screen.findByRole("alertdialog")).toHaveTextContent("Keep your HUD changes?");
    fireEvent.click(screen.getByRole("button", { name: "Keep editing" }));
    expect(screen.getByLabelText("Banner theme")).toHaveValue("compact");
    fireEvent.click(screen.getByRole("button", { name: "Save HUD changes" }));
    await waitFor(() => expect(apiClient.put).toHaveBeenCalledWith(`/api/broadcast/shows/${id}/appearance`, expect.objectContaining({ bannerTheme: "compact" })));
    await screen.findByRole("button", { name: "Choose broadcast screens" });
  });
  it("shows eight steps, clear pairing state and persistent selected match", async () => {
    mount();
    await screen.findByText("Air is connected.");
    expect(
      within(
        screen.getByRole("navigation", { name: "Setup steps" }),
      ).getAllByRole("button"),
    ).toHaveLength(8);
    expect(
      screen.getByRole("region", { name: "Desktop connection" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Selected broadcast match")).toHaveTextContent(
      "North vs South",
    );
  });
  it("selects an eligible system match without asking for tournament details or codes", async () => {
    mount(1);
    await screen.findByRole("button", { name: /Aurora vs Falcons/ });
    expect(
      screen.queryByText("Played team vs Finished opponent"),
    ).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Match code")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Aurora vs Falcons/ }));
    await waitFor(() =>
      expect(apiClient.post).toHaveBeenCalledWith(
        "/api/broadcast/shows/" + id + "/matches",
        {
          matchId: nextMatch,
          matchCode: "M_7197A7D390FC41AF",
          displayOrder: 1,
        },
      ),
    );
  });
  it("changes demo preview locally, without publishing match data", async () => {
    mount(2);
    const iframe = await screen.findByTitle("HUD preview · ingame");
    const post = vi.spyOn(
      (iframe as HTMLIFrameElement).contentWindow!,
      "postMessage",
    );
    fireEvent.load(iframe);
    fireEvent.click(screen.getByRole("checkbox", { name: "Demo preview" }));
    expect(
      screen.getByText("Layout preview · No sample match data"),
    ).toBeInTheDocument();
    expect(post).toHaveBeenLastCalledWith(
      expect.objectContaining({
        type: "esportra-preview",
        demo: false,
        teams: ["North", "South"],
      }),
      "*",
    );
    expect(apiClient.post).not.toHaveBeenCalled();
    expect(iframe).toHaveAttribute("sandbox", "allow-scripts");
  });
  it("separates templates and screens, and imports an ordered set", async () => {
    mount(3);
    await screen.findByRole("heading", { name: "Templates" });
    expect(
      screen.getByRole("heading", { name: "Individual screens" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button", { name: "Import set" })[0]);
    await waitFor(() =>
      expect(apiClient.post).toHaveBeenCalledWith(
        "/api/broadcast/shows/" + id + "/screens/import",
        {
          matchId,
          screens: [
            { overlay: "starting-soon", title: "Opening" },
            { overlay: "match-intro", title: "Match Introduction" },
            { overlay: "ingame", title: "Map" },
            { overlay: "brb", title: "Break" },
            { overlay: "map-result", title: "Results" },
          ],
        },
      ),
    );
  });
  it("shows sponsor step as optional and offers saved or uploaded assets", async () => {
    mount(4);
    await screen.findByRole("heading", { name: "Add sponsors" });
    expect(
      screen.getByRole("button", { name: "Skip for now" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Esportra sponsor list" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Add a new sponsor" }));
    expect(screen.getByLabelText("Sponsor name")).toBeInTheDocument();
    expect(screen.getByLabelText(/Sponsor logo/)).toHaveAttribute(
      "accept",
      "image/png,image/jpeg,image/webp",
    );
  });
  it("saves on-air talent through the existing roster API", async () => {
    mount(5);
    await screen.findByLabelText("Display name");
    fireEvent.change(screen.getByLabelText("Display name"), {
      target: { value: "Commentator One" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add talent" }));
    await waitFor(() =>
      expect(apiClient.post).toHaveBeenCalledWith(
        "/api/broadcast/shows/" + id + "/talent",
        { name: "Commentator One", role: "caster" },
      ),
    );
  });
  it("blocks incomplete review and distinguishes delivery from local readiness", async () => {
    online = false;
    mount(7);
    const button = await screen.findByRole("button", {
      name: "Send match to Air",
    });
    await screen.findByText("Connect a desktop to receive the setup.");
    expect(button).toBeDisabled();
    expect(apiClient.post).not.toHaveBeenCalled();
  });
  it("sends complete setup and gives the next desktop action", async () => {
    mount(7);
    const button = await screen.findByRole("button", {
      name: "Send match to Air",
    });
    await waitFor(() => expect(button).not.toBeDisabled());
    fireEvent.click(button);
    await screen.findByText(
      /Setup published for Air/,
    );
    expect(screen.getByRole("heading", { name: "Continue in Esportra Air" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Send match to Air" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send setup again" })).toBeInTheDocument();
    expect(apiClient.post).toHaveBeenCalledWith(
      "/api/broadcast/shows/" + id + "/push-config",
      { matchId },
    );
  });
});
