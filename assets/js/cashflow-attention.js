/* Read-only installment attention queue. No predicted earnings or automatic settlement. */
(function(root){'use strict';
const DAY=86400000;
const validDate=value=>{if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const date=new Date(value+'T00:00:00Z');return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value};
const cents=value=>{const amount=Number(value);return value!==null&&value!==''&&Number.isFinite(amount)&&amount>=0&&amount<=Number.MAX_SAFE_INTEGER/100?Math.round(amount*100):null};
function build(summary,today,filter='attention'){
 if(!summary||!Array.isArray(summary.rows)||!validDate(today))throw Error('Invalid cash-flow queue input');
 const valid=['attention','all','overdue','due-today','upcoming','allocated'];if(!valid.includes(filter))throw Error('Invalid attention filter');
 const base=Date.parse(today+'T00:00:00Z'),invalid=[];
 const rows=summary.rows.flatMap((r,index)=>{
  if(!r||typeof r!=='object'||!validDate(r.due)||cents(r.allocated)===null||cents(r.remaining)===null||!/^([A-Z]{3})$/.test(String(r.currency||''))){invalid.push(index);return []}
  const allocatedCents=cents(r.allocated),remainingCents=cents(r.remaining);
  const days=Math.round((Date.parse(r.due+'T00:00:00Z')-base)/DAY);
  const partial=allocatedCents>0&&remainingCents>0;
  const status=remainingCents===0?'allocated':r.due<today?'overdue':r.due===today?'due-today':'upcoming';
  const priority=status==='overdue'?0:status==='due-today'?1:partial?2:status==='upcoming'?3:4;
  return [{...r,status,allocated:allocatedCents/100,remaining:remainingCents/100,daysUntilDue:days,partial,priority}];
 });
 const counts={all:rows.length,overdue:0,'due-today':0,upcoming:0,allocated:0,attention:0};
 for(const r of rows){counts[r.status]++;if(r.remaining>0&&(r.status==='overdue'||r.status==='due-today'||r.partial))counts.attention++;}
 const selected=rows.filter(r=>filter==='all'||(filter==='attention'?(r.remaining>0&&(r.status==='overdue'||r.status==='due-today'||r.partial)):r.status===filter));
 selected.sort((a,b)=>a.priority-b.priority||a.due.localeCompare(b.due)||String(a.name).localeCompare(String(b.name))||String(a.id).localeCompare(String(b.id)));
 return {rows:selected,counts,filter,issues:(Array.isArray(summary.issues)?summary.issues.length:0)+invalid.length,invalidRows:invalid.length};
}
const api={build,validDate};root.CloutFlowCashflowAttention=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
