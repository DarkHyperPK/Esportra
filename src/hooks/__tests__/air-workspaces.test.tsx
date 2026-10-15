import type { ReactNode } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { useAirProjectActions } from "@/hooks/useAirProjects";
import { useAirAdminActions } from "@/hooks/useAirAdmin";
import { newAirDocument } from "@/services/airProject";
import {
  airGrantSchema,
  airPlanSchema,
  airReleaseSchema,
  airTeamSchema,
} from "@/schemas/airSchema";
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "5e182c34-49f8-40d3-bf6c-88b576c20c45" } }),
}));
vi.mock("@/lib/apiClient", () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));
const id = "5e182c34-49f8-40d3-bf6c-88b576c20c45";
function setup() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return {
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  };
}
beforeEach(() => vi.clearAllMocks());
describe("Air account workspace contracts", () => {
  it("creates an independent project without an organizer or tournament ID", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ id });
    const { wrapper } = setup(),
      { result } = renderHook(() => useAirProjectActions(id), { wrapper });
    await act(() => result.current.create.mutateAsync("My event"));
    const [path, body] = vi.mocked(apiClient.post).mock.calls[0];
    expect(path).toBe(`/api/air/workspaces/${id}/projects`);
    expect(body).toMatchObject({
      title: "My event",
      document: { schemaVersion: 1, teams: [], matches: [] },
    });
    expect(body).not.toHaveProperty("tournamentId");
    expect(body).not.toHaveProperty("orgId");
  });
  it("sends the saved revision and never turns an independent match into an official result write", async () => {
    vi.mocked(apiClient.put).mockResolvedValue({ id });
    const { wrapper } = setup(),
      { result } = renderHook(() => useAirProjectActions(id), { wrapper });
    await act(() =>
      result.current.save.mutateAsync({
        id,
        workspaceId: id,
        title: "Event",
        revision: 4,
        updatedAt: "",
        document: newAirDocument(),
      }),
    );
    expect(apiClient.put).toHaveBeenCalledWith(
      `/api/air/projects/${id}`,
      expect.objectContaining({ revision: 4 }),
    );
    expect(apiClient.post).not.toHaveBeenCalled();
  });
  it("keeps original and in-game names distinct from optional HUD nicknames", () => {
    const row = airTeamSchema.parse({
      id,
      name: "North",
      tag: "N",
      players: [
        {
          id,
          originalName: "Official name",
          inGameName: "Game#TAG",
          hudNickname: "On air",
          role: "starter",
        },
      ],
    });
    expect(row.players[0]).toMatchObject({
      originalName: "Official name",
      inGameName: "Game#TAG",
      hudNickname: "On air",
    });
  });
  it("preserves an unrestricted allowance instead of translating it to zero", () => {
    expect(
      airPlanSchema.parse({
        name: "Trial",
        productionLimit: null,
        captureLimit: null,
        enabled: true,
      }).productionLimit,
    ).toBeNull();
    expect(
      airPlanSchema.safeParse({
        name: "Bad",
        productionLimit: -1,
        captureLimit: 0,
        enabled: true,
      }).success,
    ).toBe(false);
  });
  it("requires a reason and explicit plan for an access grant", () => {
    expect(
      airGrantSchema.safeParse({
        planId: id,
        validUntil: null,
        status: "active",
        reason: "",
      }).success,
    ).toBe(false);
    expect(
      airGrantSchema.parse({
        planId: id,
        validUntil: null,
        status: "active",
        reason: "Manual extension",
        overrideDeviceLimits: true,
        productionLimit: null,
        captureLimit: 2,
      }).captureLimit,
    ).toBe(2);
  });
  it("rejects unofficial or non-HTTPS release links", () => {
    for (const url of [
      "http://esportra.gg/air",
      "https://esportra.gg.attacker.invalid/air",
      "https://user@esportra.gg/air",
    ])
      expect(
        airReleaseSchema.safeParse({
          version: "0.2.0",
          channel: "stable",
          downloadUrl: url,
          notes: "",
          published: false,
        }).success,
      ).toBe(false);
  });
  it("uses the dedicated Air admin endpoint and UUID validation", async () => {
    const { wrapper } = setup(),
      { result } = renderHook(() => useAirAdminActions(), { wrapper });
    await act(async () => {
      await expect(
        result.current.mutateAsync({
          kind: "revoke",
          id: "../another",
          reason: "Test",
        }),
      ).rejects.toThrow();
    });
    expect(apiClient.post).not.toHaveBeenCalled();
    await act(() =>
      result.current.mutateAsync({
        kind: "revoke",
        id,
        reason: "Retired production PC",
      }),
    );
    expect(apiClient.post).toHaveBeenCalledWith(
      `/api/admin/air/devices/${id}/revoke`,
      { reason: "Retired production PC" },
    );
  });
});
