import { describe, expect, it } from "vitest";
import { nodeRuntimeHealth } from "../nodeRuntimeHealth";
import type { BroadcastNode } from "@/types/broadcast";

const now = new Date("2026-10-14T12:00:00Z");
const runtime = { mode: "production", hudOnline: true, obsConnected: false, feedState: "stale", automationPaused: true, timeoutPaused: false, hudClientsConnected: true, appVersion: "0.1.0" };
const node: BroadcastNode = { id: "node", name: "Desk", capabilities: "{}", isActive: true, lastSeenAt: now.toISOString(), runtimeSeenAt: now.toISOString(), runtimeStatus: JSON.stringify(runtime) };
describe("nodeRuntimeHealth", () => {
  it("reads current reported health without accepting raw GEP fields", () => {
    expect(nodeRuntimeHealth(node, now)).toEqual(runtime);
  });
  it("treats old, invalid and legacy telemetry as unknown", () => {
    expect(nodeRuntimeHealth({ ...node, runtimeSeenAt: "2026-10-14T11:59:00Z" }, now)).toBeNull();
    expect(nodeRuntimeHealth({ ...node, runtimeStatus: "not-json" }, now)).toBeNull();
    expect(nodeRuntimeHealth({ ...node, runtimeStatus: undefined }, now)).toBeNull();
    expect(nodeRuntimeHealth({ ...node, runtimeStatus: '{"feedState":"raw-gep"}' }, now)).toBeNull();
  });
  it("accepts bounded output rendering metadata and rejects invalid sources", () => {
    const output = { id: "00000000-0000-4000-8000-000000000061", name: "Gameplay", connectionCount: 2, lastFrameAt: now.toISOString() };
    const withOutput = (value: unknown) => ({ ...node, runtimeStatus: JSON.stringify({ ...runtime, outputs: value }) });
    expect(nodeRuntimeHealth(withOutput([output]), now)?.outputs).toEqual([output]);
    expect(nodeRuntimeHealth(withOutput([{ ...output, connectionCount: -1 }]), now)).toBeNull();
    expect(nodeRuntimeHealth(withOutput(Array(101).fill(output)), now)).toBeNull();
  });
});
