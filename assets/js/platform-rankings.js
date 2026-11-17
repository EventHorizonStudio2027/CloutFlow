/* Platform rankings: currency-isolated, adjusted net revenue; deposits excluded. */
(function(root){
 'use strict';
 function summarize(earned,adjustments,netFn){
  const groups=new Map();
  function get(platform,currency){const k=JSON.stringify([platform,currency]);if(!groups.has(k))groups.set(k,{platform,currency,earnings:0,adjustments:0,transactions:0});return groups.get(k)}
  for(const e of earned){if(!e.platform||!e.currency)continue;const g=get(e.platform,e.currency);g.earnings+=Number(netFn(e))||0;g.transactions++}
  for(const a of adjustments){if(!a.platform||!a.currency)continue;get(a.platform,a.currency).adjustments+=Number(a.amount)||0}
  return [...groups.values()].map(g=>({...g,adjustedNet:g.earnings+g.adjustments})).sort((a,b)=>a.currency.localeCompare(b.currency)||b.adjustedNet-a.adjustedNet||a.platform.localeCompare(b.platform));
 }
 function analyze(rows){
  const positive=rows.reduce((sum,row)=>sum+Math.max(0,Number(row.adjustedNet)||0),0);
  const ranked=[...rows].sort((a,b)=>b.adjustedNet-a.adjustedNet||a.platform.localeCompare(b.platform));
  const leaders=ranked.filter(r=>r.adjustedNet>0);
  const share=value=>positive>0?Math.max(0,value)/positive*100:null;
  return {positiveTotal:positive,leader:leaders[0]||null,leaderShare:leaders.length?share(leaders[0].adjustedNet):null,topThreeShare:leaders.length?share(leaders.slice(0,3).reduce((n,r)=>n+r.adjustedNet,0)):null,shares:new Map(rows.map(r=>[r.platform,share(r.adjustedNet)]))};
 }
 const api={summarize,analyze};root.PlatformRankings=api;
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
