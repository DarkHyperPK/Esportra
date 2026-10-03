import { useEffect, useRef, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { downloadNodeAsPng } from '@/lib/exportNodePng';

export interface ShareCardJob {
    /** Which card to render off-screen, e.g. "match" or "player:<puuid>". */
    key: string;
    fileName: string;
    size: { width: number; height: number };
}

/**
 * Renders one share card off-screen at full size, saves it as PNG, then clears.
 * The caller mounts the card for `job.key` and attaches `nodeRef` to it.
 */
export function useShareCardExport() {
    const [job, setJob] = useState<ShareCardJob | null>(null);
    const nodeRef = useRef<HTMLDivElement>(null);
    const running = useRef<string | null>(null);
    const { toast } = useToast();

    useEffect(() => {
        const node = nodeRef.current;
        if (!job || !node || running.current === job.key) return;
        running.current = job.key;
        downloadNodeAsPng(node, job.fileName, job.size)
            .then(() => toast({ title: 'Share card saved', description: job.fileName }))
            .catch(() => toast({ title: 'Download failed', description: 'Could not create the image. Try again.', variant: 'destructive' }))
            .finally(() => {
                running.current = null;
                setJob(null);
            });
    }, [job, toast]);

    return { job, start: (next: ShareCardJob) => { if (!running.current) setJob(next); }, nodeRef };
}
