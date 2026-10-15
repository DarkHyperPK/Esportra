/* Broadcast-only bracket rendering. Source results are never advanced here. */
(function(){
  const HUD=window.HUD;if(!HUD)return;const original=HUD.modules.bracket;
  const node=(tag,parent,text,css)=>{const el=document.createElement(tag);if(text!=null)el.textContent=String(text);if(css)Object.assign(el.style,css);parent.appendChild(el);return el;};
  const logo=(parent,url)=>{if(typeof url==='string'&&/^(https:\/\/|http:\/\/localhost:5300\/air-assets\/|\/air-assets\/)/.test(url)){const image=node('img',parent,null,{width:'30px',height:'30px',objectFit:'contain',marginRight:'12px'});image.src=url;image.alt='';image.onerror=()=>image.remove();}};
  HUD.modules.bracket=root=>{
    const sample=HUD.preview?original(root):null;
    const panel=node('div',root,null,{position:'absolute',inset:'0',background:'linear-gradient(125deg,#182132,#101723)',color:'#e9eff7',padding:'100px 110px',boxSizing:'border-box',fontFamily:'Inter,Arial,sans-serif'});
    let last='';return {update(state){const data=state.broadcastBracket;if(HUD.preview&&!data?.stages?.length){panel.style.display='none';sample?.update(state);return;}panel.style.display='block';const signature=JSON.stringify(data);if(signature===last)return;last=signature;panel.replaceChildren();
      const stage=data?.stages?.find(stage=>stage.id===data.view?.stageId);if(!stage){node('div',panel,'BRACKET',{fontSize:'20px',letterSpacing:'5px',color:'#91b7e5'});node('h1',panel,'Bracket not selected',{fontSize:'54px',marginTop:'100px'});node('p',panel,'Choose a published stage or an independent project bracket.',{fontSize:'28px',color:'#b2c1d4'});return;}
      const view=data.view||{},page=view.page||0;node('div',panel,state.event?.name || 'ESPORTRA AIR',{fontSize:'16px',letterSpacing:'5px',color:'#91b7e5'});node('h1',panel,stage.label,{fontSize:'52px',margin:'16px 0 10px',fontWeight:'650'});
      const sides={upper:'Upper bracket',lower:'Lower bracket',final:'Final',group:'Match results',all:'Tournament matches'};
      node('p',panel,`${sides[view.side]||'Tournament matches'}${view.group?' · '+view.group:''} · Page ${page+1}`,{fontSize:'21px',color:'#afbdd0',margin:'0 0 34px'});
      if(view.mode==='standings'&&stage.standings?.length){const table=node('div',panel);for(const row of stage.standings.slice(page*10,page*10+10)){const line=node('div',table,null,{display:'flex',alignItems:'center',gap:'26px',padding:'17px 22px',borderBottom:'1px solid #50617a',fontSize:'25px'});node('span',line,row.rank,{width:'60px',color:'#91b7e5'});node('strong',line,row.teamName,{flex:'1'});node('span',line,`${row.wins??0} W   ${row.losses??0} L`,{width:'200px'});node('span',line,`${row.points??0} pts`);}return;}
      const filtered=(stage.matches||[]).filter(n=>(view.side==='all'||(n.side||'upper')===(view.side||'upper'))&&(!view.group||n.group===view.group)&&n.round>=(view.startRound||0));
      const rounds=[...new Set(filtered.map(n=>n.round))].sort((a,b)=>a-b).slice(0,3);if(!rounds.length){node('p',panel,'No matches in this section.',{fontSize:'32px',marginTop:'120px',color:'#afbdd0'});return;}
      const board=node('div',panel,null,{position:'relative',height:'680px'}),positions=new Map(),width=rounds.length===1?1020:(1700-(rounds.length-1)*70)/rounds.length;
      const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('width','1700');svg.setAttribute('height','680');Object.assign(svg.style,{position:'absolute',inset:'0'});board.appendChild(svg);
      rounds.forEach((round,col)=>{const candidates=filtered.filter(n=>n.round===round);
        const connected=col?candidates.filter(n=>[...positions.values()].some(p=>p.entry.nextMatchId===n.matchId)):[];
        const entries=connected.length?connected.slice(0,8):candidates.slice(page*8,page*8+8);const x=col*(width+70);node('div',board,`ROUND ${round+1}`,{position:'absolute',left:x+'px',top:'0',fontSize:'16px',letterSpacing:'3px',color:'#91b7e5'});
        let previousY=-27;
        entries.forEach((entry,index)=>{const match=(data.matches||[]).find(m=>(m.matchId||m.id)===entry.matchId);const incoming=filtered.filter(n=>n.nextMatchId===entry.matchId).map(n=>positions.get(n.matchId)).filter(Boolean);const desired=incoming.length?incoming.reduce((total,p)=>total+p.y,0)/incoming.length:50+index*77;
          // Reserve room for every remaining card, including off-page connections.
          const y=Math.max(previousY+77,Math.min(50+(8-entries.length+index)*77,desired));previousY=y;
          positions.set(entry.matchId,{x,y,width,entry});const card=node('div',board,null,{position:'absolute',left:x+'px',top:y+'px',width:width+'px',height:'67px',background:'#263449',border:'1px solid #52627b',borderRadius:'7px',overflow:'hidden',boxSizing:'border-box'});
          card.dataset.bracketMatch=entry.matchId;
          [0,1].forEach(side=>{const team=match?.teams?.[side],known=match&&['completed','in_progress'].includes(match.status);const score=match?.scores?.[side] ?? team?.seriesScore;const winner=match?.status==='completed'&&(match.winnerId?match.winnerId===(team?.id||team?.teamId):score> (match.scores?.[1-side]??match.teams?.[1-side]?.seriesScore));const line=node('div',card,null,{height:'33px',display:'flex',alignItems:'center',padding:'0 14px',fontSize:'21px',fontWeight:winner?'700':'500',background:winner?'#354c69':'transparent',color:winner?'#fff':'#d0dbea'});logo(line,team?.logoUrl);node('span',line,team?.name || 'To be decided',{flex:'1',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'});node('strong',line,known&&score!=null?score:'—',{marginLeft:'12px',color:winner?'#a6cdff':'#b8c7d9'});});
        });
      });
      for(const pos of positions.values()){const target=positions.get(pos.entry.nextMatchId);if(!target||target.x<=pos.x)continue;const path=document.createElementNS('http://www.w3.org/2000/svg','path');const middle=(pos.x+pos.width+target.x)/2;path.setAttribute('d',`M${pos.x+pos.width} ${pos.y+33} H${middle} V${target.y+33} H${target.x}`);path.setAttribute('stroke','#7c96b8');path.setAttribute('stroke-width','2');path.setAttribute('fill','none');svg.appendChild(path);}
    }};
  };
})();
