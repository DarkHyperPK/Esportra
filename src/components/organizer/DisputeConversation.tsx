import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Image as ImageIcon, RefreshCw, Send, Paperclip } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Comment {
  id: string;
  user_id: string;
  comment: string;
  created_at: string;
  user_name?: string;
  is_internal: boolean;
  attachment_url?: string;
}

interface DisputeConversationProps {
  comments: Comment[];
  loading: boolean;
  organizerId: string;
  staffUserIds: string[];
  canComment: boolean;
  submitting: boolean;
  uploading: boolean;
  onSubmit: (text: string, attachment: File | null) => void;
  onImageClick?: (url: string) => void;
}

/** Image with React-managed error fallback */
const AttachmentImage: React.FC<{ url: string; onImageClick?: (url: string) => void }> = ({ url, onImageClick }) => {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1.5 text-xs text-blue-400 underline hover:text-blue-300"
      >
        <Paperclip className="w-3 h-3" /> View attachment
      </a>
    );
  }

  return (
    <img
      src={url}
      alt="Attachment"
      className="max-w-full max-h-40 rounded-lg border border-zinc-700 cursor-pointer hover:opacity-80 transition block"
      onClick={() => onImageClick?.(url)}
      onError={() => setFailed(true)}
    />
  );
};

const DisputeConversation: React.FC<DisputeConversationProps> = ({
  comments, loading, organizerId, staffUserIds, canComment,
  submitting, uploading, onSubmit, onImageClick,
}) => {
  const { toast } = useToast();
  const [text, setText] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

  const handleSubmit = () => {
    if (!text.trim() && !attachment) return;
    onSubmit(text, attachment);
    setText('');
    setAttachment(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Max 5MB', variant: 'destructive' });
      return;
    }
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Invalid file', description: 'Images only', variant: 'destructive' });
      return;
    }
    setAttachment(file);
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <h3 className="text-xs uppercase tracking-wider text-zinc-500 font-bold mb-2 shrink-0">Conversation</h3>

      {/* Messages — own scroller */}
      <div className="flex-1 overflow-y-auto space-y-2.5 mb-3 pr-1 scrollbar-thin min-h-0">
        {loading ? (
          <div className="flex items-center justify-center py-8 text-zinc-500 text-sm">
            <RefreshCw className="w-4 h-4 animate-spin mr-2" /> Loading…
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-8 text-zinc-600 text-sm">No messages yet</div>
        ) : (
          comments.map((c) => {
            const isStaff = c.user_id === organizerId || staffUserIds.includes(c.user_id);
            const hasText = c.comment?.trim();
            const hasAttachment = !!c.attachment_url;
            return (
              <div
                key={c.id}
                className={`rounded-lg px-3 py-2.5 text-sm border ${
                  isStaff
                    ? 'bg-blue-500/8 border-blue-500/20 ml-4'
                    : 'bg-zinc-800/50 border-zinc-800 mr-4'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-[11px] font-semibold ${isStaff ? 'text-blue-400' : 'text-zinc-400'}`}>
                    {isStaff ? '⚡ ' : ''}{c.user_name || 'Unknown'}
                  </span>
                  <span className="text-[10px] text-zinc-600">{formatTime(c.created_at)}</span>
                </div>
                {hasText && <p className="text-zinc-300 text-[13px] leading-relaxed">{c.comment}</p>}
                {hasAttachment && (
                  <div className={hasText ? 'mt-2' : ''}>
                    <AttachmentImage url={c.attachment_url!} onImageClick={onImageClick} />
                  </div>
                )}
                {!hasText && !hasAttachment && (
                  <p className="text-zinc-500 text-[13px] italic">Empty message</p>
                )}
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      {canComment && (
        <div className="border-t border-zinc-800/60 pt-3 space-y-2">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a message…"
            className="bg-zinc-900/60 border-zinc-800 text-white placeholder:text-zinc-600 min-h-[60px] text-sm resize-none"
            onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit(); }}
          />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <label className="cursor-pointer text-zinc-500 hover:text-zinc-300 transition p-1.5 rounded-md hover:bg-zinc-800">
                <ImageIcon className="w-4 h-4" />
                <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              </label>
              {attachment && (
                <span className="text-[11px] text-zinc-400 flex items-center gap-1">
                  📎 {attachment.name}
                  <button onClick={() => setAttachment(null)} className="text-red-400 hover:text-red-300 ml-1">×</button>
                </span>
              )}
            </div>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={(!text.trim() && !attachment) || submitting || uploading}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-3 h-8"
            >
              <Send className="w-3 h-3 mr-1.5" />
              {uploading ? 'Uploading…' : submitting ? 'Sending…' : 'Send'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default DisputeConversation;
