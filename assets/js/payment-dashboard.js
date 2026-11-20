/* Read-only payment reminder summary. Expected payments are never ledger income. */
(function(root){'use strict';
function moneyGroups(rows){
 const totals=new Map();let excluded=0;
 for(const r of rows){
  if(!r||typeof r.currency!=='string'||!/^[A-Z]{3}$/.test(r.currency)||typeof r.remaining!=='number'||!Number.isFinite(r.remaining)||r.remaining<=0||r.remaining>Number.MAX_SAFE_INTEGER/100||Math.abs(r.remaining*100-Math.round(r.remaining*100))>1e-6||!Number.isSafeInteger(Math.round(r.remaining*100))){excluded++;continue;}
  const cents=Math.round(r.remaining*100);const next=(totals.get(r.currency)||0)+cents;
  if(!Number.isSafeInteger(next)){excluded++;continue;}
  totals.set(r.currency,next);
 }
 return {totals:[...totals].sort(([a],[b])=>a.localeCompare(b)).map(([currency,cents])=>({currency,amount:cents/100})),excluded};
}
function summarize(queue,reminders,blocked=false){
 if(blocked)return {blocked:true,overdue:0,dueToday:0,partial:0,reminders:0,attention:0,upcomingWeek:0,upcomingMonth:0,nextDue:null,weekAmounts:[],monthAmounts:[],overdueAmounts:[],excludedAmounts:0};
 const rows=Array.isArray(queue?.rows)?queue.rows:[];
 const active=rows.filter(r=>r&&Number.isFinite(r.remaining)&&r.remaining>0);
 const soon=active.filter(r=>r.status==='upcoming'&&Number.isInteger(r.daysUntilDue)&&r.daysUntilDue>=1&&r.daysUntilDue<=7);
 const month=active.filter(r=>r.status==='upcoming'&&Number.isInteger(r.daysUntilDue)&&r.daysUntilDue>=1&&r.daysUntilDue<=30);
 const overdue=active.filter(r=>r.status==='overdue');
 const next=active.filter(r=>r.status==='upcoming'&&Number.isInteger(r.daysUntilDue)&&r.daysUntilDue>=1&&typeof r.due==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(r.due)).map(r=>r.due).sort()[0]||null;
 const grouped=moneyGroups(soon),monthly=moneyGroups(month),late=moneyGroups(overdue);
 return {blocked:false,overdue:active.filter(r=>r.status==='overdue').length,dueToday:active.filter(r=>r.status==='due-today').length,partial:active.filter(r=>r.partial).length,reminders:Array.isArray(reminders)?reminders.length:0,attention:active.filter(r=>r.status==='overdue'||r.status==='due-today'||r.partial).length,upcomingWeek:soon.length,upcomingMonth:month.length,nextDue:next,weekAmounts:grouped.totals,monthAmounts:monthly.totals,overdueAmounts:late.totals,excludedAmounts:monthly.excluded+late.excluded};
}
function formatGroups(groups){return groups.map(({currency,amount})=>`${new Intl.NumberFormat('en-US',{style:'currency',currency}).format(amount)} ${currency}`).join(' · ');}
function update(doc,data){const el=doc.getElementById('paymentDashboard');if(!el)return;const s=data||summarize(null,null,true);const title=el.querySelector('[data-payment-title]');const detail=el.querySelector('[data-payment-detail]');const button=el.querySelector('[data-payment-open]');if(!title||!detail||!button)return;
 if(s.blocked){title.textContent='Payment review unavailable';detail.textContent='Check agreement, allocation, and follow-up data for errors before reviewing reminders.';button.textContent='Review payment records';el.dataset.state='warning';return}
 const urgent=s.overdue+s.dueToday;
 title.textContent=urgent?`${urgent} overdue or due-today payment${urgent===1?'':'s'} to review`:s.reminders?`${s.reminders} follow-up reminder${s.reminders===1?'':'s'} to review`:s.attention?`${s.attention} expected payment${s.attention===1?'':'s'} need review`:s.upcomingWeek?`${s.upcomingWeek} expected payment${s.upcomingWeek===1?'':'s'} due within 7 days`:'No urgent payment reminders';
 const amounts=s.weekAmounts?.length?` Upcoming 7-day outstanding amounts: ${formatGroups(s.weekAmounts)}.`:'';
 const monthly=s.monthAmounts?.length?` Next 30-day outstanding amounts: ${formatGroups(s.monthAmounts)}.`:'';
 const late=s.overdueAmounts?.length?` Overdue outstanding amounts: ${formatGroups(s.overdueAmounts)}.`:'';
 const skipped=s.excludedAmounts?` ${s.excludedAmounts} installment amount(s) omitted from totals due to invalid currency or amount.`:'';
 detail.textContent=`${s.overdue} overdue · ${s.dueToday} due today · ${s.partial} partially allocated · ${s.reminders} follow-up reminder${s.reminders===1?'':'s'} due · ${s.upcomingWeek||0} due in the next 7 days · ${s.upcomingMonth||0} due in the next 30 days.${s.nextDue?' Next expected date: '+s.nextDue+'.':''}${amounts}${monthly}${late}${skipped} Counts may overlap; expected payments are not earned revenue.`;
 button.textContent='Review agreements & follow-ups';el.dataset.state=urgent||s.reminders?'urgent':s.attention||s.upcomingWeek?'attention':'clear';
}
function mount(doc){const el=doc.getElementById('paymentDashboard');if(!el)return;el.querySelector('[data-payment-open]')?.addEventListener('click',()=>{const target=doc.getElementById('recurringAgreements');if(!target)return;target.scrollIntoView({behavior:'smooth',block:'start'});target.setAttribute('tabindex','-1');target.focus({preventScroll:true})});}
const api={summarize,update,mount,moneyGroups};root.CloutFlowPaymentDashboard=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
