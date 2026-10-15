import { act, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { useCreateCrewInvite } from "../useBroadcastCrew";
const api = vi.hoisted(() => ({ post: vi.fn(), delete: vi.fn() }));
vi.mock("@/lib/apiClient", () => ({ apiClient: api }));
function mount() {
  const query = new QueryClient({ defaultOptions: { mutations: { retry: false }, queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={query}>{children}</QueryClientProvider>;
  return { ...renderHook(() => useCreateCrewInvite("show"), { wrapper }), query };
}
describe("account-bound broadcast invitations", () => {
  it("cancels a legacy unbound invitation instead of silently sharing its token", async () => {
    api.post.mockResolvedValue({ inviteId: "legacy", token: "fixture-only", expiresAt: "2026-10-17" });
    api.delete.mockResolvedValue({ success: true });
    const { result, query } = mount();
    await act(async () => { await expect(result.current.mutateAsync({ role: "observer", email: "crew@example.com" })).rejects.toThrow("cancelled"); });
    expect(api.delete).toHaveBeenCalledWith("/api/broadcast/shows/show/crew/invites/legacy");
    expect(query.getMutationCache().getAll()[0].state.data).toBeUndefined();
  });
  it("preserves a valid bound invitation when email submission fails", async () => {
    const value = { inviteId: "bound", token: "fixture-only", recipientBound: true, emailStatus: "failed" };
    api.post.mockResolvedValue(value); api.delete.mockClear();
    const { result } = mount();
    await act(async () => { expect(await result.current.mutateAsync({ role: "observer", email: "crew@example.com" })).toEqual(value); });
    expect(api.delete).not.toHaveBeenCalled();
  });
});
