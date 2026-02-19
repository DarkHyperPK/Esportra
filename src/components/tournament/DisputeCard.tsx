import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle, Upload, Loader2, CheckCircle, XCircle, Clock, Image as ImageIcon } from 'lucide-react';
import { useMatchDispute } from '@/hooks/useMatchDispute';
import { format } from 'date-fns';

interface DisputeCardProps {
    matchId: string;
    userTeamId: string | undefined;
    isCaptain: boolean;
    isOrganizer?: boolean;
    matchStatus: string;
}

const DisputeCard: React.FC<DisputeCardProps> = ({
    matchId,
    userTeamId,
    isCaptain,
    isOrganizer = false,
    matchStatus,
}) => {
    const { dispute, isLoading, fileDispute, resolveDispute, uploadEvidence, hasActiveDispute } = useMatchDispute(matchId);

    const [showForm, setShowForm] = useState(false);
    const [reason, setReason] = useState('');
    const [evidenceUrls, setEvidenceUrls] = useState<string[]>([]);
    const [uploading, setUploading] = useState(false);
    const [resolution, setResolution] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setUploading(true);
        try {
            const uploadPromises = Array.from(files).map(file => uploadEvidence(file));
            const urls = await Promise.all(uploadPromises);
            setEvidenceUrls(prev => [...prev, ...urls]);
        } catch (error) {
            console.error('Failed to upload evidence:', error);
        } finally {
            setUploading(false);
        }
    };

    const handleSubmitDispute = async () => {
        if (!userTeamId || !reason.trim()) return;

        await fileDispute.mutateAsync({
            teamId: userTeamId,
            reason: reason.trim(),
            evidenceUrls,
        });

        setShowForm(false);
        setReason('');
        setEvidenceUrls([]);
    };

    const handleResolve = async (status: 'resolved' | 'rejected') => {
        if (!dispute) return;

        await resolveDispute.mutateAsync({
            disputeId: dispute.id,
            status,
            resolution: resolution.trim() || `Dispute ${status} by organizer`,
        });

        setResolution('');
    };

    // Don't show if match isn't completed
    if (matchStatus !== 'completed') return null;

    // Loading state
    if (isLoading) {
        return (
            <Card className="bg-zinc-900/60 border-zinc-800">
                <CardContent className="p-4 flex items-center justify-center">
                    <Loader2 className="w-5 h-5 animate-spin text-zinc-500" />
                </CardContent>
            </Card>
        );
    }

    // Show existing dispute
    if (dispute) {
        const statusIcon = {
            pending: <Clock className="w-5 h-5 text-amber-400" />,
            resolved: <CheckCircle className="w-5 h-5 text-emerald-400" />,
            rejected: <XCircle className="w-5 h-5 text-red-400" />,
        }[dispute.status];

        const statusColor = {
            pending: 'text-amber-400 border-amber-500/20 bg-amber-500/10',
            resolved: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10',
            rejected: 'text-red-400 border-red-500/20 bg-red-500/10',
        }[dispute.status];

        return (
            <Card className="bg-zinc-900/60 border-zinc-800">
                <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                        {statusIcon}
                        <span>Match Dispute</span>
                        <span className={`text-xs px-2 py-0.5 rounded border ${statusColor}`}>
                            {dispute.status.toUpperCase()}
                        </span>
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Dispute reason */}
                    <div className="p-3 bg-zinc-800/50 rounded-lg">
                        <p className="text-xs text-zinc-500 uppercase mb-1">Reason</p>
                        <p className="text-sm text-zinc-300">{dispute.reason}</p>
                    </div>

                    {/* Evidence */}
                    {dispute.evidence_urls && dispute.evidence_urls.length > 0 && (
                        <div>
                            <p className="text-xs text-zinc-500 uppercase mb-2">Evidence</p>
                            <div className="flex gap-2 overflow-x-auto">
                                {dispute.evidence_urls.map((url, i) => (
                                    <a
                                        key={i}
                                        href={url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block w-20 h-14 rounded-lg overflow-hidden border border-zinc-700 hover:border-purple-500/50 transition-colors shrink-0"
                                    >
                                        <img src={url} alt={`Evidence ${i + 1}`} className="w-full h-full object-cover" />
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Resolution (if resolved) */}
                    {dispute.resolution && (
                        <div className="p-3 bg-zinc-800/50 rounded-lg border-l-2 border-emerald-500/50">
                            <p className="text-xs text-zinc-500 uppercase mb-1">Organizer Resolution</p>
                            <p className="text-sm text-zinc-300">{dispute.resolution}</p>
                            {dispute.resolved_at && (
                                <p className="text-xs text-zinc-500 mt-2">
                                    {format(new Date(dispute.resolved_at), 'MMM d, h:mm a')}
                                </p>
                            )}
                        </div>
                    )}

                    {/* Organizer resolution form */}
                    {isOrganizer && dispute.status === 'pending' && (
                        <div className="space-y-3 pt-2 border-t border-zinc-800">
                            <p className="text-xs text-zinc-400 uppercase">Resolve Dispute</p>
                            <Textarea
                                value={resolution}
                                onChange={(e) => setResolution(e.target.value)}
                                placeholder="Enter your resolution/decision..."
                                className="bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-600"
                                rows={2}
                            />
                            <div className="flex gap-2">
                                <Button
                                    onClick={() => handleResolve('resolved')}
                                    disabled={resolveDispute.isPending}
                                    className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                                >
                                    {resolveDispute.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Accept Dispute'}
                                </Button>
                                <Button
                                    onClick={() => handleResolve('rejected')}
                                    disabled={resolveDispute.isPending}
                                    variant="destructive"
                                    className="flex-1"
                                >
                                    {resolveDispute.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Reject Dispute'}
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Filed date */}
                    <p className="text-xs text-zinc-600">
                        Filed {format(new Date(dispute.created_at), 'MMM d, h:mm a')}
                    </p>
                </CardContent>
            </Card>
        );
    }

    // Show file dispute button/form
    if (!isCaptain) return null;

    return (
        <Card className="bg-zinc-900/60 border-zinc-800">
            <CardContent className="p-4">
                {!showForm ? (
                    <Button
                        onClick={() => setShowForm(true)}
                        variant="outline"
                        className="w-full border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                    >
                        <AlertTriangle className="w-4 h-4 mr-2" />
                        Dispute Match Result
                    </Button>
                ) : (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-amber-400">
                            <AlertTriangle className="w-5 h-5" />
                            <span className="font-medium">File a Dispute</span>
                        </div>

                        <Textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Explain why you're disputing this match result..."
                            className="bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-600"
                            rows={3}
                        />

                        {/* Evidence upload */}
                        <div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={handleFileUpload}
                                className="hidden"
                            />
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploading}
                                className="border-zinc-700 text-zinc-400 hover:text-white"
                            >
                                {uploading ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <Upload className="w-4 h-4 mr-2" />
                                )}
                                Upload Evidence
                            </Button>

                            {/* Preview uploaded images */}
                            {evidenceUrls.length > 0 && (
                                <div className="flex gap-2 mt-3 overflow-x-auto">
                                    {evidenceUrls.map((url, i) => (
                                        <div
                                            key={i}
                                            className="relative w-16 h-12 rounded-lg overflow-hidden border border-zinc-700 shrink-0"
                                        >
                                            <img src={url} alt={`Evidence ${i + 1}`} className="w-full h-full object-cover" />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="flex gap-2">
                            <Button
                                onClick={handleSubmitDispute}
                                disabled={!reason.trim() || fileDispute.isPending}
                                className="flex-1 bg-amber-600 hover:bg-amber-700"
                            >
                                {fileDispute.isPending ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    'Submit Dispute'
                                )}
                            </Button>
                            <Button
                                variant="ghost"
                                onClick={() => {
                                    setShowForm(false);
                                    setReason('');
                                    setEvidenceUrls([]);
                                }}
                                className="text-zinc-400"
                            >
                                Cancel
                            </Button>
                        </div>

                        <p className="text-xs text-zinc-500">
                            Note: Only file a dispute if you believe the match result is incorrect.
                            Include screenshots as evidence.
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default DisputeCard;
