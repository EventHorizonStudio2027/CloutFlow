'use strict';
(function(root){
 const doc=root.document;if(!doc)return;
 function buildSummary(){
  const period=doc.getElementById('period');
  const periodLabel=period&&period.options&&period.selectedIndex>=0?period.options[period.selectedIndex].textContent.trim():'Selected period';
  const read=id=>{const el=doc.getElementById(id);return el?el.textContent.trim():'Unavailable'};
  return [
   'CloutFlow — Creator income overview',
   'Period: '+periodLabel,
   'Currency: USD (other currencies excluded; no automatic FX conversion)',
   'Gross earnings: '+read('grossTotal'),
   'Net earnings: '+read('netTotal'),
   'Paid out: '+read('paidTotal'),
   'Awaiting payout: '+read('pendingTotal'),
   'Source: figures displayed in CloutFlow at time of copy.'
  ].join('\n');
 }
 async function copyText(value){
  if(root.navigator&&root.navigator.clipboard&&typeof root.navigator.clipboard.writeText==='function'){
   await root.navigator.clipboard.writeText(value);return true;
  }
  if(typeof doc.execCommand!=='function'||typeof doc.createElement!=='function')return false;
  const textarea=doc.createElement('textarea');textarea.value=value;textarea.setAttribute('readonly','');textarea.style.position='fixed';textarea.style.opacity='0';
  doc.body.appendChild(textarea);textarea.select();
  let ok=false;try{ok=doc.execCommand('copy')}finally{textarea.remove()}
  return !!ok;
 }
 function init(){
  const button=doc.getElementById('copySummary');if(!button)return;
  button.addEventListener('click',async function(){
   if(button.disabled)return;button.disabled=true;
   try{
    const success=await copyText(buildSummary());
    button.textContent=success?'Copied!':'Copy unavailable';
   }catch(_){button.textContent='Copy unavailable'}
   finally{button.disabled=false}
   button.title='Copy a plain-text USD dashboard summary';
  });
 }
 if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',init);else init();
 root.CloutFlowCopySummary={buildSummary};
})(typeof window!=='undefined'?window:globalThis);
