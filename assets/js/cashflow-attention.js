/* Read-only installment attention queue. No predicted earnings or automatic settlement. */
(function(root){'use strict';
const DAY=86400000;
function build(summary,today,filter='attention'){
 if(!summary||!Array.isArray(summary.rows)||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(today)||!Number.isFinite(Date.parse(today+'T00:00:00Z')))throw Error('Invalid cash-flow queue input');
 const valid=['attention','all','overdue','due-today','upcoming','allocated'];if(!valid.includes(filter))throw Error('Invalid attention filter');
 const base=Date.parse(today+'T00:00:00Z');
 const rows=summary.rows.map(r=>{const days=Math.round((Date.parse(r.due+'T00:00:00Z')-base)/DAY);const partial=r.allocated>0&&r.remaining>0;const priority=r.status==='overdue'?0:r.status==='due-today'?1:partial?2:r.status==='upcoming'?3:4;return {...r,daysUntilDue:days,partial,priority};});
 const counts={all:rows.length,overdue:0,'due-today':0,upcoming:0,allocated:0,attention:0};
 for(const r of rows){if(Object.hasOwn(counts,r.status))counts[r.status]++;if(r.remaining>0&&(r.status==='overdue'||r.status==='due-today'||r.partial))counts.attention++;}
 const selected=rows.filter(r=>filter==='all'||filter==='attention'?(filter==='all'||(r.remaining>0&&(r.status==='overdue'||r.status==='due-today'||r.partial))):r.status===filter);
 selected.sort((a,b)=>a.priority-b.priority||a.due.localeCompare(b.due)||String(a.name).localeCompare(String(b.name))||String(a.id).localeCompare(String(b.id)));
 return {rows:selected,counts,filter,issues:Array.isArray(summary.issues)?summary.issues.length:0};
}
const api={build};root.CloutFlowCashflowAttention=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
