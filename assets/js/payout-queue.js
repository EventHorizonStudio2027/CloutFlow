/* CloutFlow: read-only deposit reconciliation attention queue. */
(function(root){
 'use strict';
 const cents=value=>Math.round(Number(value)*100);
 function pending(payouts){
  return payouts.map(p=>{
   const deposit=cents(p.amount);
   const allocated=(p.allocations||[]).reduce((sum,a)=>sum+cents(a.amount),0);
   return {...p,allocated:allocated/100,remaining:Math.max(0,deposit-allocated)/100};
  }).filter(p=>p.remaining>=0.01).sort((a,b)=>a.received.localeCompare(b.received)||String(a.id).localeCompare(String(b.id)));
 }
 function totals(rows){const grouped=new Map();for(const p of rows){const code=p.currency||'USD';const group=grouped.get(code)||{currency:code,count:0,cents:0};group.count++;group.cents+=cents(p.remaining);grouped.set(code,group)}return [...grouped.values()].sort((a,b)=>a.currency.localeCompare(b.currency)).map(g=>({currency:g.currency,count:g.count,remaining:g.cents/100}));}
 const api={pending,totals};root.CloutFlowPayoutQueue=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
