/* Read-only cash-flow attention summary. Expected payments are not recognized earnings. */
(function(root){'use strict';
const dateOk=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
const shift=(date,days)=>{const d=new Date(date+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10)};
function summarize(agreements,payouts,links,agreementApi,settlementApi,today){
 if(!dateOk(today))throw Error('Invalid reporting date');
 const due=agreementApi.schedule(agreements,shift(today,-90),shift(today,90));
 const report=settlementApi.reconcile(due,payouts,links);
 const groups=new Map();
 for(const d of due){const expected=Math.round(d.amount*100),allocated=Math.min(expected,Math.max(0,report.paid.get(settlementApi.installmentKey(d.id,d.due))||0));const remaining=expected-allocated;
  const state=remaining===0?'allocated':d.due<today?'overdue':d.due===today?'due-today':'upcoming';
  const group=groups.get(d.currency)||{currency:d.currency,expectedCents:0,allocatedCents:0,outstandingCents:0,overdueCents:0,upcomingCents:0,installments:0,overdueCount:0};
  group.expectedCents+=expected;group.allocatedCents+=allocated;group.outstandingCents+=remaining;group.installments++;
  if(state==='overdue'){group.overdueCents+=remaining;group.overdueCount++}else if(state==='upcoming'||state==='due-today')group.upcomingCents+=remaining;
  groups.set(d.currency,group);
 }
 const rows=due.map(d=>{const expected=Math.round(d.amount*100),allocated=Math.min(expected,Math.max(0,report.paid.get(settlementApi.installmentKey(d.id,d.due))||0));return {...d,allocated:allocated/100,remaining:(expected-allocated)/100,status:allocated>=expected?'allocated':d.due<today?'overdue':d.due===today?'due-today':'upcoming'}});
 return {rows,groups:[...groups.values()].sort((a,b)=>a.currency.localeCompare(b.currency)),issues:report.issues,windowStart:shift(today,-90),windowEnd:shift(today,90)};
}
const api={summarize,shift};root.CloutFlowCreatorCashflow=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
