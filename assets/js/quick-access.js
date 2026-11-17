/* CloutFlow quick-access navigation; no financial data is changed. */
(function(root){
 'use strict';
 const TARGETS=['ledgerSection','accountsSection','reconciliationSection','recurringAgreements','adjustmentsSection','integritySection'];
 const ACTIONS=['addBtn','newPayoutBtn'];
 function init(doc){
  if(!doc)return;
  const bar=doc.querySelector('.quick-access');if(!bar||bar.dataset.ready==='true')return;
  bar.dataset.ready='true';
  bar.addEventListener('click',event=>{
   const button=event.target.closest('button[data-quick-target],button[data-quick-action]');
   if(!button||!bar.contains(button))return;
   const target=button.dataset.quickTarget;
   if(target&&TARGETS.includes(target)){
    const section=doc.getElementById(target);
    if(!section)return;
    section.scrollIntoView({behavior:root.matchMedia&&root.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});
    const heading=section.querySelector('h2,h3,h4');
    if(heading){if(!heading.hasAttribute('tabindex'))heading.setAttribute('tabindex','-1');heading.focus({preventScroll:true});}
   }
   const action=button.dataset.quickAction;
   if(action&&ACTIONS.includes(action)){const source=doc.getElementById(action);if(source&&!source.disabled)source.click();}
  });
 }
 const api={init,TARGETS,ACTIONS};root.CloutFlowQuickAccess=api;
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(root.document){if(root.document.readyState==='loading')root.document.addEventListener('DOMContentLoaded',()=>init(root.document));else init(root.document);}
})(typeof window!=='undefined'?window:globalThis);
