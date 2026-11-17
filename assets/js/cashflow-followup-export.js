/* Export the visible payment-attention queue without modifying ledger or settlements. */
(function(root){'use strict';
const headings=['Due date','Agreement','Currency','Expected amount','Allocated amount','Remaining amount','Status','Partially allocated','Days until due'];
function cell(value){let s=String(value??'');if(/^[\s\uFEFF]*[=+@\-\t\r]/u.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"'}
function csv(queue){if(!queue||!Array.isArray(queue.rows))throw Error('Invalid payment queue');const lines=[headings];for(const r of queue.rows){if(!/^\d{4}-\d{2}-\d{2}$/.test(r.due)||!Number.isFinite(r.remaining)||!Number.isFinite(r.allocated)||!Number.isFinite(r.amount))throw Error('Invalid installment');lines.push([r.due,r.name,r.currency,r.amount.toFixed(2),r.allocated.toFixed(2),r.remaining.toFixed(2),r.status,r.partial?'Yes':'No',r.daysUntilDue]);}return '\uFEFF'+lines.map(row=>row.map(cell).join(',')).join('\r\n')+'\r\n'}
function filename(today,filter){if(!/^\d{4}-\d{2}-\d{2}$/.test(today)||!/^[a-z-]+$/.test(filter))throw Error('Invalid export metadata');return `cloutflow-payment-attention-${filter}-${today}.csv`}
const api={csv,filename};root.CloutFlowCashflowFollowupExport=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
