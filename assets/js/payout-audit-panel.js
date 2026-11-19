/* Read-only, accessible payout audit panel. No ledger mutations. */
(function(root){'use strict';
function update(doc,payouts){
 const panel=doc.getElementById('payoutAuditPanel');if(!panel)return;
 const result=root.CloutFlowReconciliationAudit.audit(payouts);
 const title=panel.querySelector('[data-audit-title]');
 const detail=panel.querySelector('[data-audit-detail]');
 const list=panel.querySelector('[data-audit-list]');
 if(!title||!detail||!list)return;
 const count=result.issues.length;
 title.textContent=count?`${count} payout audit finding${count===1?'':'s'}`:'Payout audit: no issues detected';
 detail.textContent=`${result.summary.checked} recorded deposits checked · ${result.summary.invalid} record validation findings · ${result.summary.duplicateGroups} repeated reference groups. Findings are advisory; no records were changed.`;
 list.replaceChildren();
 for(const issue of result.issues){
  const li=doc.createElement('li');
  const label={'invalid-input':'Payout collection is unavailable','invalid-record':'Malformed payout record','invalid-amount':'Invalid deposit amount','invalid-date':'Invalid deposit date','missing-identity':'Missing platform or currency','repeated-reference':'Repeated deposit reference'}[issue.code]||'Unknown finding';
  li.textContent=`${label} (record ${issue.indices.map(i=>i+1).join(', ')||'unknown'})`;
  list.appendChild(li);
 }
 panel.dataset.state=count?'warning':'clear';
}
const api={update};root.CloutFlowPayoutAuditPanel=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
