/* Accessible, non-mutating live validation for creator income entries. */
(function(root){'use strict';
const fields=['gross','fees','refunds','tax'];
const labels={gross:'Gross earnings',fees:'Platform fees',refunds:'Refunds',tax:'Tax withheld',earnedDate:'Earned date',payoutDate:'Payout date',status:'Payment status'};
function cents(value,required){
 const raw=String(value??'').trim();
 if(!raw)return required?null:0;
 if(!/^(?:\d+)(?:\.\d{1,2})?$/.test(raw))return null;
 const [whole,fraction='']=raw.split('.');
 const amount=Number(whole)*100+Number(fraction.padEnd(2,'0'));
 return Number.isSafeInteger(amount)?amount:null;
}
function validDate(value){if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const [y,m,d]=value.split('-').map(Number);const date=new Date(Date.UTC(y,m-1,d));return date.getUTCFullYear()===y&&date.getUTCMonth()===m-1&&date.getUTCDate()===d;}
function evaluate(values){
 const errors=[],fieldErrors={},amounts={};
 const fail=(key,message)=>{fieldErrors[key]=message;errors.push(message)};
 for(const key of fields){const amount=cents(values[key],key==='gross');amounts[key]=amount;if(amount===null)fail(key,`${labels[key]} must be ${key==='gross'?'a positive':'a nonnegative'} amount with no more than 2 decimals.`)}
 if(amounts.gross!==null&&amounts.gross<=0)fail('gross','Gross earnings must be greater than zero.');
 if(fields.every(k=>amounts[k]!==null)&&amounts.fees+amounts.refunds+amounts.tax>amounts.gross)fail('fees','Fees, refunds, and tax cannot exceed gross earnings.');
 const status=values.status||'Pending',payout=values.payoutDate||'',earned=values.earnedDate||'';
 if(!validDate(earned))fail('earnedDate','Enter a valid earned date.');
 if(status==='Paid'&&!payout)fail('payoutDate','Paid earnings require a payout date.');
 if(payout&&!validDate(payout))fail('payoutDate','Enter a valid payout date.');
 if(payout&&status!=='Paid')fail('status','Only Paid earnings can have a payout date.');
 if(payout&&earned&&validDate(payout)&&validDate(earned)&&payout<earned)fail('payoutDate','Payout date cannot precede the earned date.');
 return {valid:errors.length===0,errors,fieldErrors,netCents:fields.every(k=>amounts[k]!==null)?amounts.gross-amounts.fees-amounts.refunds-amounts.tax:null};
}
function mount(doc){const form=doc.getElementById('incomeForm');if(!form)return;
 const feedback=doc.createElement('p');feedback.id='incomeEntryFeedback';feedback.className='income-entry-feedback';feedback.setAttribute('role','status');feedback.setAttribute('aria-live','polite');
 const preview=doc.getElementById('netPreview');preview?.closest('.calculated')?.after(feedback);
 const save=form.querySelector('button[type="submit"]');
 let touched=false;
 function update(){const values={};for(const k of [...fields,'status','earnedDate','payoutDate'])values[k]=doc.getElementById(k)?.value||'';
  const result=evaluate(values),entered=fields.some(k=>values[k].trim());
  feedback.textContent=!entered?'Enter gross earnings to calculate your net.':result.valid?'Amounts and dates look ready to save.':result.errors[0];
  feedback.dataset.state=!entered?'idle':result.valid?'valid':'invalid';
  for(const k of [...fields,'earnedDate','payoutDate','status']){const el=doc.getElementById(k);if(!el)continue;const invalid=(touched||entered)&&Boolean(result.fieldErrors[k]);el.setAttribute('aria-invalid',String(invalid));if(invalid)el.setAttribute('aria-describedby','incomeEntryFeedback');else if(el.getAttribute('aria-describedby')==='incomeEntryFeedback')el.removeAttribute('aria-describedby');}
  if(save){save.setAttribute('aria-describedby','incomeEntryFeedback');save.dataset.validation=result.valid?'ready':'review';}
  return result;
 }
 form.addEventListener('input',()=>{touched=true;update()});form.addEventListener('change',()=>{touched=true;update()});
 form.addEventListener('submit',event=>{const result=update();if(!result.valid){event.preventDefault();event.stopImmediatePropagation();touched=true;update();const first=Object.keys(result.fieldErrors)[0];doc.getElementById(first)?.focus();}} ,true);
 const modal=doc.getElementById('modal');if(modal&&typeof MutationObserver!=='undefined'){const observer=new MutationObserver(()=>{if(modal.classList.contains('show')){touched=false;update()}});observer.observe(modal,{attributes:true,attributeFilter:['class']});}
 update();return {update};
}
if(typeof window!=='undefined'&&window.document){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>mount(document),{once:true});else mount(document);}
const api={cents,validDate,evaluate,mount};root.CloutFlowIncomeEntryAssistant=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
