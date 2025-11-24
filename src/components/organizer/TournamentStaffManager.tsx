import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import {
  fetchTournamentStaff,
  inviteTournamentStaff,
  removeTournamentStaff,
  StaffPermission,
  TournamentStaffRecord,
  updateTournamentStaff,
} from "@/lib/tournamentStaff";
import { formatDistanceToNow } from "date-fns";
import { Loader2, ShieldCheck, Trash2, UserPlus } from "lucide-react";

const STAFF_PERMISSIONS: {
  id: StaffPermission;
  label: string;
  description: string;
}[] = [
  {
    id: "scores:update",
    label: "Update scores",
    description: "Report match scores and advances",
  },
  {
    id: "teams:manage",
    label: "Manage teams",
    description: "Edit rosters & participation",
  },
  {
    id: "bracket:edit",
    label: "Edit brackets",
    description: "Adjust brackets or schedules",
  },
  {
    id: "announcements:send",
    label: "Send announcements",
    description: "Post tournament-wide updates",
  },
  {
    id: "disputes:assist",
    label: "Assist disputes",
    description: "Help organizers triage disputes",
  },
];

const PRESETS: Record<
  string,
  { name: string; description: string; permissions: StaffPermission[] }
> = {
  mod: {
    name: "Match Moderator",
    description: "Update scores, manage disputes",
    permissions: ["scores:update", "disputes:assist"],
  },
  cohost: {
    name: "Co-Host",
    description: "Nearly full control minus payouts",
    permissions: [
      "scores:update",
      "teams:manage",
      "bracket:edit",
      "announcements:send",
      "disputes:assist",
    ],
  },
  stream: {
    name: "Stream Lead",
    description: "Announcements + dispute support",
    permissions: ["announcements:send", "disputes:assist"],
  },
};

interface TournamentStaffManagerProps {
  tournamentId: string;
  organizerId: string;
}

const TournamentStaffManager: React.FC<TournamentStaffManagerProps> = ({
  tournamentId,
  organizerId,
}) => {
  const { toast } = useToast();
  const [staff, setStaff] = useState<TournamentStaffRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [role, setRole] = useState("mod");
  const [permissions, setPermissions] = useState<StaffPermission[]>(
    PRESETS.mod.permissions
  );
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const loadStaff = useCallback(async () => {
    if (!tournamentId) return;
    try {
      setLoading(true);
      const data = await fetchTournamentStaff(tournamentId);
      setStaff(data);
    } catch (error: unknown) {
      console.error("Failed to load staff", error);
      toast({
        title: "Unable to load staff",
        description: error instanceof Error ? error.message : "Please try again later",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [tournamentId, toast]);

  useEffect(() => {
    loadStaff();
  }, [loadStaff]);

  useEffect(() => {
    const preset = PRESETS[role];
    if (preset) {
      setPermissions(preset.permissions);
    }
  }, [role]);

  const togglePermission = (perm: StaffPermission) => {
    setPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    );
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      toast({
        title: "Email required",
        description: "Enter the email of the mod you want to add",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);
      await inviteTournamentStaff({
        tournamentId,
        userEmail: inviteEmail.trim(),
        role,
        permissions,
        assignedBy: organizerId,
      });
      toast({ title: "Staff added", description: inviteEmail });
      setInviteEmail("");
      await loadStaff();
    } catch (error: unknown) {
      console.error("Invite failed", error);
      toast({
        title: "Unable to add mod",
        description: error instanceof Error ? error.message : "Check email and try again",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (staffId: string) => {
    const entry = staff.find((s) => s.id === staffId);
    if (!entry) return;

    try {
      setEditingId(staffId);
      await updateTournamentStaff({
        staffId,
        role: entry.role,
        permissions: entry.permissions,
      });
      toast({ title: "Permissions updated" });
    } catch (error: unknown) {
      console.error("Update failed", error);
      toast({
        title: "Update failed",
        description: error instanceof Error ? error.message : "Please try again later",
        variant: "destructive",
      });
    } finally {
      setEditingId(null);
    }
  };

  const handleRemove = async (staffId: string) => {
    try {
      await removeTournamentStaff(staffId);
      toast({ title: "Staff removed" });
      await loadStaff();
    } catch (error: unknown) {
      toast({
        title: "Unable to remove staff",
        description: error instanceof Error ? error.message : "Please try again later",
        variant: "destructive",
      });
    }
  };

  const permissionLabel = useMemo(() => {
    return STAFF_PERMISSIONS.reduce<Record<StaffPermission, string>>(
      (acc, perm) => {
        acc[perm.id] = perm.label;
        return acc;
      },
      {} as Record<StaffPermission, string>
    );
  }, []);

  return (
    <div className="space-y-6">
      <Card className="bg-[#080d18] border border-white/5 shadow-xl shadow-black/30 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-xl text-slate-100 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-cyan-300" />
            Organizer Staff
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-3 gap-5">
            <div className="md:col-span-1 space-y-6">
              <div className="space-y-2">
                <Label htmlFor="mod-email" className="text-xs uppercase tracking-[0.2em] text-slate-400">
                  Invite by email
                </Label>
                <Input
                  id="mod-email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="teammate@example.com"
                  className="bg-[#0f1524] border-white/10 text-white placeholder:text-slate-500"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-[0.2em] text-slate-400">
                  Presets
                </Label>
                <div className="grid grid-cols-1 gap-2">
                  {Object.entries(PRESETS).map(([key, preset]) => (
                    <Button
                      key={key}
                      type="button"
                      variant="outline"
                      className={`justify-start rounded-xl border ${
                        role === key
                          ? 'border-cyan-400/70 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-white shadow-[0_10px_30px_rgba(6,182,212,0.25)]'
                          : 'border-white/10 text-slate-300 hover:border-white/20 hover:bg-white/5'
                      }`}
                      onClick={() => setRole(key)}
                    >
                      <div>
                        <div className="font-semibold text-sm">{preset.name}</div>
                        <div className="text-xs text-slate-400">
                          {preset.description}
                        </div>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>
            </div>
            <div className="md:col-span-2">
              <Label className="text-xs uppercase tracking-[0.2em] text-slate-400 mb-3 block">
                Custom permissions
              </Label>
              <div className="space-y-3 rounded-2xl border border-white/5 bg-gradient-to-br from-[#0b111f] via-[#0c1325] to-[#070a13] p-4">
                {STAFF_PERMISSIONS.map((perm) => (
                  <div
                    key={perm.id}
                    className="flex items-center justify-between py-3 px-3 rounded-xl bg-white/0 hover:bg-white/5 transition"
                  >
                    <div>
                      <div className="text-sm font-medium text-slate-100">
                        {perm.label}
                      </div>
                      <div className="text-xs text-slate-400">
                        {perm.description}
                      </div>
                    </div>
                    <Switch
                      checked={permissions.includes(perm.id)}
                      onCheckedChange={() => togglePermission(perm.id)}
                      className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-cyan-500 data-[state=checked]:to-blue-500 data-[state=unchecked]:bg-white/10 border border-white/10"
                    />
                  </div>
                ))}
              </div>
              <div className="flex justify-end mt-5">
                <Button
                  onClick={handleInvite}
                  disabled={submitting}
                  className="bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 text-white shadow-[0_12px_40px_rgba(14,165,233,0.45)] hover:from-cyan-400 hover:via-blue-400 hover:to-indigo-400 flex items-center gap-2 px-6 py-5 rounded-2xl transition-all"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <UserPlus className="w-4 h-4" />
                  )}
                  Invite Staff
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-[#080d18] border border-white/5 shadow-xl shadow-black/30">
        <CardHeader>
          <CardTitle className="text-xl text-slate-100">Active Staff</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-gray-300">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading staff...
            </div>
          ) : staff.length === 0 ? (
            <div className="text-slate-400 text-sm">
              No moderators assigned yet. Invite someone above.
            </div>
          ) : (
            <div className="space-y-4">
              {staff.map((member) => (
                <div
                  key={member.id}
                  className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border border-white/5 rounded-2xl p-4 bg-white/2"
                >
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback>
                        {member.profiles?.full_name?.slice(0, 2).toUpperCase() ||
                          member.profiles?.username?.slice(0, 2).toUpperCase() ||
                          member.profiles?.email?.slice(0, 2).toUpperCase() ||
                          "ST"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="text-slate-100 font-semibold">
                        {member.profiles?.full_name ||
                          member.profiles?.username ||
                            member.profiles?.email}
                        </div>
                        <Badge
                          variant="outline"
                          className={
                            member.status === 'active'
                              ? 'border-green-400/40 text-green-200 bg-green-500/10'
                              : member.status === 'pending'
                                ? 'border-amber-400/40 text-amber-200 bg-amber-500/10'
                                : 'border-red-400/40 text-red-200 bg-red-500/10'
                          }
                        >
                          {member.status === 'pending'
                            ? 'Pending acceptance'
                            : member.status === 'revoked'
                              ? 'Revoked'
                              : 'Active'}
                        </Badge>
                      </div>
                      <div className="text-xs text-slate-500">
                        {member.status === 'pending' ? 'Invited ' : 'Updated '}
                        {formatDistanceToNow(new Date(member.created_at), {
                          addSuffix: true,
                        })}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {member.permissions.map((perm) => (
                          <Badge
                            key={perm}
                            variant="secondary"
                            className="bg-[#10182a] border border-white/10 text-slate-200"
                          >
                            {permissionLabel[perm] || perm}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-cyan-400/50 text-cyan-200 hover:bg-cyan-500/10"
                      disabled={editingId === member.id}
                      onClick={() => handleUpdate(member.id)}
                    >
                      {editingId === member.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Save"
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-rose-400 hover:text-rose-300"
                      onClick={() => handleRemove(member.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TournamentStaffManager;

