/* Export only read-only monthly net earned income, not goal attribution. */
(function(root){'use strict';
function cell(v){return '"'+String(v??'').replace(/"/g,'""')+'"';}
function build(report){const currencies=Array.isArray(report?.currencies)?report.currencies:[];const rows=Array.isArray(report?.rows)?report.rows:[];const header=['Earned month',...currencies.map(c=>`${c} net earned income`),'Valid earning entries'];const body=rows.map(row=>[row.month,...currencies.map(c=>{const v=(row.amounts||[]).find(a=>a.currency===c);return v?.hasData?Number(v.amount).toFixed(2):'';}),row.records]);return '\uFEFF'+[header,...body].map(row=>row.map(cell).join(',')).join('\r\n')+'\r\n';}
const api={build};root.CloutFlowGrowthHistoryExport=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
