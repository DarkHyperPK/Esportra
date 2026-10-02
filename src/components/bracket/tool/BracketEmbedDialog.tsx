import { Copy } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CommandButton } from '@/components/management/CommandSurface';

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    code: string;
    onCopy: (code: string) => void;
};

/** The iframe snippet for a site or a stream overlay. It follows results live. */
export const BracketEmbedDialog = ({ open, onOpenChange, code, onCopy }: Props) => (
    <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="rounded-none border-white/10 bg-[#111114] text-white sm:max-w-lg">
            <DialogHeader>
                <DialogTitle className="font-heading">Embed this bracket</DialogTitle>
                <DialogDescription className="text-zinc-400">
                    Paste it into your site, or add it as a browser source in OBS. It updates as you report results.
                </DialogDescription>
            </DialogHeader>
            <textarea
                readOnly
                value={code}
                rows={5}
                onFocus={(event) => event.currentTarget.select()}
                className="w-full resize-none rounded-none border border-white/10 bg-black/30 p-3 font-mono text-xs text-zinc-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20"
            />
            <CommandButton className="w-full" onClick={() => onCopy(code)}>
                <Copy className="h-4 w-4" /> Copy embed code
            </CommandButton>
        </DialogContent>
    </Dialog>
);

export default BracketEmbedDialog;
