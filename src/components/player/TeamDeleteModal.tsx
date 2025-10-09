import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const TeamDeleteModal = ({ team, onClose, onDelete }) => {
  if (!team) return null;
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Delete Team</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p>Are you sure you want to delete the team <b>{team.name}</b>? This action cannot be undone.</p>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button variant="destructive" onClick={() => onDelete(team)}>Delete</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TeamDeleteModal; 