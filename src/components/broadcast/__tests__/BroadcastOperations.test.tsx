import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NodeCard } from "../NodeCard";
import { ShowSettingsDialog } from "../ShowSettingsDialog";
import { apiClient } from "@/lib/apiClient";
import type { BroadcastShow } from "@/types/broadcast";

vi.mock("@/lib/apiClient", () => ({
  apiClient: { get: vi.fn(), patch: vi.fn() },
  getApiErrorMessage: (_error: unknown, fallback: string) => fallback,
}));
const id = "5e182c34-49f8-40d3-bf6c-88b576c20c45";
const show: BroadcastShow = {
  id,
  orgId: id,
  title: "Final",
  status: "draft",
  tournamentId: null,
  tournamentName: null,
  scheduledAt: "2026-10-14T12:34:56.789Z",
  startedAt: null,
  endedAt: null,
  createdAt: "2026-10-13T10:00:00Z",
};
function wrap(ui: React.ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
  );
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(apiClient.get).mockResolvedValue([]);
  vi.mocked(apiClient.patch).mockResolvedValue({ success: true });
});

describe("working broadcast operations", () => {
  it("requires node revocation confirmation and shows rejection without closing", async () => {
    const deactivate = vi.fn().mockRejectedValue(new Error("403"));
    wrap(
      <NodeCard
        node={{
          id,
          name: "Production desk",
          capabilities: "{}",
          isActive: true,
          lastSeenAt: null,
        }}
        now={new Date()}
        onDeactivate={deactivate}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Revoke node access" }));
    expect(deactivate).not.toHaveBeenCalled();
    fireEvent.click(
      screen.getByRole("button", { name: /^Revoke access$/ }),
    );
    await screen.findByText("Could not revoke this node. Try again.");
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Take" }),
    ).not.toBeInTheDocument();
  });
  it("editing title leaves the exact existing schedule untouched", async () => {
    wrap(
      <ShowSettingsDialog show={show} orgId={id} open onOpenChange={vi.fn()} />,
    );
    fireEvent.change(screen.getByLabelText("Show title"), {
      target: { value: "Final desk" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() =>
      expect(apiClient.patch).toHaveBeenCalledWith(
        `/api/broadcast/shows/${id}`,
        { title: "Final desk", tournamentId: null },
      ),
    );
  });
  it("clearing a schedule explicitly sends null", async () => {
    wrap(
      <ShowSettingsDialog show={show} orgId={id} open onOpenChange={vi.fn()} />,
    );
    fireEvent.change(screen.getByLabelText(/Planned start/), {
      target: { value: "" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() =>
      expect(apiClient.patch).toHaveBeenCalledWith(
        `/api/broadcast/shows/${id}`,
        expect.objectContaining({ scheduledAt: null }),
      ),
    );
  });
});
