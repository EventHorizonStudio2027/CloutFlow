/* Spreadsheet-safe CSV export of read-only payout audit findings. */
(function(root){'use strict';
const safe=v=>{let s=String(v??'');if(/^[\s\u0000-\u001f]*[=+@-]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';};
function exportCsv(deposits,audit){
 const rows=[['Finding','Record numbers','Platform','Account','Currency','Reference','Deposit date','Amount']];
 for(const issue of audit.issues||[]){
  if(!issue.indices?.length){rows.push([issue.code,'','','','','','','']);continue;}
  for(const i of issue.indices){
   const p=deposits?.[i]||{};
   rows.push([issue.code,String(i+1),p.platform,p.account,p.currency,p.reference,p.received,p.amount]);
  }
 }
 return '\uFEFF'+rows.map(r=>r.map(safe).join(',')).join('\r\n')+'\r\n';
}
const api={exportCsv};root.CloutFlowPayoutAuditExport=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
