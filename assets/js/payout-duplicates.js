/* CloutFlow: advisory duplicate-deposit detection, no automatic financial mutations. */
(function(root){
 'use strict';
 const norm=s=>String(s??'').trim().toLocaleLowerCase('en-US');
 const dateValid=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
 const cents=n=>typeof n==='number'&&Number.isFinite(n)&&n>0&&n<=Number.MAX_SAFE_INTEGER/100&&Math.abs(n*100-Math.round(n*100))<1e-6?Math.round(n*100):null;
 function valid(p){return !!p&&typeof p==='object'&&!Array.isArray(p)&&typeof p.id==='string'&&p.id.trim().length>0&&typeof p.platform==='string'&&p.platform.trim().length>0&&typeof p.account==='string'&&typeof p.currency==='string'&&/^[A-Z]{3}$/.test(p.currency)&&dateValid(p.received)&&cents(p.amount)!==null}
 function candidates(draft,records){
  // A new, unsaved payout has no ID yet; assign a temporary ID for validation only.
  if(!draft||typeof draft!=='object'||!Array.isArray(records))return [];
  const candidateDraft={...draft,id:typeof draft.id==='string'&&draft.id.trim()?draft.id:'__unsaved_payout__'};
  if(!valid(candidateDraft))return [];
  return records.filter(p=>valid(p)&&p.id!==draft.id&&norm(p.platform)===norm(draft.platform)&&norm(p.account)===norm(draft.account)&&p.currency===draft.currency&&p.received===draft.received&&cents(p.amount)===cents(draft.amount)).map(p=>({id:p.id,reference:typeof p.reference==='string'?p.reference:'',received:p.received,amount:p.amount}));
 }
 const api={candidates,valid,dateValid,cents};root.CloutFlowPayoutDuplicates=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
