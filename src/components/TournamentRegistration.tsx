import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Alert, AlertDescription } from '@/components/ui/alert';
import TeamTournamentRegistration from '@/components/tournament/TeamTournamentRegistration';
import SoloTournamentRegistration from '@/components/tournament/SoloTournamentRegistration';
import { AlertTriangle, Ban as BanIcon, Upload, DollarSign, CheckCircle, FileText, Loader2 } from 'lucide-react';
import { RegistrationDetails } from '@/types/tournament';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/lib/apiClient';
import { isTeamRegistrationMode } from '@/utils/gameFeatures';

interface TournamentRegistrationProps {
  tournamentId: string;
  tournamentName: string;
  game?: string;
  gameMode?: string | null;
  teamSize?: number;
  participantMode?: 'solo' | 'team' | string | null;
  structure?: string;
  settings?: any;
  entryFee?: number | string | null;
  currency?: string;
  paymentInstructions?: string | null;
  onSuccess?: (registration: RegistrationDetails | null) => void;
  isEdit?: boolean;
  initialData?: RegistrationDetails | null;
  onRegisterSuccess?: () => void;
  onCancel?: () => void;
}

const TournamentRegistration: React.FC<TournamentRegistrationProps> = ({
  tournamentId,
  tournamentName,
  game = '',
  gameMode,
  teamSize = 1,
  participantMode,
  settings,
  entryFee,
  currency = 'USD',
  paymentInstructions,
  onRegisterSuccess,
  onCancel
}) => {
  const { user } = useAuth();
  const { toast } = useToast();

  // Ban state
  const [banned, setBanned] = useState(false);
  const [banReason, setBanReason] = useState<string | null>(null);

  // Payment receipt upload state
  const [showReceiptUpload, setShowReceiptUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Determine if paid tournament
  const parsedFee = typeof entryFee === 'string'
    ? (entryFee.toLowerCase() === 'free' ? 0 : parseFloat(entryFee) || 0)
    : (entryFee ?? 0);
  const isPaid = parsedFee > 0;

  // Check if this is a team tournament (catalog/tournament mode, not game-name heuristics)
  const isTeamTournament = isTeamRegistrationMode(game, gameMode, participantMode);

  // Check for ban on mount
  useEffect(() => {
    const checkBan = async () => {
      if (!user) return;
      try {
        const data = await apiClient.get<{ ban_reason: string | null } | null>(
          `/api/tournaments/${tournamentId}/ban-status`
        );

        if (data && (data as any).isBanned) {
          setBanned(true);
          setBanReason((data as any).ban?.ban_reason || null);
        } else {
          setBanned(false);
          setBanReason(null);
        }
      } catch (err) {
        console.error('Error checking ban status:', err);
        setBanned(false);
        setBanReason(null);
      }
    };
    checkBan();
  }, [user, tournamentId]);

  const handleRegistrationComplete = () => {
    if (isPaid) {
      setShowReceiptUpload(true);
    } else {
      onRegisterSuccess?.();
    }
  };

  const handleCancelReceiptUpload = async () => {
    // User closed receipt dialog without uploading — withdraw the registration
    try {
      await apiClient.delete(`/api/tournaments/${tournamentId}/register`);
    } catch { /* ignore if already cancelled */ }
    toast({
      title: 'Registration Cancelled',
      description: 'You must upload a payment receipt to complete registration.',
      variant: 'destructive',
    });
    setShowReceiptUpload(false);
    setReceiptFile(null);
    setReceiptPreview(null);
    onCancel?.();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowed.includes(file.type)) {
      toast({ title: 'Invalid file', description: 'Only JPEG, PNG, WebP, or PDF files accepted.', variant: 'destructive' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'File must be under 5MB.', variant: 'destructive' });
      return;
    }

    setReceiptFile(file);
    if (file.type.startsWith('image/')) {
      setReceiptPreview(URL.createObjectURL(file));
    } else {
      setReceiptPreview(null);
    }
  };

  const handleUploadReceipt = async () => {
    if (!receiptFile) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('receipt', receiptFile);

      await apiClient.upload(`/api/tournaments/${tournamentId}/upload-receipt`, formData);

      toast({
        title: 'Receipt Uploaded',
        description: 'Your payment receipt has been submitted for review. The organizer will approve your registration shortly.',
      });
      onRegisterSuccess?.();
    } catch (error: any) {
      toast({
        title: 'Upload Failed',
        description: error.message || 'Failed to upload receipt. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  // Show login prompt if not authenticated
  if (!user) {
    return (
      <Alert className="border border-white/10 bg-[#0a0a0c] text-white">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Please log in to register for this tournament.
        </AlertDescription>
      </Alert>
    );
  }

  // Show banned state if user is banned
  if (banned) {
    return (
      <div
        className="w-full bg-red-500/10 text-red-400 font-bold py-4 flex flex-col items-center justify-center text-2xl mb-4 border border-red-500/30 opacity-90 cursor-not-allowed"
      >
        <BanIcon className="w-10 h-10 mb-2 text-white drop-shadow-lg" />
        BANNED
        {banReason && (
          <span className="text-base font-normal mt-2 text-white/90">{banReason}</span>
        )}
      </div>
    );
  }

  // Receipt upload step for paid tournaments
  if (showReceiptUpload) {
    return (
      <div className="space-y-6 p-2">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Payment Required</h3>
            <p className="text-sm text-zinc-400">Entry Fee: {currency} {parsedFee}</p>
          </div>
        </div>

        {paymentInstructions && (
          <div className="bg-[#0a0a0c] border border-white/10 p-4">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-zinc-400" />
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Payment Instructions</span>
            </div>
            <p className="text-sm text-zinc-300 whitespace-pre-wrap">{paymentInstructions}</p>
          </div>
        )}

        <div className="space-y-3">
          <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Upload Payment Receipt</label>
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-zinc-700 hover:border-rose-500/50 p-6 text-center cursor-pointer transition-colors"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              onChange={handleFileSelect}
              className="hidden"
            />
            {receiptPreview ? (
              <div className="space-y-3">
                <img src={receiptPreview} alt="Receipt" className="max-h-48 mx-auto" />
                <p className="text-xs text-zinc-400">{receiptFile?.name}</p>
              </div>
            ) : receiptFile ? (
              <div className="space-y-2">
                <FileText className="w-10 h-10 mx-auto text-zinc-500" />
                <p className="text-sm text-zinc-300">{receiptFile.name}</p>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="w-10 h-10 mx-auto text-zinc-500" />
                <p className="text-sm text-zinc-400">Click to upload screenshot or PDF</p>
                <p className="text-xs text-zinc-600">JPEG, PNG, WebP, or PDF — max 5MB</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            onClick={handleUploadReceipt}
            disabled={!receiptFile || uploading}
            className="flex-1 bg-rose-600 hover:bg-rose-500 text-white"
          >
            {uploading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading...</>
            ) : (
              <><CheckCircle className="w-4 h-4 mr-2" /> Submit Receipt</>
            )}
          </Button>
          <Button
            onClick={handleCancelReceiptUpload}
            variant="outline"
            disabled={uploading}
            className="border-zinc-700 text-zinc-400 hover:text-white"
          >
            Cancel
          </Button>
        </div>
        <p className="text-xs text-zinc-500 text-center">
          Cancelling will withdraw your registration.
        </p>
      </div>
    );
  }

  // For team tournaments, use the team registration component
  if (isTeamTournament) {
    return (
      <TeamTournamentRegistration
        tournament={{
          id: tournamentId,
          name: tournamentName,
          game: game || '',
          game_mode: gameMode ?? undefined,
          gameMode: gameMode ?? undefined,
          start_date: new Date().toISOString(),
          entry_fee: parsedFee || undefined,
          prize_pool: undefined,
          max_teams: 100,
          team_size: teamSize,
          settings,
        }}
        onRegistrationComplete={handleRegistrationComplete}
        onCancel={onCancel || onRegisterSuccess}
      />
    );

  }

  // For solo tournaments, use the solo registration component
  return (
    <SoloTournamentRegistration
      tournament={{
        id: tournamentId,
        name: tournamentName,
        game: game || '',
        start_date: new Date().toISOString(),
        entry_fee: parsedFee,
        prize_pool: 0,
        max_teams: 100,
        description: ''
      }}
      onRegistrationComplete={handleRegistrationComplete}
      onCancel={onCancel || onRegisterSuccess}
    />
  );
};

export default TournamentRegistration;
