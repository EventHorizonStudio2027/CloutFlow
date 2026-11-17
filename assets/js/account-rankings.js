/* Read-only rankings for individual creator accounts. Never combines currencies. */
(function(root){
 'use strict';
 function summarize(earned,adjustments,netFn){
  const groups=new Map();
  function group(item){
   if(!item||!item.platform||!item.account||!item.currency)return null;
   const key=JSON.stringify([item.currency,item.platform,item.account]);
   if(!groups.has(key))groups.set(key,{currency:item.currency,platform:item.platform,account:item.account,earnings:0,adjustments:0,transactions:0});
   return groups.get(key);
  }
  for(const e of earned){const g=group(e);if(g){g.earnings+=Number(netFn(e))||0;g.transactions++}}
  for(const a of adjustments){const g=group(a);if(g)g.adjustments+=Number(a.amount)||0}
  return [...groups.values()].map(g=>({...g,adjustedNet:g.earnings+g.adjustments})).sort((a,b)=>a.currency.localeCompare(b.currency)||b.adjustedNet-a.adjustedNet||a.platform.localeCompare(b.platform)||a.account.localeCompare(b.account));
 }
 function analyze(rows){
  const positiveTotal=rows.reduce((n,r)=>n+Math.max(0,r.adjustedNet),0);
  const positive=rows.filter(r=>r.adjustedNet>0).sort((a,b)=>b.adjustedNet-a.adjustedNet);
  return {positiveTotal,leader:positive[0]||null,leaderShare:positiveTotal?positive[0].adjustedNet/positiveTotal*100:null,shares:rows.map(r=>({platform:r.platform,account:r.account,share:positiveTotal?Math.max(0,r.adjustedNet)/positiveTotal*100:null}))};
 }
 const api={summarize,analyze};root.AccountRankings=api;
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
