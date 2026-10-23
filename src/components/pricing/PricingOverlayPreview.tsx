import { useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Expand, X } from 'lucide-react';
import { Dialog, DialogTrigger, DialogPortal, DialogOverlay, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/dialog';
import { usePricingMotion } from '@/hooks/usePricingMotion';

export default function PricingOverlayPreview() {
  const allowMotion = usePricingMotion();
  const [open, setOpen] = useState(false);
  const [viaPointer, setViaPointer] = useState(false);
  const motion = allowMotion && viaPointer ? 'on' : 'off';
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <figure className="pricing-overlay-figure">
        <div className="pricing-screen-bar"><span><i /> Overlay preview</span><span>OBS / 16:9</span></div>
        <DialogTrigger asChild>
          <button type="button" className="pricing-overlay-inspect" aria-label="Inspect veto overlay" onClick={event => setViaPointer(event.detail > 0)}>
            <img src="/air-hud/previews/map-veto.jpg" alt="Example Valorant veto overlay with picked, banned and decider maps." width={1280} height={720} loading="lazy" decoding="async" onError={event => { event.currentTarget.style.visibility = 'hidden'; }} />
            <span><Expand size={14} aria-hidden="true" /> Inspect overlay</span>
          </button>
        </DialogTrigger>
        <figcaption>Map veto preview · Valorant map artwork © Riot Games</figcaption>
      </figure>
      {(open || (allowMotion && viaPointer)) && <DialogPortal>
        <DialogOverlay className="pricing-lightbox-backdrop" data-motion={motion} />
        <DialogPrimitive.Content className="pricing-lightbox" data-motion={motion} onKeyDownCapture={() => setViaPointer(false)}>
          <div className="pricing-lightbox-header">
            <div><DialogTitle>Look closer at the veto.</DialogTitle><DialogDescription>Map veto preview · Valorant artwork © Riot Games</DialogDescription></div>
            <DialogClose className="pricing-lightbox-close" aria-label="Close overlay preview" onClick={event => setViaPointer(event.detail > 0)}><X size={20} aria-hidden="true" /></DialogClose>
          </div>
          <img src="/air-hud/previews/map-veto.jpg" alt="Expanded example of the Valorant map veto overlay, showing each pick, ban and decider." width={1280} height={720} />
        </DialogPrimitive.Content>
      </DialogPortal>}
    </Dialog>
  );
}
