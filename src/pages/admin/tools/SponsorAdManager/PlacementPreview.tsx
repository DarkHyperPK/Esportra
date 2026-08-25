import React from 'react';
import { X } from 'lucide-react';
import { type Placement } from '@/hooks/useAdminPlacements';
import { ZONE_META } from './types';

interface Props {
 open: boolean;
 onClose: () => void;
 placements: Placement[];
 tournamentName: string;
}

export const PlacementPreview: React.FC<Props> = ({ open, onClose, placements, tournamentName }) => {
 if (!open) return null;

 const sidebar = placements.filter(p => p.placementZone === 'sidebar_partner');
 const wide = placements.filter(p => p.placementZone === 'wide_partner');
 const logos = placements.filter(p => p.placementZone === 'partner_logo');

 return (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={onClose}>
   <div className="bg-zinc-950 border border-zinc-800 w-full max-w-5xl max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
    <div className="flex items-center justify-between p-4 border-b border-zinc-800 sticky top-0 bg-zinc-950 z-10">
     <div>
      <h3 className="text-lg font-bold text-white">Page Preview</h3>
      <p className="text-xs text-zinc-500">{tournamentName} — Tournament Detail Page</p>
     </div>
     <button onClick={onClose} className="p-1.5 hover:bg-zinc-800 "><X className="w-5 h-5 text-zinc-400" /></button>
    </div>

    <div className="p-6">
     {/* Simulated tournament page layout */}
     <div className="border border-zinc-800 overflow-hidden">
      {/* Hero placeholder */}
      <div className="bg-gradient-to-b from-zinc-800 to-zinc-900 h-32 flex items-center justify-center">
       <span className="text-zinc-600 text-sm font-mono uppercase">{tournamentName} — Hero Banner</span>
      </div>

      {/* Content area */}
      <div className="p-6 grid grid-cols-12 gap-6">
       {/* Sidebar */}
       <div className="col-span-3 space-y-4">
        <div className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest mb-2">Sidebar Partners</div>
        {sidebar.length > 0 ? sidebar.slice(0, 2).map(p => (
         <PreviewSlot key={p.id} placement={p} aspect="aspect-[1/2]" />
        )) : (
         <EmptySlot label="Sidebar Partner" aspect="aspect-[1/2]" />
        )}
       </div>

       {/* Main content */}
       <div className="col-span-9 space-y-6">
        {/* Content placeholder */}
        <div className="bg-zinc-900 border border-zinc-800  p-4 h-24 flex items-center justify-center">
         <span className="text-zinc-700 text-xs font-mono">Tournament Description + Details</span>
        </div>

        {/* Wide partners 2x2 */}
        <div>
         <div className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest mb-3">Tournament Partners</div>
         <div className="grid grid-cols-2 gap-3">
          {wide.length > 0 ? wide.slice(0, 4).map(p => (
           <PreviewSlot key={p.id} placement={p} aspect="aspect-video" />
          )) : Array.from({ length: 4 }).map((_, i) => (
           <EmptySlot key={i} label="Wide Partner" aspect="aspect-video" />
          ))}
         </div>
        </div>

        {/* Logo row */}
        <div>
         <div className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest mb-3">Partner Logos</div>
         <div className="flex items-center gap-6 py-4 border-t border-zinc-800">
          {logos.length > 0 ? logos.slice(0, 4).map(p => (
           <div key={p.id} className="flex-shrink-0">
            <img
             src={p.logoUrl || p.sponsorLogoUrl || undefined}
             alt={p.sponsorName}
             className="h-8 w-auto object-contain"
            />
           </div>
          )) : Array.from({ length: 4 }).map((_, i) => (
           <div key={i} className="h-8 w-16 bg-zinc-800  animate-pulse" />
          ))}
         </div>
        </div>
       </div>
      </div>
     </div>

     {/* Legend */}
     <div className="mt-4 flex flex-wrap gap-4 text-xs text-zinc-500">
      {Object.entries(ZONE_META).filter(([_, m]) => !m.isGlobal).map(([key, meta]) => {
       const count = placements.filter(p => p.placementZone === key).length;
       return (
        <span key={key} className="flex items-center gap-1.5">
         <span className={`w-2 h-2 rounded-full ${count > 0 ? 'bg-emerald-400' : 'bg-zinc-700'}`} />
         {meta.label}: {count}/{meta.maxSlots}
        </span>
       );
      })}
     </div>
    </div>
   </div>
  </div>
 );
};

const PreviewSlot: React.FC<{ placement: Placement; aspect: string }> = ({ placement, aspect }) => {
 const image = placement.bannerUrl || placement.logoUrl || placement.sponsorLogoUrl;
 return (
  <div className={`${aspect} bg-zinc-900 border border-zinc-700  overflow-hidden relative group`}>
   {image ? (
    <img src={image} alt={placement.sponsorName} className="absolute inset-0 w-full h-full object-contain p-3" />
   ) : (
    <div className="absolute inset-0 flex items-center justify-center">
     <span className="text-xs text-zinc-500 font-medium">{placement.sponsorName}</span>
    </div>
   )}
   <div className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/60  text-[8px] text-zinc-400 font-mono">
    {placement.sponsorName}
   </div>
  </div>
 );
};

const EmptySlot: React.FC<{ label: string; aspect: string }> = ({ label, aspect }) => (
 <div className={`${aspect} border border-dashed border-zinc-800  flex items-center justify-center`}>
  <span className="text-[10px] text-zinc-700 font-mono uppercase">{label}</span>
 </div>
);
