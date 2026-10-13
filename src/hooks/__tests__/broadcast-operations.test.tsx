import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { useBroadcastActivity } from "../useBroadcastActivity";
import { useDeactivateBroadcastNode } from "../useBroadcastNodes";
import {
  useDuplicateBroadcastShow,
  useDeleteBroadcastShow,
} from "../useBroadcastShows";

vi.mock("@/lib/apiClient", () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
}));
const id = "5e182c34-49f8-40d3-bf6c-88b576c20c45";
function setup() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, wrapper };
}
beforeEach(() => vi.clearAllMocks());
describe("broadcast backend contracts", () => {
  it("activity carries both cursor fields and stops at the final page", async () => {
    vi.mocked(apiClient.get)
      .mockResolvedValueOnce({
        items: [],
        nextCursor: { beforeAt: "2026-10-14T12:00:00Z", beforeId: id },
      })
      .mockResolvedValueOnce({ items: [], nextCursor: null });
    const { wrapper } = setup();
    const { result } = renderHook(() => useBroadcastActivity(id), { wrapper });
    await waitFor(() => expect(result.current.hasNextPage).toBe(true));
    await act(async () => {
      await result.current.fetchNextPage();
    });
    const route = vi.mocked(apiClient.get).mock.calls[1][0];
    const query = new URLSearchParams(route.split("?")[1]);
    expect(query.get("beforeAt")).toBe("2026-10-14T12:00:00Z");
    expect(query.get("beforeId")).toBe(id);
    await waitFor(() => expect(result.current.hasNextPage).toBe(false));
  });
  it("revocation validates the UUID before any server request", async () => {
    const { wrapper } = setup();
    const { result } = renderHook(() => useDeactivateBroadcastNode(id), {
      wrapper,
    });
    await act(async () => {
      await expect(
        result.current.mutateAsync("../other-node"),
      ).rejects.toThrow();
    });
    expect(apiClient.delete).not.toHaveBeenCalled();
  });
  it("duplicate calls the implemented route and refreshes home totals", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ showId: id });
    const { wrapper, client } = setup();
    const invalidate = vi.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useDuplicateBroadcastShow(id), {
      wrapper,
    });
    await act(async () => {
      await result.current.mutateAsync(id);
    });
    expect(apiClient.post).toHaveBeenCalledWith(
      `/api/broadcast/shows/${id}/duplicate`,
    );
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ["broadcast-home", id],
    });
  });
  it("delete removes stale detail data only after acknowledgment", async () => {
    const { wrapper, client } = setup();
    client.setQueryData(["broadcast-show", id], { title: "Draft" });
    vi.mocked(apiClient.delete)
      .mockRejectedValueOnce(new Error("history conflict"))
      .mockResolvedValueOnce(undefined);
    const { result } = renderHook(() => useDeleteBroadcastShow(id), {
      wrapper,
    });
    await act(async () => {
      await expect(result.current.mutateAsync(id)).rejects.toThrow();
    });
    expect(client.getQueryData(["broadcast-show", id])).toBeDefined();
    await act(async () => {
      await result.current.mutateAsync(id);
    });
    expect(client.getQueryData(["broadcast-show", id])).toBeUndefined();
  });
});
