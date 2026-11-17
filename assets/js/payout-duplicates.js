/* CloutFlow: advisory duplicate-deposit detection, no automatic financial mutations. */
(function(root){
 'use strict';
 const norm=s=>String(s??'').trim().toLocaleLowerCase('en-US');
 const cents=n=>Math.round(Number(n)*100);
 function candidates(draft,records){
  if(!draft||!Array.isArray(records)||!draft.platform||!draft.received||!draft.currency||!Number.isFinite(Number(draft.amount))||Number(draft.amount)<=0)return [];
  return records.filter(p=>p.id!==draft.id&&norm(p.platform)===norm(draft.platform)&&norm(p.account)===norm(draft.account)&&norm(p.currency)===norm(draft.currency)&&p.received===draft.received&&cents(p.amount)===cents(draft.amount)).map(p=>({id:p.id,reference:p.reference||'',received:p.received,amount:Number(p.amount)}));
 }
 const api={candidates};root.CloutFlowPayoutDuplicates=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
