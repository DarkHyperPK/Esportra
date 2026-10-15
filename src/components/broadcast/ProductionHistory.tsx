import { useState } from "react";
import { CommandSection } from "@/components/management/CommandSurface";
import { InlineNotice } from "@/components/ui/kit/InlineNotice";
import { useBroadcastTimeline } from "@/hooks/useBroadcastTimeline";
import type { ProductionTimelineItem } from "@/hooks/useBroadcastTimeline";
const ACTIONS: Record<string,string> = {manual_take:"Manual scene take",hold:"Held next item",skip:"Skipped item",take_requested:"Take requested",resume:"Production resumed",technical_pause:"Technical pause",timeout_started:"Team timeout",timeout_ended:"Timeout ended",data_fixed:"Data fixed on air",data_fix_queued:"Data fix queued · on-air update failed",obs_drop:"OBS disconnected",stale_feed:"Game feed stale",output_drop:"Browser output disconnected"};
function kind(item: ProductionTimelineItem) { return item.eventType === "SegmentTake" ? item.actorKind === "automation" ? "automatic" : item.actorKind === "operator" ? "manual" : "unknown" : item.action === "manual_take" ? "manual" : item.action === "hold" ? "hold" : "other"; }
function label(item: ProductionTimelineItem) { return item.eventType === "SegmentTake" ? `${item.actorKind === "automation" ? "Automatic" : item.actorKind === "operator" ? "Manual" : "Recorded"} take · ${item.segmentName || "Show item"}` : ACTIONS[item.action || item.kind || ""] || "Production record"; }
const colours = { automatic:"bg-emerald-400", manual:"bg-blue-400", hold:"bg-amber-400", unknown:"bg-zinc-500" };
export function ProductionHistory({ showId }: { showId: string }) {
  const query = useBroadcastTimeline(showId), [selected, setSelected] = useState<number | null>(null);
  const items = query.data?.items || [], since = Date.parse(query.data?.since || "") || Date.now()-3600000;
  const bins = Array.from({length:60},(_,index)=>({time:since+index*60000,automatic:0,manual:0,hold:0,unknown:0}));
  items.forEach(item=>{const index=Math.min(59,Math.floor((Date.parse(item.at)-since)/60000)),type=kind(item);if(index>=0&&type!=="other")bins[index][type]++;});
  const max=Math.max(1,...bins.map(bin=>bin.automatic+bin.manual+bin.hold+bin.unknown));
  const incidents=items.filter(item=>item.eventType==="ProductionIncident"||["data_fixed","data_fix_queued"].includes(item.action||""));
  return <CommandSection>
    <h2 className="text-lg font-semibold text-white">The last hour of production</h2><p className="mt-2 text-sm text-zinc-400">Acknowledged records across this show’s nodes. Offline events appear after delivery. Older records may lack a take source.</p>
    {query.isError ? <InlineNotice tone="warning">Timeline unavailable. Existing recorded activity remains below.</InlineNotice> : query.isLoading ? <p className="mt-4 text-zinc-400">Loading timeline…</p> : <>
      <div className="mt-6 flex flex-wrap gap-6 text-xs"><span className="text-emerald-400">Automatic takes</span><span className="text-blue-400">Manual takes</span><span className="text-amber-400">Holds</span><span className="text-zinc-500">Source unavailable</span></div>
      <div className="mt-6 flex h-28 items-end gap-0.5 border-b border-white/20" aria-label="Sixty-minute production timeline">{bins.map((bin,index)=><button key={index} className="flex h-full min-w-0 flex-1 flex-col-reverse justify-start focus-visible:outline focus-visible:outline-2 focus-visible:outline-rose-400" aria-label={`${60-index} minutes ago: ${bin.automatic} automatic takes, ${bin.manual} manual takes, ${bin.hold} holds`} title={`${new Date(bin.time).toLocaleTimeString()} · ${bin.automatic} automatic · ${bin.manual} manual · ${bin.hold} holds`} onClick={()=>setSelected(index)}>{(Object.keys(colours) as Array<keyof typeof colours>).map(type=><span key={type} className={colours[type]} style={{height:`${bin[type]/max*80}px`}} />)}</button>)}</div>
      <div className="mt-2 flex justify-between text-xs text-zinc-500"><span>60 minutes ago</span><span>45</span><span>30</span><span>15</span><span>Now</span></div>
      {selected!==null&&<p className="mt-4 text-sm text-zinc-300" role="status">{new Date(bins[selected].time).toLocaleTimeString()}: {bins[selected].automatic} automatic takes, {bins[selected].manual} manual takes, {bins[selected].hold} holds.</p>}
      {query.data?.truncated&&<p className="mt-4 text-sm text-amber-400">Showing the latest 5,000 records in this hour.</p>}
      <h3 className="mt-8 border-t border-white/10 pt-6 text-base font-semibold text-white">Incidents &amp; data fixes</h3>{!incidents.length&&<p className="mt-3 text-sm text-zinc-500">No acknowledged incidents in the last hour.</p>}
      <ul className="mt-4 divide-y divide-white/10">{incidents.slice(-50).reverse().map(item=><li key={item.id} className="grid gap-2 py-4 text-sm md:grid-cols-[100px_1fr_200px]"><time className="text-zinc-500">{new Date(item.at).toLocaleTimeString()}</time><span className="text-zinc-200">{label(item)}{item.status==="resolved"?" · recovered":""}</span><span className="text-zinc-500">{item.nodeName||"Node"} · {item.actorKind.split("_").join(" ")}</span></li>)}</ul>
    </>}
  </CommandSection>;
}
