import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const TeamInviteModal = ({ team, onClose, onInvite }) => {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Invite Member to {team?.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Label htmlFor="inviteUsername">Username</Label>
          <Input
            id="inviteUsername"
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="Enter username"
            disabled={submitting}
          />
          {error && <div className="text-red-500 text-xs">{error}</div>}
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
            <Button
              className="bg-gaming-purple hover:bg-gaming-purple/80"
              onClick={() => onInvite(username)}
              disabled={submitting || !username.trim()}
            >
              {submitting ? 'Inviting...' : 'Send Invite'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TeamInviteModal; 
