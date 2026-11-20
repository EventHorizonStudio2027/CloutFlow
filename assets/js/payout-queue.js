/* CloutFlow: read-only deposit reconciliation attention queue. */
(function(root){
 'use strict';
 const cents=value=>Math.round(Number(value)*100);
 function pending(payouts){
  if(!Array.isArray(payouts))return [];
  return payouts.filter(p=>p&&typeof p==='object'&&!Array.isArray(p)&&typeof p.received==='string'&&Number.isFinite(Number(p.amount))&&Number(p.amount)>=0&&(!p.allocations||Array.isArray(p.allocations))&&(p.allocations||[]).every(a=>a&&Number.isFinite(Number(a.amount))&&Number(a.amount)>=0)).map(p=>{
   const deposit=cents(p.amount);
   const allocated=(p.allocations||[]).reduce((sum,a)=>sum+cents(a.amount),0);
   return {...p,allocated:allocated/100,remaining:Math.max(0,deposit-allocated)/100};
  }).filter(p=>p.remaining>=0.01).sort((a,b)=>a.received.localeCompare(b.received)||String(a.id).localeCompare(String(b.id)));
 }
 function totals(rows){const grouped=new Map();for(const p of rows){const code=p.currency||'USD';const group=grouped.get(code)||{currency:code,count:0,cents:0};group.count++;group.cents+=cents(p.remaining);grouped.set(code,group)}return [...grouped.values()].sort((a,b)=>a.currency.localeCompare(b.currency)).map(g=>({currency:g.currency,count:g.count,remaining:g.cents/100}));}
 const api={pending,totals};root.CloutFlowPayoutQueue=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
