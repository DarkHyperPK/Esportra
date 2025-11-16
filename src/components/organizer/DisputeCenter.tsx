import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { 
  MessageSquare, 
  AlertCircle, 
  CheckCircle, 
  XCircle, 
  Clock, 
  User,
  Calendar,
  FileText,
  Image as ImageIcon
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Dispute {
  id: string;
  tournament_id: string;
  match_id: string | null;
  raised_by_user_id: string;
  team_id: string | null;
  title: string;
  description: string | null;
  evidence_url: string | null;
  status: 'open' | 'in_review' | 'resolved' | 'rejected';
  assigned_to_user_id: string | null;
  resolution_notes: string | null;
  created_at: string;
  updated_at: string;
  raised_by_name?: string;
  team_name?: string;
  assigned_to_name?: string;
}

interface DisputeCenterProps {
  tournamentId: string;
  organizerId: string;
}

const DisputeCenter: React.FC<DisputeCenterProps> = ({ tournamentId, organizerId }) => {
  const { toast } = useToast();
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [resolutionDialogOpen, setResolutionDialogOpen] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [resolutionStatus, setResolutionStatus] = useState<'resolved' | 'rejected'>('resolved');

  useEffect(() => {
    if (tournamentId) {
      fetchDisputes();
    }
  }, [tournamentId]);

  const fetchDisputes = async () => {
    try {
      setLoading(true);
      const { data: disputesData, error } = await supabase
        .from('tournament_disputes')
        .select('*')
        .eq('tournament_id', tournamentId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Enrich with user/team names
      const enriched = await Promise.all(
        (disputesData || []).map(async (dispute: any) => {
          const enrichedDispute: Dispute = { ...dispute };
          
          const { data: raisedBy } = await supabase
            .from('profiles')
            .select('username, full_name')
            .eq('id', dispute.raised_by_user_id)
            .maybeSingle();
          enrichedDispute.raised_by_name = raisedBy?.username || raisedBy?.full_name || 'Unknown User';
          
          if (dispute.team_id) {
            const { data: team } = await supabase
              .from('teams')
              .select('name')
              .eq('id', dispute.team_id)
              .maybeSingle();
            enrichedDispute.team_name = team?.name || 'Unknown Team';
          }
          
          if (dispute.assigned_to_user_id) {
            const { data: assignedTo } = await supabase
              .from('profiles')
              .select('username, full_name')
              .eq('id', dispute.assigned_to_user_id)
              .maybeSingle();
            enrichedDispute.assigned_to_name = assignedTo?.username || assignedTo?.full_name || 'Unassigned';
          }

          return enrichedDispute;
        })
      );

      setDisputes(enriched);
    } catch (error: any) {
      console.error('Error fetching disputes:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to load disputes',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (disputeId: string, newStatus: 'in_review' | 'resolved' | 'rejected') => {
    try {
      const updateData: any = {
        status: newStatus,
        assigned_to_user_id: organizerId,
        updated_at: new Date().toISOString(),
      };

      if (newStatus === 'resolved' || newStatus === 'rejected') {
        updateData.resolution_notes = resolutionNotes || null;
      }

      const { error } = await supabase
        .from('tournament_disputes')
        .update(updateData)
        .eq('id', disputeId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Dispute ${newStatus === 'resolved' ? 'resolved' : newStatus === 'rejected' ? 'rejected' : 'marked as in review'}.`,
      });

      setResolutionDialogOpen(false);
      setResolutionNotes('');
      setSelectedDispute(null);
      fetchDisputes();
    } catch (error: any) {
      console.error('Error updating dispute:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update dispute',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge className="bg-yellow-600/20 text-yellow-400 border-yellow-500/30"><Clock className="h-3 w-3 mr-1" />Open</Badge>;
      case 'in_review':
        return <Badge className="bg-blue-600/20 text-blue-400 border-blue-500/30"><MessageSquare className="h-3 w-3 mr-1" />In Review</Badge>;
      case 'resolved':
        return <Badge className="bg-green-600/20 text-green-400 border-green-500/30"><CheckCircle className="h-3 w-3 mr-1" />Resolved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-600/20 text-red-400 border-red-500/30"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const openDisputes = disputes.filter(d => d.status === 'open');
  const inReviewDisputes = disputes.filter(d => d.status === 'in_review');
  const resolvedDisputes = disputes.filter(d => d.status === 'resolved' || d.status === 'rejected');

  return (
    <div className="space-y-6">
      <Card className="bg-gaming-dark border-gaming-gray/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-blue-500" />
            Dispute Center
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-gray-400">Loading disputes...</div>
          ) : (
            <Tabs defaultValue="open" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="open">
                  Open ({openDisputes.length})
                </TabsTrigger>
                <TabsTrigger value="in_review">
                  In Review ({inReviewDisputes.length})
                </TabsTrigger>
                <TabsTrigger value="resolved">
                  Resolved ({resolvedDisputes.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="open" className="space-y-4 mt-4">
                {openDisputes.length === 0 ? (
                  <div className="text-gray-400 p-4 bg-gaming-gray/10 rounded-lg">
                    No open disputes.
                  </div>
                ) : (
                  openDisputes.map((dispute) => (
                    <DisputeCard
                      key={dispute.id}
                      dispute={dispute}
                      onAction={(dispute) => {
                        setSelectedDispute(dispute);
                        setResolutionDialogOpen(true);
                      }}
                    />
                  ))
                )}
              </TabsContent>

              <TabsContent value="in_review" className="space-y-4 mt-4">
                {inReviewDisputes.length === 0 ? (
                  <div className="text-gray-400 p-4 bg-gaming-gray/10 rounded-lg">
                    No disputes in review.
                  </div>
                ) : (
                  inReviewDisputes.map((dispute) => (
                    <DisputeCard
                      key={dispute.id}
                      dispute={dispute}
                      onAction={(dispute) => {
                        setSelectedDispute(dispute);
                        setResolutionDialogOpen(true);
                      }}
                    />
                  ))
                )}
              </TabsContent>

              <TabsContent value="resolved" className="space-y-4 mt-4">
                {resolvedDisputes.length === 0 ? (
                  <div className="text-gray-400 p-4 bg-gaming-gray/10 rounded-lg">
                    No resolved disputes.
                  </div>
                ) : (
                  resolvedDisputes.map((dispute) => (
                    <DisputeCard
                      key={dispute.id}
                      dispute={dispute}
                      onAction={(dispute) => {
                        setSelectedDispute(dispute);
                        setResolutionDialogOpen(true);
                      }}
                      readonly
                    />
                  ))
                )}
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>

      {/* Resolution Dialog */}
      <Dialog open={resolutionDialogOpen} onOpenChange={setResolutionDialogOpen}>
        <DialogContent className="bg-gaming-dark border-gaming-gray/30 max-w-2xl">
          <DialogHeader>
            <DialogTitle>Resolve Dispute</DialogTitle>
            <DialogDescription>
              Review and resolve the dispute: <strong>{selectedDispute?.title}</strong>
            </DialogDescription>
          </DialogHeader>
          
          {selectedDispute && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold mb-2 block">Raised By</label>
                <div className="flex items-center gap-2 text-gray-300">
                  <User className="h-4 w-4" />
                  {selectedDispute.raised_by_name}
                  {selectedDispute.team_name && (
                    <Badge variant="outline" className="ml-2">{selectedDispute.team_name}</Badge>
                  )}
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold mb-2 block">Description</label>
                <div className="p-3 bg-gaming-gray/20 rounded-lg text-gray-300 text-sm">
                  {selectedDispute.description || 'No description provided.'}
                </div>
              </div>

              {selectedDispute.evidence_url && (
                <div>
                  <label className="text-sm font-semibold mb-2 block flex items-center gap-2">
                    <ImageIcon className="h-4 w-4" />
                    Evidence
                  </label>
                  <a
                    href={selectedDispute.evidence_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 underline text-sm"
                  >
                    View Evidence Image
                  </a>
                </div>
              )}

              {selectedDispute.status === 'open' && (
                <div>
                  <label className="text-sm font-semibold mb-2 block">Action</label>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => handleUpdateStatus(selectedDispute.id, 'in_review')}
                      className="border-blue-500/50 text-blue-400 hover:bg-blue-500/10"
                    >
                      Mark as In Review
                    </Button>
                  </div>
                </div>
              )}

              <div>
                <label className="text-sm font-semibold mb-2 block">Resolution Status</label>
                <div className="flex gap-2 mb-3">
                  <Button
                    variant={resolutionStatus === 'resolved' ? 'default' : 'outline'}
                    onClick={() => setResolutionStatus('resolved')}
                    className={resolutionStatus === 'resolved' ? 'bg-green-600 hover:bg-green-700' : ''}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Resolve
                  </Button>
                  <Button
                    variant={resolutionStatus === 'rejected' ? 'default' : 'outline'}
                    onClick={() => setResolutionStatus('rejected')}
                    className={resolutionStatus === 'rejected' ? 'bg-red-600 hover:bg-red-700' : ''}
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Reject
                  </Button>
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold mb-2 block">Resolution Notes</label>
                <Textarea
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Enter resolution notes or feedback..."
                  className="bg-gaming-gray/20 border-gaming-gray/50 text-white min-h-[100px]"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setResolutionDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => selectedDispute && handleUpdateStatus(selectedDispute.id, resolutionStatus)}
              disabled={!resolutionNotes.trim()}
              className={
                resolutionStatus === 'resolved'
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-red-600 hover:bg-red-700'
              }
            >
              {resolutionStatus === 'resolved' ? 'Resolve' : 'Reject'} Dispute
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

interface DisputeCardProps {
  dispute: Dispute;
  onAction: (dispute: Dispute) => void;
  readonly?: boolean;
}

const DisputeCard: React.FC<DisputeCardProps> = ({ dispute, onAction, readonly }) => {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge className="bg-yellow-600/20 text-yellow-400 border-yellow-500/30"><Clock className="h-3 w-3 mr-1" />Open</Badge>;
      case 'in_review':
        return <Badge className="bg-blue-600/20 text-blue-400 border-blue-500/30"><MessageSquare className="h-3 w-3 mr-1" />In Review</Badge>;
      case 'resolved':
        return <Badge className="bg-green-600/20 text-green-400 border-green-500/30"><CheckCircle className="h-3 w-3 mr-1" />Resolved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-600/20 text-red-400 border-red-500/30"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <Card className="bg-gaming-gray/20 border-gaming-gray/30">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h4 className="font-semibold text-lg">{dispute.title}</h4>
              {getStatusBadge(dispute.status)}
            </div>
            
            <div className="text-sm text-gray-400 space-y-1 mb-3">
              <div className="flex items-center gap-2">
                <User className="h-3 w-3" />
                <span>Raised by: <strong className="text-white">{dispute.raised_by_name}</strong></span>
                {dispute.team_name && (
                  <Badge variant="outline" className="ml-2 border-gray-500">{dispute.team_name}</Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-3 w-3" />
                <span>{new Date(dispute.created_at).toLocaleString()}</span>
              </div>
              {dispute.evidence_url && (
                <div className="flex items-center gap-2">
                  <ImageIcon className="h-3 w-3" />
                  <a
                    href={dispute.evidence_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 underline"
                  >
                    View Evidence
                  </a>
                </div>
              )}
            </div>

            {dispute.description && (
              <div className="text-sm text-gray-300 mb-3 bg-gaming-gray/20 p-3 rounded-lg">
                {dispute.description}
              </div>
            )}

            {dispute.resolution_notes && (
              <div className="text-sm text-gray-400 bg-gaming-gray/10 p-3 rounded-lg border-l-2 border-blue-500">
                <div className="font-semibold mb-1">Resolution Notes:</div>
                {dispute.resolution_notes}
              </div>
            )}
          </div>

          {!readonly && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onAction(dispute)}
              className="ml-4"
            >
              {dispute.status === 'open' ? 'Review' : dispute.status === 'in_review' ? 'Resolve' : 'View'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default DisputeCenter;

