/* CloutFlow: read-only deposit reconciliation attention queue. */
(function(root){
 'use strict';
 const cents=value=>Math.round(Number(value)*100);
 function validDate(value){if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const date=new Date(value+'T00:00:00Z');return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value}
 function validMoney(value){const amount=typeof value==='number'?value:typeof value==='string'&&value.trim()?Number(value):NaN;return Number.isFinite(amount)&&amount>=0&&amount<=Number.MAX_SAFE_INTEGER/100&&Math.abs(amount*100-Math.round(amount*100))<1e-6}
 function pending(payouts){
  if(!Array.isArray(payouts))return [];
  return payouts.filter(p=>p&&typeof p==='object'&&!Array.isArray(p)&&validDate(p.received)&&validMoney(p.amount)&&(!p.currency||/^[A-Z]{3}$/.test(p.currency))&&(!p.allocations||Array.isArray(p.allocations))&&(p.allocations||[]).every(a=>a&&validMoney(a.amount))).map(p=>{
   const deposit=cents(p.amount);
   const allocated=(p.allocations||[]).reduce((sum,a)=>sum+cents(a.amount),0);
   const overallocated=allocated>deposit;
   return {...p,allocated:allocated/100,remaining:Math.max(0,deposit-allocated)/100,overallocated};
  }).filter(p=>p.remaining>=0.01||p.overallocated).sort((a,b)=>a.received.localeCompare(b.received)||String(a.id).localeCompare(String(b.id)));
 }
 function totals(rows){const grouped=new Map();for(const p of rows){const code=p.currency||'USD';const group=grouped.get(code)||{currency:code,count:0,overallocated:0,cents:0};if(p.remaining>=0.01){group.count++;group.cents+=cents(p.remaining)}if(p.overallocated)group.overallocated++;grouped.set(code,group)}return [...grouped.values()].sort((a,b)=>a.currency.localeCompare(b.currency)).map(g=>({currency:g.currency,count:g.count,overallocated:g.overallocated,remaining:g.cents/100}));}
 const api={pending,totals,validDate,validMoney};root.CloutFlowPayoutQueue=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
