import { ArrowUpRight, CheckCheck, FileSpreadsheet, Hash, MessageCircle, MoreHorizontal } from 'lucide-react';

export default function PricingCoordinationMess({ onResolve }: { onResolve: (viaPointer: boolean) => void }) {
  return (
    <div className="pricing-hosting-preview pricing-hosting-scramble" data-calm="false">
      <div className="pricing-scramble-copy"><p className="pricing-caption">BEHIND THE “QUICK CUP”</p><h3>Three chats.<br />Two schedules.<br />One tired host.</h3><p>The questions keep coming.<br />The match still needs to start.</p><button type="button" className="pricing-noise-action" onClick={event => onResolve(event.detail > 0)}>Give the day a plan<ArrowUpRight size={16} aria-hidden="true" /></button></div>
      <div className="pricing-chat-collage" aria-label="Example Discord, WhatsApp and spreadsheet coordination">
        <article className="pricing-coordination-window pricing-discord-window">
          <header><span className="pricing-discord-label">Discord</span><span><Hash size={13} aria-hidden="true" /> match-day</span><MoreHorizontal size={17} aria-hidden="true" /></header>
          <div className="pricing-discord-body"><div className="pricing-chat-rail" aria-hidden="true"><i>SC</i><span># general</span><span># captains</span><strong># match-day</strong><span># scores</span></div><div className="pricing-discord-thread">
            <div><i className="pricing-chat-avatar">N</i><p><strong>northside<time>17:52</time></strong>are we still starting at 6?</p></div>
            <div><i className="pricing-chat-avatar pricing-chat-avatar-host">H</i><p><strong>host<time>17:53</time></strong>one sec, checking the sheet</p></div>
            <div><i className="pricing-chat-avatar">A</i><p><strong>afterhours<time>17:54</time></strong><em>@host</em> which room are we in?</p></div>
            <span className="pricing-chat-input">Message #match-day</span>
          </div></div>
        </article>
        <article className="pricing-coordination-window pricing-whatsapp-window">
          <header><MessageCircle size={17} aria-hidden="true" /><div><strong>Saturday Cup · Captains</strong><small>WhatsApp</small></div><MoreHorizontal size={17} aria-hidden="true" /></header>
          <div className="pricing-whatsapp-thread"><p><span>northside</span>is the new time in this chat or Discord?<small>17:55</small></p><p className="pricing-whatsapp-outgoing">I’ll send it here too.<small>17:56 <CheckCheck size={12} aria-hidden="true" /></small></p><p><span>afterhours</span>can someone resend the room link?<small>17:57</small></p></div>
        </article>
        <article className="pricing-coordination-window pricing-sheet-window"><header><FileSpreadsheet size={15} aria-hidden="true" /><span>schedule_final_v3.xlsx</span></header><div><span>ROUND 01</span><s>18:00</s><strong>18:30?</strong></div><p>Which version did everyone get?</p></article>
      </div>
    </div>
  );
}
