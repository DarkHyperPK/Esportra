// TournamentAnnouncementPanel.tsx — Send and view tournament announcements
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
    fetchAnnouncements,
    createAnnouncement,
    deleteAnnouncement,
    TournamentAnnouncement,
} from "@/lib/tournamentAnnouncements";
import { Button } from "@/components/ui/button";
import { Megaphone, Trash2, Send, Loader2, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface TournamentAnnouncementPanelProps {
    tournamentId: string;
}

const TournamentAnnouncementPanel = ({ tournamentId }: TournamentAnnouncementPanelProps) => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [announcements, setAnnouncements] = useState<TournamentAnnouncement[]>([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [isComposing, setIsComposing] = useState(false);

    const load = useCallback(async () => {
        try {
            setLoading(true);
            const data = await fetchAnnouncements(tournamentId);
            setAnnouncements(data);
        } catch (err: any) {
            toast({ title: "Failed to load announcements", description: err.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }, [tournamentId, toast]);

    useEffect(() => { load(); }, [load]);

    const handleSend = async () => {
        if (!title.trim() || !content.trim() || !user) return;
        setSending(true);
        try {
            await createAnnouncement({
                tournamentId,
                senderId: user.id,
                title: title.trim(),
                content: content.trim(),
            });
            toast({ title: "Announcement sent", description: "All participants have been notified." });
            setTitle("");
            setContent("");
            setIsComposing(false);
            await load();
        } catch (err: any) {
            toast({ title: "Failed to send", description: err.message, variant: "destructive" });
        } finally {
            setSending(false);
        }
    };

    const handleDelete = async (id: string) => {
        setDeletingId(id);
        try {
            await deleteAnnouncement(id);
            setAnnouncements(prev => prev.filter(a => a.id !== id));
            toast({ title: "Announcement deleted" });
        } catch (err: any) {
            toast({ title: "Failed to delete", description: err.message, variant: "destructive" });
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className="space-y-6">
            {/* Compose Section */}
            <div className="rounded-2xl bg-[#0a0a0c] border border-zinc-800/50 p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <Megaphone className="h-5 w-5 text-amber-500" />
                        <h3 className="text-lg font-bold text-white">Announcements</h3>
                        <span className="text-xs text-zinc-500 bg-zinc-900 px-2 py-0.5 rounded-full">
                            {announcements.length}
                        </span>
                    </div>
                    {!isComposing && (
                        <Button
                            onClick={() => setIsComposing(true)}
                            className="bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30 text-xs"
                            size="sm"
                        >
                            <Megaphone className="h-3 w-3 mr-1.5" />
                            New Announcement
                        </Button>
                    )}
                </div>

                {isComposing && (
                    <div className="space-y-3 p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/50 mb-4">
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Announcement title..."
                            className="w-full bg-transparent border border-zinc-700/50 rounded-lg px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500/50 transition-colors"
                            maxLength={100}
                        />
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="Write your announcement to all participants..."
                            className="w-full bg-transparent border border-zinc-700/50 rounded-lg px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500/50 transition-colors resize-none min-h-[100px]"
                            maxLength={1000}
                        />
                        <div className="flex items-center justify-between">
                            <p className="text-[10px] text-zinc-600 font-mono">
                                {content.length}/1000 · All registered participants will be notified
                            </p>
                            <div className="flex gap-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => { setIsComposing(false); setTitle(""); setContent(""); }}
                                    className="text-zinc-500 hover:text-white text-xs"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    size="sm"
                                    disabled={!title.trim() || !content.trim() || sending}
                                    onClick={handleSend}
                                    className="bg-amber-500 hover:bg-amber-600 text-black font-semibold text-xs"
                                >
                                    {sending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Send className="h-3 w-3 mr-1" />}
                                    Send to All Participants
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Announcements List */}
            {loading ? (
                <div className="text-center py-8 text-zinc-600">Loading announcements...</div>
            ) : announcements.length === 0 && !isComposing ? (
                <div className="text-center py-12 text-zinc-600">
                    <Megaphone className="h-10 w-10 mx-auto mb-3 opacity-20" />
                    <p className="text-sm">No announcements yet</p>
                    <p className="text-xs text-zinc-700 mt-1">Send one to notify all tournament participants</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {announcements.map((a) => (
                        <div
                            key={a.id}
                            className="rounded-xl bg-[#0a0a0c] border border-zinc-800/50 p-5 group hover:border-zinc-700/50 transition-colors"
                        >
                            <div className="flex items-start justify-between mb-2">
                                <div>
                                    <h4 className="text-sm font-bold text-white">{a.title}</h4>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-[11px] text-zinc-500">
                                            by {a.sender?.full_name || a.sender?.username || "Staff"}
                                        </span>
                                        <span className="text-[10px] text-zinc-700">•</span>
                                        <span className="text-[11px] text-zinc-600 font-mono flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                                        </span>
                                    </div>
                                </div>
                                {user?.id === a.sender_id && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDelete(a.id)}
                                        disabled={deletingId === a.id}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400/50 hover:text-red-400 hover:bg-red-500/10 h-7 w-7 p-0"
                                    >
                                        {deletingId === a.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                                    </Button>
                                )}
                            </div>
                            <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap break-all">
                                {a.content}
                            </p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default TournamentAnnouncementPanel;
