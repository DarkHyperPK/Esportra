import { z } from "zod";
import type { BroadcastNode } from "@/types/broadcast";

const runtimeSchema = z.object({
  mode: z.enum(["production", "capture-only"]),
  hudOnline: z.boolean(),
  obsConnected: z.boolean(),
  feedState: z.enum(["waiting", "live", "stale", "idle"]),
  automationPaused: z.boolean(),
  timeoutPaused: z.boolean(),
  hudClientsConnected: z.boolean(),
  appVersion: z.string().max(64),
  plan: z.object({ showId: z.string().uuid(), version: z.number().int().positive().max(Number.MAX_SAFE_INTEGER), pendingVersion: z.number().int().positive().max(Number.MAX_SAFE_INTEGER).nullable().optional() }).nullable().optional(),
  outputs: z.array(z.object({ id: z.string().uuid(), name: z.string().min(1).max(80), connectionCount: z.number().int().min(0).max(10000), lastFrameAt: z.string().datetime().nullable() })).max(100).nullable().optional(),
});

export function nodeRuntimeHealth(node: BroadcastNode, now: Date) {
  if (!node.runtimeStatus || !node.runtimeSeenAt) return null;
  const age = now.getTime() - Date.parse(node.runtimeSeenAt);
  if (!Number.isFinite(age) || age < -5000 || age > 15000 || node.runtimeStatus.length > 32768) return null;
  try {
    const parsed = runtimeSchema.safeParse(JSON.parse(node.runtimeStatus));
    return parsed.success ? parsed.data : null;
  } catch { return null; }
}
