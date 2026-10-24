import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { Dialog, DialogTrigger, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { CommandButton } from '@/components/management/CommandSurface';

export default function ProEventProofPreview({ requestId }: { requestId: string }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');
  const { data, isLoading, error } = useQuery({ queryKey: ['admin', 'pro-event-proof', requestId], enabled: open,
    queryFn: () => apiClient.getBlob(`/api/admin/pro-event-requests/${requestId}/proof`), gcTime: 0, staleTime: 0 });
  useEffect(() => {
    if (!open || !data) return;
    const objectUrl = URL.createObjectURL(data); setUrl(objectUrl);
    return () => { URL.revokeObjectURL(objectUrl); setUrl(''); };
  }, [open, data]);
  return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><CommandButton variant="secondary" size="sm">Inspect payment proof</CommandButton></DialogTrigger><DialogContent className="max-h-[90dvh] max-w-3xl overflow-auto"><DialogTitle>Payment proof</DialogTitle><DialogDescription>Verify the actual funds received before arranging activation. This image is private to authorized staff.</DialogDescription>{isLoading && <p role="status">Loading proof…</p>}{error && <p role="alert" className="text-red-300">Proof could not be loaded.</p>}{url && <img src={url} alt="Submitted payment proof" className="h-auto w-full object-contain" />}</DialogContent></Dialog>;
}
