import type { z } from "zod";
import type {
  airDocumentSchema,
  airTeamSchema,
  airMatchSchema,
  airPlanSchema,
  airGrantSchema,
  airReleaseSchema,
} from "@/schemas/airSchema";
export type AirDocument = z.infer<typeof airDocumentSchema>;
export type AirTeam = z.infer<typeof airTeamSchema>;
export type AirMatch = z.infer<typeof airMatchSchema>;
export type AirPlanInput = z.infer<typeof airPlanSchema>;
export type AirGrantInput = z.infer<typeof airGrantSchema>;
export type AirReleaseInput = z.infer<typeof airReleaseSchema>;
export interface AirWorkspace {
  id: string;
  name: string;
  createdAt: string;
}
export interface AirSession {
  userId: string;
  account: {
    status: string;
    trialStartedAt: string;
    trialEndsAt: string;
    validUntil: string | null;
    planId: string;
  };
  workspaces: AirWorkspace[];
}
export interface AirProjectSummary {
  id: string;
  workspaceId: string;
  title: string;
  revision: number;
  updatedAt: string;
}
export interface AirProject extends AirProjectSummary {
  document: AirDocument;
}
export type AirAdminSection =
  | "customers"
  | "workspaces"
  | "plans"
  | "devices"
  | "activity"
  | "releases";
export interface AirAdminRow {
  id?: string | number;
  userId?: string;
  name?: string;
  status?: string;
  plan?: string;
  planId?: string;
  validUntil?: string | null;
  trialEndsAt?: string;
  licenseCode?: string;
  ownerId?: string;
  projects?: number;
  productionLimit?: number | null;
  captureLimit?: number | null;
  enabled?: boolean;
  overrideDeviceLimits?: boolean;
  mode?: string;
  lastSeenAt?: string;
  health?: string;
  action?: string;
  actorId?: string;
  subjectId?: string;
  reason?: string;
  createdAt?: string;
  version?: string;
  channel?: "stable" | "preview";
  downloadUrl?: string;
  notes?: string;
  published?: boolean;
}
export interface AirAdminList {
  items: AirAdminRow[];
  page: number;
  hasMore: boolean;
}
export interface AirOverview {
  counts: {
    customers: number;
    workspaces: number;
    activeDevices: number;
    onlineDevices: number;
    expiredAccess: number;
  };
  offlineSigningConfigured: boolean;
  paymentsEnabled: boolean;
}
