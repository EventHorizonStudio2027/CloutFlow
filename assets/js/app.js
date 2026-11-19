'use strict';
const KEY='creatorLedgerData_v2',LEGACY='creatorLedgerEntries';
const catalogs={stream:{'YouTube':['Ad revenue','Channel memberships','Super Chat','Super Stickers','Super Thanks','Merch','Sponsorship','Other'],'Twitch':['Subscriptions','Gifted subscriptions','Bits / cheers','Tips / donations','Ad revenue','Sponsorship','Other'],'TikTok':['LIVE gifts','Creator rewards','Subscriptions','TikTok Shop','Affiliate commissions','Sponsorship','Other'],'Kick':['Subscriptions','Tips / donations','Sponsorship','Other'],'Facebook':['Stars','Subscriptions','Video ads','Brand deals','Other'],'Instagram':['Gifts','Subscriptions','Badges','Affiliate commissions','Sponsorship','Other'],'Patreon':['Memberships','One-time payments','Merch','Other'],'X':['Subscriptions','Tips','Revenue sharing','Other'],'Substack':['Paid subscriptions','Other'],'Discord':['Server subscriptions','Other'],'Other streaming / social':['Tips / donations','Subscriptions','Ad revenue','Sponsorship','Other']},app:{'Apple App Store':['Paid downloads','In-app purchases','Subscriptions','Advertising','Other'],'Google Play':['Paid downloads','In-app purchases','Subscriptions','Advertising','Other'],'Other app store':['Paid downloads','In-app purchases','Subscriptions','Advertising','Other']},commerce:{'Shopify':['Merch sales','Digital products','Subscriptions','Other'],'Fourthwall':['Merch sales','Memberships','Digital products','Other'],'Etsy':['Product sales','Digital products','Other'],'Ko-fi':['Tips / donations','Memberships','Commissions','Shop sales','Other'],'Buy Me a Coffee':['Tips / donations','Memberships','Other'],'Amazon Associates':['Affiliate commissions','Other'],'Direct / other':['Sponsorship','Tips / donations','Affiliate commissions','Merchandise','Licensing','Other']}};
const $=id=>document.getElementById(id),today=()=>{const d=new Date();return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10)},num=v=>{let n=Number(v);return Number.isFinite(n)&&n>=0?n:0},money=(n,c='USD')=>new Intl.NumberFormat('en-US',{style:'currency',currency:c}).format(n||0),net=e=>num(e.gross)-num(e.fees)-num(e.refunds)-num(e.tax),sum=(a,fn)=>a.reduce((v,e)=>v+fn(e),0),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),makeId=()=>crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2);
let entries=[],accounts=[],payouts=[],adjustments=[],selectedPeriod='month';
function validDate(value){if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const d=new Date(value+'T12:00:00Z');return !Number.isNaN(d.getTime())&&d.toISOString().slice(0,10)===value}
function validMoney(value,allowZero=true){if(value===null||value===undefined||String(value).trim()==='')return allowZero;const n=Number(value);return Number.isFinite(n)&&n>=0&&Math.abs(Math.round(n*100)-n*100)<1e-7&&(allowZero||n>0)}
function validateRawFinancialRecords(data){
 if(!data||!Array.isArray(data.entries))return 'Income records must be an array';
 for(const key of ['accounts','payouts','adjustments'])if(data[key]!==undefined&&!Array.isArray(data[key]))return key+' must be an array';
 const hasId=v=>typeof v==='string'&&v.trim().length>0;
 for(const [kind,list] of [['income',data.entries],['account',data.accounts||[]],['payout',data.payouts||[]],['adjustment',data.adjustments||[]]]){
  const ids=new Set();for(const item of list){if(item&&hasId(item.id)){if(ids.has(item.id))return 'Duplicate '+kind+' record identifier';ids.add(item.id)}}
 }
 for(const e of data.entries){
  if(!e||typeof e!=='object')return 'Income record is malformed';
  if(!hasId(e.id))return 'Income record is missing an identifier';
  if(!validMoney(e.gross??e.amount,false))return 'Income has a missing, zero or invalid gross amount';
  if(e.gross!==undefined&&e.amount!==undefined&&Number(e.gross)!==Number(e.amount))return 'Income has conflicting gross and legacy amount values';
  if(['fees','refunds','tax'].some(k=>!validMoney(e[k])))return 'Income contains invalid deductions';
 }
 for(const a of data.accounts||[]){if(!a||typeof a!=='object'||!hasId(a.id))return 'Account is missing an identifier'}
 for(const p of data.payouts||[]){
  if(!p||typeof p!=='object'||!hasId(p.id))return 'Payout is missing an identifier';
  if(!validMoney(p.amount,false)||!Array.isArray(p.allocations))return 'Payout has an invalid amount or allocation list';
  const allocatedIds=new Set();
  for(const a of p.allocations){
   if(!a||typeof a!=='object'||!hasId(a.entryId)||!validMoney(a.amount,false))return 'Payout has an invalid allocation';
   if(allocatedIds.has(a.entryId))return 'Payout allocates the same income record more than once';
   allocatedIds.add(a.entryId);
  }
 }
 for(const a of data.adjustments||[]){if(!a||typeof a!=='object'||!hasId(a.id))return 'Adjustment is missing an identifier'}
 return '';
}
function validatePayoutData(record,ledger,otherPayouts){if(!record.platform||!validDate(record.received)||!validMoney(record.amount,false)||!['USD','CAD','GBP','EUR','AUD','JPY'].includes(record.currency))return 'Enter a valid platform, deposit date and amount';const seen=new Set();let total=0;for(const a of record.allocations){if(seen.has(a.entryId))return 'An earnings record is allocated more than once';seen.add(a.entryId);if(!validMoney(a.amount,false))return 'Allocation must be a positive amount';const e=ledger.find(x=>x.id===a.entryId);if(!e||e.platform!==record.platform||e.account!==record.account||e.currency!==record.currency)return 'Allocation does not match the payout account';if(record.received<e.earnedDate)return 'Payout cannot predate allocated earnings';const used=sum(otherPayouts.filter(p=>p.id!==record.id),p=>sum(p.allocations.filter(x=>x.entryId===a.entryId),x=>x.amount));if(a.amount>net(e)-used+.001)return 'Allocation exceeds outstanding earnings';total+=a.amount}if(total>record.amount+.001)return 'Allocations exceed the deposit';return ''}
function normalize(e){return {id:String(e.id||makeId()),channel:['stream','app','commerce'].includes(e.channel)?e.channel:'stream',platform:String(e.platform||'Other streaming / social'),account:String(e.account||''),incomeType:String(e.incomeType||e.category||'Other'),currency:String(e.currency||'USD'),gross:num(e.gross??e.amount),fees:num(e.fees),refunds:num(e.refunds),tax:num(e.tax),earnedDate:String(e.earnedDate||e.date||today()).slice(0,10),payoutDate:String(e.payoutDate||''),status:['Pending','Processing','Paid','Disputed'].includes(e.status)?e.status:'Pending',reference:String(e.reference||''),description:String(e.description||'')}}
function toast(s){$('toast').textContent=s;$('toast').classList.add('show');setTimeout(()=>$('toast').classList.remove('show'),2300)}
function persist(allowRecovery=false){if(ledgerReadOnly&&!allowRecovery){toast('Editing locked to protect saved data');return false}try{localStorage.setItem(KEY,JSON.stringify({version:4,entries,accounts,payouts,adjustments}));return true}catch(e){toast('Could not save. Export a backup.');return false}}
let ledgerReadOnly=false;
let integrityLoadFailure='';
function auditLedgerDetailed(ledger,accountList,paymentList){
 const issues=[];
 const add=(level,kind,recordId,message)=>issues.push({level,kind,recordId:String(recordId||''),message});
 function duplicates(list,kind){const seen=new Set();for(const item of list){if(seen.has(item.id))add('error',kind,item.id,'Duplicate record identifier');seen.add(item.id)}}
 duplicates(ledger,'income');duplicates(accountList,'account');duplicates(paymentList,'payout');
 for(const e of ledger){
  if(!validDate(e.earnedDate))add('error','income',e.id,'Invalid earned date');
  if(e.payoutDate&&!validDate(e.payoutDate))add('error','income',e.id,'Invalid payout date');
  if(![e.gross,e.fees,e.refunds,e.tax].every(v=>validMoney(v))||net(e)<-0.001)add('error','income',e.id,'Invalid amounts or deductions exceed gross earnings');
  if(!['USD','CAD','GBP','EUR','AUD','JPY'].includes(e.currency))add('error','income',e.id,'Unsupported currency');
  if(e.status==='Paid'&&!e.payoutDate)add('error','income',e.id,'Paid earnings are missing their payout date');
  if(e.payoutDate&&e.payoutDate<e.earnedDate)add('error','income',e.id,'Payout date precedes earned date');
  if(e.payoutDate&&e.status!=='Paid')add('warning','income',e.id,'Payout date exists but status is not Paid');
 }
 for(const a of accountList){if(!a.name.trim())add('error','account',a.id,'Account name is empty')}
 const allocated=new Map();
 const payoutReferences=new Set();
 for(const p of paymentList){
  const reference=String(p.reference||'').trim().toLowerCase();
  if(reference){
   const key=[p.platform,p.account,p.currency,reference].join('\u001f');
   if(payoutReferences.has(key))add('warning','payout',p.id,'Repeated deposit reference for the same platform, account and currency');
   payoutReferences.add(key);
  }
  const problem=validatePayoutData(p,ledger,paymentList);
  if(problem)add('error','payout',p.id,problem);
  if(!validMoney(p.amount,false))add('error','payout',p.id,'Invalid deposit amount');
  if(!validDate(p.received))add('error','payout',p.id,'Invalid deposit date');
  const seen=new Set();
  for(const a of p.allocations){
   if(seen.has(a.entryId))add('error','payout',p.id,'Same income record allocated twice in this deposit');seen.add(a.entryId);
   if(!validMoney(a.amount,false))add('error','payout',p.id,'Invalid allocation amount');
   const e=ledger.find(e=>e.id===a.entryId);
   if(!e){add('error','payout',p.id,'Allocation refers to missing income '+a.entryId);continue}
   if(e.platform!==p.platform||e.account!==p.account||e.currency!==p.currency)add('error','payout',p.id,'Allocation platform, account or currency mismatch');
   if(validDate(p.received)&&validDate(e.earnedDate)&&p.received<e.earnedDate)add('error','payout',p.id,'Deposit predates allocated earnings');
   allocated.set(e.id,(allocated.get(e.id)||0)+a.amount);
  }
  if(sum(p.allocations,a=>a.amount)>p.amount+.001)add('error','payout',p.id,'Allocated total exceeds deposit');
 }
 for(const e of ledger){
  if(e.status==='Paid'&&allocated.has(e.id))add('error','income',e.id,'Marked Paid and separately reconciled; potential double counting');
  if((allocated.get(e.id)||0)>net(e)+.001)add('error','income',e.id,'Allocations across deposits exceed net earnings');
 }
 return issues;
}
function auditAdjustments(list,ledger=entries,paymentList=payouts){
 const issues=[],ids=new Set(),refs=new Set();
 for(const a of list){
  const key=String(a.id||'');
  if(!key||ids.has(key))issues.push({level:'error',kind:'adjustment',recordId:key||'(missing)',message:'Missing or duplicate adjustment ID'});
  ids.add(key);
  const issue=validateAdjustment(a,ledger,paymentList);
  if(issue)issues.push({level:'error',kind:'adjustment',recordId:key,message:issue});
  if(a.entryId){const e=ledger.find(e=>e.id===a.entryId);if(!e)issues.push({level:'error',kind:'adjustment',recordId:key,message:'Linked earnings record is missing'});else if(e.platform!==a.platform||e.account!==a.account||e.currency!==a.currency)issues.push({level:'error',kind:'adjustment',recordId:key,message:'Linked earnings account or currency does not match'});else if(a.date<e.earnedDate)issues.push({level:'error',kind:'adjustment',recordId:key,message:'Adjustment predates linked earnings'});else if(a.amount<0&&e.status==='Paid'||(a.amount<0&&e&&paymentList.some(p=>p.allocations.some(x=>x.entryId===e.id))))issues.push({level:'warning',kind:'adjustment',recordId:key,message:'Refund on paid or allocated earnings: reconcile the platform clawback or future payout offset manually'})}
  if(a.reference){const ref=[a.platform,a.account,a.currency,a.reference].join('\u001f');if(refs.has(ref))issues.push({level:'warning',kind:'adjustment',recordId:key,message:'Repeated adjustment reference for the same account and currency'});refs.add(ref)}
 }
 return issues;
}
function auditLedgerData(ledger,accountList,paymentList){return [...new Set([...auditLedgerDetailed(ledger,accountList,paymentList),...auditAdjustments(adjustments)].map(x=>x.message))]}
function renderIntegrity(){
 const findings=[...auditLedgerDetailed(entries,accounts,payouts),...auditAdjustments(adjustments)];
 const summary=$('integritySummary'),details=$('integrityDetails');
 if(integrityLoadFailure){summary.className='notice integrity-error';summary.textContent='Saved data could not be loaded. Editing is disabled to protect recoverable records. Restore a verified backup or export the raw data for recovery.';details.innerHTML='<div class="integrity-issue"><strong>Load error</strong><p>'+esc(integrityLoadFailure)+'</p></div>';return}
 const errors=findings.filter(f=>f.level==='error').length,warnings=findings.length-errors;
 summary.className='notice '+(errors?'integrity-error':warnings?'integrity-warning':'integrity-ok');
 summary.textContent=errors?`${errors} critical issue(s), ${warnings} warning(s). Editing is locked until critical issues are resolved through a validated backup.`:warnings?`${warnings} warning(s) found. Review them before relying on financial reports.`:`No issues detected across ${entries.length} income records, ${payouts.length} payouts, ${accounts.length} accounts and ${adjustments.length} adjustments.`;
 details.innerHTML=findings.slice(0,100).map(f=>`<div class="integrity-issue"><strong>${esc(f.level.toUpperCase())} · ${esc(f.kind)}</strong><p>${esc(f.message)}</p><code>Record: ${esc(f.recordId)}</code></div>`).join('')+(findings.length>100?`<p class="footnote">Showing the first 100 of ${findings.length} findings. Export the report to review all.</p>`:'');
}
function exportIntegrity(){const report={app:'CloutFlow',reportType:'financial-integrity',generatedAt:new Date().toISOString(),loadFailure:integrityLoadFailure||null,counts:{income:entries.length,accounts:accounts.length,payouts:payouts.length,adjustments:adjustments.length},issues:[...auditLedgerDetailed(entries,accounts,payouts),...auditAdjustments(adjustments,entries,payouts)]};download('cloutflow-integrity-report.json',JSON.stringify(report,null,2),'application/json');toast('Integrity report exported')}
function requireWritable(){if(ledgerReadOnly){toast('Editing locked: resolve critical data integrity issues first.');document.getElementById('integritySection').scrollIntoView({behavior:'smooth'});return false}return true}
function load(){
 ledgerReadOnly=false;integrityLoadFailure='';
 try{
  const raw=localStorage.getItem(KEY);
  if(raw){
   const d=JSON.parse(raw);
   if(!d||!Array.isArray(d.entries)|| (d.accounts!==undefined&&!Array.isArray(d.accounts)) || (d.payouts!==undefined&&!Array.isArray(d.payouts)) || (d.adjustments!==undefined&&!Array.isArray(d.adjustments)))throw Error('Saved data structure is invalid');
   const rawIssue=validateRawFinancialRecords(d);if(rawIssue)throw Error('Saved data: '+rawIssue);
   const nextEntries=d.entries.map(normalize),nextAccounts=(d.accounts||[]).map(normalizeAccount),nextPayouts=(d.payouts||[]).map(normalizePayout);
   if(auditAdjustments(d.adjustments||[],nextEntries,nextPayouts).some(f=>f.level==='error'))throw Error('Saved adjustments contain invalid or duplicate records');const nextAdjustments=(d.adjustments||[]).map(a=>({...a}));
   entries=nextEntries;accounts=nextAccounts;payouts=nextPayouts;adjustments=nextAdjustments;
   const issues=auditLedgerData(entries,accounts,payouts);
   if(issues.length){console.warn('CloutFlow data integrity warnings:',issues);ledgerReadOnly=[...auditLedgerDetailed(entries,accounts,payouts),...auditAdjustments(adjustments,entries,payouts)].some(x=>x.level==='error');toast('Data integrity warning: review the integrity center');}
  }else{
   const old=JSON.parse(localStorage.getItem(LEGACY)||'[]');
   if(!Array.isArray(old))throw Error('Legacy data is invalid');
   entries=old.map(e=>normalize({...e,gross:e.amount,earnedDate:e.date,status:'Paid',payoutDate:e.date}));accounts=[];payouts=[];adjustments=[];if(!persist())throw Error('Legacy migration could not be saved; original data remains available');
  }
 }catch(e){
  // Never overwrite or clear corrupt stored data: it may be recoverable from a backup.
  entries=[];accounts=[];payouts=[];adjustments=[];ledgerReadOnly=true;integrityLoadFailure=String(e.message||e);console.error('CloutFlow load failed:',e);toast('Saved data could not be loaded. Stored data was not overwritten.');
 }
}
function periodEntries(){const now=new Date(),y=now.getFullYear(),m=now.getMonth();return entries.filter(e=>{let d=new Date(e.earnedDate+'T12:00:00');if(isNaN(d))return false;if(selectedPeriod==='all')return true;if(selectedPeriod==='year')return d.getFullYear()===y;if(selectedPeriod==='last')return d.getFullYear()===(m?y:y-1)&&d.getMonth()===(m+11)%12;return d.getFullYear()===y&&d.getMonth()===m})}
function dateInPeriod(value){let d=new Date(value+'T12:00:00');if(Number.isNaN(d.getTime()))return false;let now=new Date(),y=now.getFullYear(),m=now.getMonth();if(selectedPeriod==='all')return true;if(selectedPeriod==='year')return d.getFullYear()===y;if(selectedPeriod==='last')return d.getFullYear()===(m?y:y-1)&&d.getMonth()===(m+11)%12;return d.getFullYear()===y&&d.getMonth()===m}
function renderPayouts(earned){let groups=new Map();function get(e){let key=[e.platform,e.account,e.currency].join('\u001f');if(!groups.has(key))groups.set(key,{platform:e.platform,account:e.account,currency:e.currency,unpaid:0,paid:0,count:0});return groups.get(key)}earned.forEach(e=>{let g=get(e);g.count++;g.unpaid+=Math.max(0,net(e)-allocatedTo(e.id)-(e.status==='Paid'&&!allocatedTo(e.id)?net(e):0))});payouts.filter(p=>dateInPeriod(p.received)).forEach(p=>get(p).paid+=p.amount);entries.filter(e=>e.status==='Paid'&&e.payoutDate&&dateInPeriod(e.payoutDate)&&allocatedTo(e.id)===0).forEach(e=>get(e).paid+=net(e));let rows=[...groups.values()].sort((a,b)=>b.unpaid+b.paid-a.unpaid-a.paid);$('payoutRows').innerHTML=rows.map(g=>`<tr><td data-label="Platform / account"><div class="source-name">${esc(g.platform)}</div><div class="subtext">${esc(g.account||'No account')}</div></td><td data-label="Currency">${esc(g.currency)}</td><td data-label="Unpaid" class="amount">${money(g.unpaid,g.currency)}</td><td data-label="Paid in period" class="amount">${money(g.paid,g.currency)}</td><td data-label="Transactions">${g.count}</td></tr>`).join('');$('payoutEmpty').style.display=rows.length?'none':'block'}
// A complete all-time view must never silently truncate older earnings.
function chartSeries(data,corrections=adjustments,period=selectedPeriod,now=new Date()){
 const dated=[...data.map(e=>e.earnedDate),...corrections.filter(a=>a.currency==='USD').map(a=>a.date)].filter(validDate).sort();
 const earliest=dated[0]?new Date(dated[0]+'T12:00:00'):now;
 const span=(now.getFullYear()-earliest.getFullYear())*12+now.getMonth()-earliest.getMonth()+1;
 const yearly=period==='all'&&span>18;
 const firstYear=yearly?earliest.getFullYear():0;
 const count=yearly?Math.max(1,now.getFullYear()-firstYear+1):period==='year'?12:period==='all'?Math.max(1,span):period==='last'?1:6;
 const buckets=[];
 for(let i=0;i<count;i++){
  let d;
  if(yearly)d=new Date(firstYear+i,0,1);
  else if(period==='year')d=new Date(now.getFullYear(),i,1);
  else if(period==='last')d=new Date(now.getFullYear(),now.getMonth()-1,1);
  else d=new Date(now.getFullYear(),now.getMonth()-count+1+i,1);
  const key=yearly?String(d.getFullYear()):d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
  const label=yearly?key:d.toLocaleDateString('en-US',{month:'short',year:'2-digit'});
  buckets.push({key,label,value:0});
 }
 const lookup=new Map(buckets.map(b=>[b.key,b]));
 const keyFor=date=>yearly?date.slice(0,4):date.slice(0,7);
 for(const e of data){const bucket=lookup.get(keyFor(e.earnedDate));if(bucket)bucket.value+=net(e)}
 for(const a of corrections){if(a.currency!=='USD')continue;const bucket=lookup.get(keyFor(a.date));if(bucket)bucket.value+=Number(a.amount)}
 return {buckets,yearly};
}
function trendProjection(data){
 const series=chartSeries(data);
 const rows=RevenueTrends.rows(series.buckets);
 $('trendRows').innerHTML=rows.map(row=>`<tr><td>${esc(row.period)}</td><td class="amount">${money(row.adjustedNet,'USD')}</td></tr>`).join('');
 $('chartPeriodNote').textContent=series.yearly?'All available history grouped by year · USD adjusted net revenue':'USD adjusted net revenue grouped by month · refunds included on adjustment dates';
 return {...series,rows};
}
function renderPeriodComparison(){
 const result=PeriodComparison.compare(selectedPeriod,entries,adjustments,net);
 const container=$('comparisonCards');
 if(!result){$('comparisonCaption').textContent='All-time reporting has no equivalent earlier period.';container.innerHTML='<div class="empty">Choose This month, Last month, or This year to compare matching calendar dates.</div>';return}
 $('comparisonCaption').textContent=result.label;
 const metrics=[['Adjusted net',result.current.adjustedNet,result.previous.adjustedNet,result.netChange],['Gross earnings',result.current.gross,result.previous.gross,result.grossChange]];
 container.innerHTML=metrics.map(([name,current,previous,delta])=>`<article class="comparison-tile"><div class="comparison-label">${esc(name)}</div><div class="comparison-amount">${money(current,'USD')}</div><div class="comparison-prior">Previous: ${money(previous,'USD')}</div><div class="comparison-delta ${delta.difference<0?'comparison-negative':''}">${delta.difference>0?'+':''}${money(delta.difference,'USD')} ${delta.percent===null?'· no positive baseline':`(${delta.percent>0?'+':''}${delta.percent}%)`}</div></article>`).join('');
}
function drawChart(data){
 const {buckets}=trendProjection(data);
 const c=$('chart'),r=c.getBoundingClientRect();if(!r.width||!r.height)return;
 const dpi=window.devicePixelRatio||1;c.width=Math.round(r.width*dpi);c.height=Math.round(r.height*dpi);
 const x=c.getContext('2d');x.setTransform(dpi,0,0,dpi,0,0);
 const w=r.width,h=r.height,p={l:55,r:10,t:13,b:31};
 const values=buckets.map(b=>b.value),top=Math.max(0,...values),bottom=Math.min(0,...values),range=Math.max(1,top-bottom),pad=range*.12;
 const upper=top+pad,lower=bottom-pad,iw=w-p.l-p.r,ih=h-p.t-p.b;
 const y=v=>p.t+(upper-v)/(upper-lower)*ih;
 x.font='10px system-ui';x.textAlign='right';
 for(let i=0;i<=4;i++){const val=upper-(upper-lower)*i/4,yy=y(val);x.strokeStyle='#2a3852';x.beginPath();x.moveTo(p.l,yy);x.lineTo(w-p.r,yy);x.stroke();x.fillStyle='#8e9bb5';x.fillText((val<0?'−':'')+'$'+Math.abs(Math.round(val)),p.l-6,yy+3)}
 const baseline=y(0);x.strokeStyle='#6680a8';x.beginPath();x.moveTo(p.l,baseline);x.lineTo(w-p.r,baseline);x.stroke();
 const step=iw/buckets.length,bw=Math.min(27,step*.55),labelEvery=Math.max(1,Math.ceil(buckets.length/Math.max(2,Math.floor(iw/68))));
 values.forEach((v,i)=>{const xx=p.l+step*i+step/2-bw/2,yy=y(v);x.fillStyle=v<0?'#ff8294':'#70a8ff';x.fillRect(xx,Math.min(yy,baseline),bw,Math.max(0.75,Math.abs(yy-baseline)));if(i%labelEvery===0||i===buckets.length-1){x.fillStyle='#8e9bb5';x.textAlign='center';x.fillText(buckets[i].label,xx+bw/2,h-7)}});
}
function renderIncomeOpportunities(){
 const root=$('incomeOpportunityResults');if(!root||!window.CloutFlowIncomeOpportunities)return;
 const category=$('opportunityCategory').value;
 const allSuggestions=CloutFlowIncomeOpportunities.suggest(entries,accounts,category);
 const progress=window.CloutFlowOpportunityProgress;const progressStore=(()=>{try{return window.localStorage}catch{return null}})();
 const status=$('opportunityStatus')?.value||'all';
 const suggestions=(progress&&progressStore?progress.filter(allSuggestions,progressStore,status):status==='all'||status==='not-started'?allSuggestions:[]).slice(0,12);
 const counts=progress&&progressStore?progress.summary(allSuggestions,progressStore):{'all':allSuggestions.length,'not-started':allSuggestions.length,interested:0,trying:0,doing:0};
 const plans=window.CloutFlowOpportunityPlans;const planStore=progressStore;
 const goalEl=$('opportunityGoalSummary');if(goalEl&&window.CloutFlowOpportunityGoals){const summary=CloutFlowOpportunityGoals.summarize(CloutFlowIncomeOpportunities.suggest(entries,accounts),plans,planStore);goalEl.textContent=summary.planned?`${summary.planned} saved growth plans · ${summary.withTargets} with monthly goals${summary.totals.length?' · '+summary.totals.map(x=>CloutFlowOpportunityGoals.format(x.currency,x.amount)+' '+x.currency).join(' · '):''}. Goals are personal targets, not earned income or forecasts.`:'No growth plans saved yet. Add a next step or optional monthly goal to an idea.';}

 const incomeContextEl=$('growthIncomeContext');if(incomeContextEl&&window.CloutFlowGrowthIncomeContext){const now=today().slice(0,7);const goals=window.CloutFlowOpportunityGoals?CloutFlowOpportunityGoals.summarize(CloutFlowIncomeOpportunities.suggest(entries,accounts),plans,planStore):{totals:[]};const view=CloutFlowGrowthIncomeContext.context(entries,now,goals);incomeContextEl.textContent=view.rows.length?`Earned income in ${now} (net, by earned date): ${view.rows.map(r=>`${r.currency} ${r.hasEarned?money(r.earned,r.currency):'no recorded earnings'}; ${r.hasGoal?'growth target '+money(r.goal,r.currency):'no growth target'}`).join(' · ')}. Growth targets are optional planning amounts, not a share of earnings; this is not goal attainment or attributed revenue.`:`No earned income or growth targets for ${now}. Income is shown by earned date, not deposit date.`;}
 const recurringEl=$('recurringIncomeInsights');if(recurringEl&&window.CloutFlowRecurringIncome){const range=Number($('growthTrendRange')?.value||6),observed=CloutFlowRecurringIncome.summarize(entries,today().slice(0,7),range);recurringEl.innerHTML=`<h4>Subscription & membership income signals</h4>${observed.length?`<div class="growth-intelligence-grid">${observed.slice(0,8).map(g=>`<article class="growth-intelligence-card"><h4>${esc(g.platform)} · ${esc(g.type)}</h4><p>${esc(g.account||'No account label')} · ${esc(g.currency)}</p><p><strong>Recorded months:</strong> ${g.activeMonths} of ${g.selectedMonths}</p><p><strong>Latest month:</strong> ${g.latest===null?'No recorded entry':esc(money(g.latest,g.currency))}</p><p><strong>Adjacent-month change:</strong> ${g.delta===null?'Unavailable':esc(money(g.delta,g.currency))}</p><p><strong>Pattern:</strong> ${g.observedPattern?'Repeated category activity observed':'Insufficient consecutive observations'}</p></article>`).join('')}</div>`:'<p>No subscription or membership income entries in this period.</p>'}<p class="footnote">Category-based observations only. They do not verify subscriber counts, recurring contracts, future payouts, or monthly recurring revenue (MRR). Missing months are unknown, not zero.</p>`;}
 const intelligenceEl=$('growthIncomeIntelligence');if(intelligenceEl&&window.CloutFlowIncomeIntelligence&&window.CloutFlowGrowthIncomeTrends){const report=CloutFlowGrowthIncomeTrends.build(entries,today().slice(0,7),Number($('growthTrendRange')?.value||6));const metrics=CloutFlowIncomeIntelligence.analyze(report);intelligenceEl.innerHTML=metrics.length?`<div class="growth-intelligence-grid">${metrics.map(m=>`<article class="growth-intelligence-card"><h4>${esc(m.currency)} income insights</h4><p><strong>Latest month:</strong> ${m.current===null?'No recorded earnings':esc(money(m.current,m.currency))}</p><p><strong>Month over month:</strong> ${m.delta===null?'Insufficient adjacent monthly data':`${m.delta>=0?'+':''}${esc(money(m.delta,m.currency))}${m.percentChange===null?' (percentage unavailable: previous month was zero)':` (${m.percentChange>=0?'+':''}${m.percentChange.toFixed(2)}%)`}`}</p><p><strong>Average of recorded months:</strong> ${m.average===null?'Unavailable':esc(money(m.average,m.currency))} (${m.observedMonths} of ${m.selectedMonths} months with entries)</p><p><strong>Typical absolute monthly change:</strong> ${m.averageAbsoluteChange===null?'Insufficient consecutive history':`${m.averageAbsoluteChange.toFixed(2)}% across ${m.consecutiveComparisons} comparisons`}</p></article>`).join('')}</div><p class="footnote">Descriptive history only, not a forecast. Months without records are missing data, not zero earnings. Percent changes are unavailable when the prior month is zero. Each currency is analyzed separately.</p>`:'No recorded income available for monthly comparisons.';}
 const trendsEl=$('growthIncomeTrends');if(trendsEl&&window.CloutFlowGrowthIncomeTrends){const range=Number($('growthTrendRange')?.value||6);const trend=CloutFlowGrowthIncomeTrends.build(entries,today().slice(0,7),range);if(trend.currencies.length){trendsEl.innerHTML=`<div class="growth-trends-scroll"><table><caption>Recorded net earned income by month and currency; not attributed to growth plans</caption><thead><tr><th scope="col">Month</th>${trend.currencies.map(c=>`<th scope="col">${esc(c)}</th>`).join('')}<th scope="col">Entries</th></tr></thead><tbody>${trend.rows.map(row=>`<tr><th scope="row">${esc(row.month)}</th>${row.amounts.map(a=>`<td>${a.hasData?esc(money(a.amount,a.currency)):'—'}</td>`).join('')}<td>${row.records}</td></tr>`).join('')}</tbody></table></div><p class="footnote">Based on earned dates and net recorded amounts. Deposits are not additional income. Missing months are not estimates. Growth goals are separate planning targets.</p>`;}else{trendsEl.textContent=`No recorded earned income in the selected ${range}-month period. Add dated earnings to see a monthly history.`;}}
 const summaryEl=$('opportunityProgressSummary');if(summaryEl)summaryEl.textContent=`${suggestions.length} shown · ${counts.trying} trying · ${counts.doing} already doing`;
 if(window.CloutFlowOpportunityPopups&&window.localStorage){CloutFlowOpportunityPopups.bindLauncher(document);CloutFlowOpportunityPopups.present(CloutFlowIncomeOpportunities.suggest(entries,accounts),document,window.localStorage,{entries});}
 root.innerHTML=suggestions.length?suggestions.map(item=>`<article class="opportunity-card"><div class="opportunity-meta"><span>${esc(CloutFlowIncomeOpportunities.groups[item.group])}</span>${item.already?'<span class="opportunity-existing">Already tracked</span>':'<span class="opportunity-new">Explore</span>'}</div><h4>${esc(item.title)}</h4><p>${esc(item.why)}</p><p><strong>Try this:</strong> ${esc(item.action)}</p><p class="opportunity-caution"><strong>Check first:</strong> ${esc(item.caution)}</p><details class="opportunity-plan" data-opportunity-plan="${esc(item.id)}"><summary>Plan this opportunity${plans&&planStore&&plans.get(planStore,item.id).note?' · Saved':''}</summary><label for="plan-note-${esc(item.id)}">Next step or experiment notes</label><textarea id="plan-note-${esc(item.id)}" data-plan-note maxlength="500" rows="2" placeholder="What will you try?">${plans&&planStore?esc(plans.get(planStore,item.id).note):''}</textarea><label for="plan-target-${esc(item.id)}">Optional monthly income goal (not a forecast)</label><div class="opportunity-plan-money"><select aria-label="Goal currency" data-plan-currency>${(plans?plans.currencies:['USD']).map(c=>`<option value="${c}" ${plans&&planStore&&plans.get(planStore,item.id).currency===c?'selected':''}>${c}</option>`).join('')}</select><input id="plan-target-${esc(item.id)}" type="number" data-plan-target min="0" max="1000000000" step="0.01" value="${plans&&planStore?plans.get(planStore,item.id).target:0}" inputmode="decimal"></div><button type="button" class="btn small" data-plan-save="${esc(item.id)}">Save plan</button><span class="opportunity-plan-feedback" data-plan-feedback role="status" aria-live="polite"></span></details><label class="opportunity-progress-label" for="opportunity-progress-${esc(item.id)}">My progress</label><select class="opportunity-progress-select" id="opportunity-progress-${esc(item.id)}" data-opportunity-progress="${esc(item.id)}"><option value="">Not started</option><option value="interested" ${progress&&progressStore&&progress.get(progressStore,item.id)==='interested'?'selected':''}>Interested</option><option value="trying" ${progress&&progressStore&&progress.get(progressStore,item.id)==='trying'?'selected':''}>Trying it</option><option value="doing" ${progress&&progressStore&&progress.get(progressStore,item.id)==='doing'?'selected':''}>Already doing this</option></select></article>`).join(''):'<div class="empty opportunity-empty">'+(entries.length||accounts.length?'No matching ideas for this category yet. Try All ideas.':'Add a creator account or income entry to unlock recommendations tailored to your work.')+'</div>';
}
$('incomeOpportunityResults').addEventListener('click',event=>{const btn=event.target.closest('[data-plan-save]');if(!btn)return;const api=window.CloutFlowOpportunityPlans;if(!api)return;let store;try{store=window.localStorage}catch{return}const panel=btn.closest('[data-opportunity-plan]');if(!panel)return;const note=panel.querySelector('[data-plan-note]').value;const targetInput=panel.querySelector('[data-plan-target]');const target=Number(targetInput.value);const feedback=panel.querySelector('[data-plan-feedback]');if(targetInput.value.trim()===''||!Number.isFinite(target)||target<0||target>1000000000||Math.abs(Math.round(target*100)-target*100)>0.00001){feedback.textContent='Enter a valid nonnegative goal with up to two decimals.';return}const ok=api.set(store,btn.dataset.planSave,{note,currency:panel.querySelector('[data-plan-currency]').value,target});feedback.textContent=ok?'Plan saved locally.':'Could not save plan; check storage or inputs.';if(ok){const summary=$('opportunityGoalSummary');if(summary&&window.CloutFlowOpportunityGoals){const all=CloutFlowIncomeOpportunities.suggest(entries,accounts);const data=CloutFlowOpportunityGoals.summarize(all,api,store);summary.textContent=data.planned?`${data.planned} saved growth plans · ${data.withTargets} with monthly goals${data.totals.length?' · '+data.totals.map(x=>CloutFlowOpportunityGoals.format(x.currency,x.amount)+' '+x.currency).join(' · '):''}. Goals are personal targets, not earned income or forecasts.`:'No growth plans saved yet. Add a next step or optional monthly goal to an idea.';}}});
$('exportGrowthPlans')?.addEventListener('click',()=>{const report=window.CloutFlowOpportunityReport;if(!report||!window.CloutFlowIncomeOpportunities){toast('Growth plan export is unavailable');return}let store;try{store=window.localStorage}catch{store=null}const ideas=CloutFlowIncomeOpportunities.suggest(entries,accounts);const csv=report.build(ideas,window.CloutFlowOpportunityPlans,window.CloutFlowOpportunityProgress,store);download('cloutflow-growth-plans.csv',csv,'text/csv;charset=utf-8');toast('Growth plans CSV exported');});
$('opportunityCategory').addEventListener('change',renderIncomeOpportunities);
$('opportunityStatus').addEventListener('change',renderIncomeOpportunities);
$('growthTrendRange')?.addEventListener('change',renderIncomeOpportunities);
$('exportGrowthHistory')?.addEventListener('click',()=>{if(!window.CloutFlowGrowthIncomeTrends||!window.CloutFlowGrowthHistoryExport){toast('Income history export is unavailable');return}const report=CloutFlowGrowthIncomeTrends.build(entries,today().slice(0,7),Number($('growthTrendRange')?.value||6));const csv=CloutFlowGrowthHistoryExport.build(report);download('cloutflow-earned-income-history.csv',csv,'text/csv;charset=utf-8');toast('Earned income history CSV exported');});
$('incomeOpportunityResults').addEventListener('change',event=>{const select=event.target.closest('[data-opportunity-progress]');if(!select)return;const progress=window.CloutFlowOpportunityProgress;if(!progress)return;let store;try{store=window.localStorage}catch{return}if(!progress.set(store,select.dataset.opportunityProgress,select.value)){select.value=progress.get(store,select.dataset.opportunityProgress);return}const popup=document.getElementById('growthPopup');if(popup&&!popup.hidden&&popup._idea&&popup._idea.id===select.dataset.opportunityProgress&&select.value==='doing')popup.hidden=true;renderIncomeOpportunities();});
function render(){let all=periodEntries(),usd=all.filter(e=>e.currency==='USD');
// Paid totals use payout dates; earned totals use earned dates.
let paidInPeriod=entries.filter(e=>e.currency==='USD'&&e.status==='Paid'&&e.payoutDate&&dateInPeriod(e.payoutDate)&&allocatedTo(e.id)===0);let actualDeposits=payouts.filter(p=>p.currency==='USD'&&dateInPeriod(p.received));
let accountChoices=[...new Set([...entries.map(e=>e.account.trim()),...accounts.map(a=>a.name)].filter(Boolean))].sort();let af=$('accountFilter'),prior=af.value;
af.innerHTML='<option value="all">All accounts</option>'+accountChoices.map(a=>'<option value="'+esc(a)+'">'+esc(a)+'</option>').join('');af.value=accountChoices.includes(prior)?prior:'all';
const currencyRows=CurrencyOverview.summarize(all,adjustments.filter(a=>dateInPeriod(a.date)),payouts.filter(p=>dateInPeriod(p.received)),net);
$('currencyOverview').innerHTML=currencyRows.length?currencyRows.map(g=>`<article class="currency-tile"><div class="currency-heading"><strong>${esc(g.currency)}</strong><span>${g.transactions} earning${g.transactions===1?'':'s'}</span></div><div class="currency-net">${money(g.adjustedNet,g.currency)}</div><div class="currency-caption">Adjusted net earnings</div><div class="currency-details"><span>Recorded deposits</span><strong>${money(g.deposits,g.currency)}</strong></div>${g.adjustments?`<div class="currency-details"><span>Adjustments included</span><strong>${money(g.adjustments,g.currency)}</strong></div>`:''}</article>`).join(''):'<div class="empty">No earnings, adjustments, or deposits in this period.</div>';
renderIncomeOpportunities();renderAccountInsights(all);
renderPlatformRankings(all);renderAccountRankings(all);renderAccountGrowth();renderPeriodComparison();$('grossTotal').textContent=money(sum(usd,e=>e.gross));$('netTotal').textContent=money(sum(usd,net)+sum(adjustments.filter(a=>a.currency==='USD'&&dateInPeriod(a.date)),a=>a.amount));$('paidTotal').textContent=money(sum(paidInPeriod,net)+sum(actualDeposits,p=>p.amount));$('pendingTotal').textContent=money(sum(usd,e=>Math.max(0,net(e)-allocatedTo(e.id)-(e.status==='Paid'&&allocatedTo(e.id)===0?net(e):0))));let categories={},platforms={};usd.forEach(e=>{categories[e.incomeType]=(categories[e.incomeType]||0)+net(e);platforms[e.platform]=(platforms[e.platform]||0)+net(e)});for(const a of adjustments.filter(a=>a.currency==='USD'&&dateInPeriod(a.date))){categories['Adjustments']=(categories['Adjustments']||0)+a.amount;platforms[a.platform]=(platforms[a.platform]||0)+a.amount}let total=sum(usd,net)+sum(adjustments.filter(a=>a.currency==='USD'&&dateInPeriod(a.date)),a=>a.amount);$('breakdown').innerHTML=Object.entries(categories).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([name,value])=>`<div class="break-row"><span class="break-label">${esc(name)}</span><div class="track"><div class="fill" style="width:${Math.max(0,Math.min(100,Math.abs(value)/Math.max(1,...Object.values(categories).map(Math.abs))*100))}%"></div></div><span class="break-amount">${money(value)}</span></div>`).join('')||'<div class="empty">Add USD income to see your revenue mix.</div>';$('platforms').innerHTML=Object.entries(platforms).sort((a,b)=>b[1]-a[1]).map(([name,value])=>`<div class="platform"><div class="platform-ico">✦</div><div><strong>${esc(name)}</strong><small>${money(value)}</small></div></div>`).join('')||'<div class="empty">Platforms appear when you add income.</div>';renderPayouts(all);renderReconciliation();renderPayoutQueue();renderReconciliationSummary();renderSettlementReview();renderAdjustments();renderLinkedAdjustmentReview();renderAccounts();renderAppRevenue(all);let q=$('search').value.toLowerCase(),tf=$('typeFilter').value,sf=$('statusFilter').value,accountFilter=$('accountFilter').value,shown=all.filter(e=>(accountFilter==='all'||e.account===accountFilter)&&(tf==='all'||e.channel===tf)&&(sf==='all'||e.status===sf)&&LedgerTools.matches(e,q)).sort(LedgerTools.sorter($('ledgerSort').value,net));$('entries').innerHTML=shown.map(e=>`<tr><td data-label="Income"><div class="source-name">${esc(e.description||e.platform)}</div><div class="subtext">${esc(e.account||e.reference||'No account')}</div></td><td data-label="Platform">${esc(e.platform)}</td><td data-label="Category"><span class="pill">${esc(e.incomeType)}</span></td><td data-label="Earned">${esc(e.earnedDate)}</td><td data-label="Status"><span class="pill status-${e.status.toLowerCase()}">${esc(e.status)}</span></td><td data-label="Gross" class="amount">${money(e.gross,e.currency)}</td><td data-label="Net" class="amount">${money(net(e),e.currency)}</td><td data-label="Actions" class="ledger-actions"><button class="btn small" data-income-edit="${esc(e.id)}">Edit</button> <button class="btn small" data-income-copy="${esc(e.id)}">Copy</button></td></tr>`).join('');$('empty').style.display=shown.length?'none':'block';$('empty').textContent=all.length?'No transactions match these filters. Try clearing the search or resetting filters.':'No income entries in this period. Choose another period or add income.';$('clearSearch').hidden=!$('search').value;$('resetLedgerFilters').disabled=!LedgerTools.hasFilters({search:$('search').value,account:accountFilter,type:tf,status:sf,sort:$('ledgerSort').value});$('entryCount').textContent=`${shown.length} shown · ${all.length} this period · ${entries.length} total`;drawChart(usd);renderIntegrity();window.CloutFlowAgreementUIInstance?.refresh()}
function renderPlatformRankings(all){
 const groups=PlatformRankings.summarize(all,adjustments.filter(a=>dateInPeriod(a.date)),net);
 const byCurrency=new Map();for(const g of groups){if(!byCurrency.has(g.currency))byCurrency.set(g.currency,[]);byCurrency.get(g.currency).push(g)}
 $('platformRankings').innerHTML=groups.length?[...byCurrency].map(([currency,rows])=>{
  const insight=PlatformRankings.analyze(rows);
  const insightText=insight.leader?`<p class="ranking-insight">Largest positive source: <strong>${esc(insight.leader.platform)}</strong> · ${insight.leaderShare.toFixed(1)}% of positive adjusted revenue. Top three: ${insight.topThreeShare.toFixed(1)}%.</p>`:'<p class="ranking-insight">No positive adjusted revenue in this currency for this period.</p>';
  return `<div class="ranking-currency"><h4>${esc(currency)} <small>${rows.length} platform${rows.length===1?'':'s'}</small></h4>${insightText}${rows.slice(0,5).map((r,i)=>{
   const share=insight.shares.get(r.platform);
   return `<div class="ranking-row"><span class="ranking-position">${i+1}</span><div class="ranking-label"><strong>${esc(r.platform)}</strong><small>${r.transactions} earning${r.transactions===1?'':'s'}${r.adjustments?' · includes adjustments':''}</small>${share===null?'<small>No positive revenue share</small>':`<small>${share.toFixed(1)}% of positive revenue</small><div class="ranking-track" role="img" aria-label="${share.toFixed(1)} percent of positive adjusted revenue"><span style="width:${share.toFixed(2)}%"></span></div>`}</div><strong class="ranking-value">${money(r.adjustedNet,r.currency)}</strong></div>`;
  }).join('')}${rows.length>5?`<p class="footnote">Showing 5 of ${rows.length} platforms</p>`:''}</div>`;
 }).join(''):'<div class="empty">Add earnings or platform adjustments to see your top platforms for this period.</div>';
}
function renderAccountRankings(all){
 const groups=AccountRankings.summarize(all,adjustments.filter(a=>dateInPeriod(a.date)),net);
 const byCurrency=new Map();for(const g of groups){if(!byCurrency.has(g.currency))byCurrency.set(g.currency,[]);byCurrency.get(g.currency).push(g)}
 $('accountRankings').innerHTML=groups.length?[...byCurrency].map(([currency,rows])=>{
  const insights=AccountRankings.analyze(rows);
  const intro=insights.leader?`<p class="ranking-insight">Leading account: <strong>${esc(insights.leader.platform)} · ${esc(insights.leader.account)}</strong> · ${insights.leaderShare.toFixed(1)}% of positive account revenue.</p>`:'<p class="ranking-insight">No positive adjusted account revenue in this currency.</p>';
  return `<div class="ranking-currency"><h4>${esc(currency)} <small>${rows.length} account${rows.length===1?'':'s'}</small></h4>${intro}${rows.slice(0,5).map((r,i)=>{
   const share=insights.shares.find(x=>x.platform===r.platform&&x.account===r.account).share;
   return `<div class="ranking-row"><span class="ranking-position">${i+1}</span><div class="ranking-label"><strong>${esc(r.account)}</strong><small>${esc(r.platform)} · ${r.transactions} earning${r.transactions===1?'':'s'}${r.adjustments?' · includes adjustments':''}</small>${share===null?'<small>Revenue share unavailable</small>':`<small>${share.toFixed(1)}% of positive account revenue</small><div class="ranking-track" role="img" aria-label="${share.toFixed(1)} percent of positive account revenue"><span style="width:${share.toFixed(2)}%"></span></div>`}</div><strong class="ranking-value">${money(r.adjustedNet,r.currency)}</strong></div>`;
  }).join('')}${rows.length>5?`<p class="footnote">Showing 5 of ${rows.length} accounts</p>`:''}</div>`;
 }).join(''):'<div class="empty">Add account-linked earnings or adjustments to compare creator accounts.</div>';
}
function renderAccountGrowth(){
 const windows=PeriodComparison.windows(selectedPeriod);
 const holder=$('accountGrowth');
 if(!windows){$('accountGrowthCaption').textContent='Choose a finite reporting period to compare account growth.';holder.innerHTML='<div class="empty">All-time reporting has no matching earlier period.</div>';return}
 $('accountGrowthCaption').textContent=windows.label+' · adjusted net earnings, not deposits.';
 const rows=AccountGrowth.calculate(windows,entries,adjustments,net);
 const currencies=new Map();for(const r of rows){if(!currencies.has(r.currency))currencies.set(r.currency,[]);currencies.get(r.currency).push(r)}
 holder.innerHTML=rows.length?[...currencies].map(([currency,items])=>{
  const ordered=[...items].sort((a,b)=>Math.abs(b.difference)-Math.abs(a.difference)||a.platform.localeCompare(b.platform)||a.account.localeCompare(b.account));
  return `<div class="ranking-currency"><h4>${esc(currency)} <small>${items.length} account${items.length===1?'':'s'}</small></h4><p class="ranking-insight">Largest changes in adjusted net earnings (absolute movement).</p>${ordered.slice(0,5).map(r=>`<div class="ranking-row"><div class="ranking-label"><strong>${esc(r.account)}</strong><small>${esc(r.platform)}</small><small>Current: ${money(r.current,currency)} · Previous: ${money(r.previous,currency)}</small><small>${r.percent===null?'Percentage unavailable (no positive prior baseline)':`${r.percent>0?'+':''}${r.percent}% vs prior period`}</small></div><strong class="ranking-value ${r.difference<0?'comparison-negative':''}">${r.difference>0?'+':''}${money(r.difference,currency)}</strong></div>`).join('')}${items.length>5?`<p class="footnote">Showing 5 of ${items.length} accounts</p>`:''}</div>`;
 }).join(''):'<div class="empty">No account earnings or adjustments in either comparison period.</div>';
}
function renderAccountInsights(all){
 const earned=all,datedAdjustments=adjustments.filter(a=>dateInPeriod(a.date)),datedDeposits=payouts.filter(p=>dateInPeriod(p.received));
 const choices=AccountInsights.choices(entries,adjustments,payouts,accounts);
 const picker=$('insightAccount'),previous=picker.value;
 picker.innerHTML='<option value="">Choose an account</option>'+choices.map(c=>`<option value="${esc(c.key)}">${esc(c.platform)} · ${esc(c.account)}</option>`).join('');
 picker.value=choices.some(c=>c.key===previous)?previous:'';
 const rows=picker.value?AccountInsights.summarize(picker.value,earned,datedAdjustments,datedDeposits,net):[];
 $('accountInsightCards').innerHTML=!picker.value?'<div class="empty">Choose an account to explore its earnings and deposits.</div>':rows.length?rows.map(g=>`<article class="currency-tile"><div class="currency-heading"><strong>${esc(g.currency)}</strong><span>${g.transactions} transaction${g.transactions===1?'':'s'}</span></div><div class="currency-net">${money(g.adjustedNet,g.currency)}</div><div class="currency-caption">Adjusted net earnings</div><div class="currency-details"><span>Gross earnings</span><strong>${money(g.gross,g.currency)}</strong></div><div class="currency-details"><span>Adjustments</span><strong>${money(g.adjustments,g.currency)}</strong></div><div class="currency-details"><span>Recorded deposits</span><strong>${money(g.deposits,g.currency)}</strong></div></article>`).join(''):'<div class="empty">No financial activity for this account in the selected period.</div>';
}
function renderAppRevenue(all){
 const groups=new Map();
 for(const e of all){if(e.channel!=='app')continue;const key=[e.platform,e.account||'Unassigned app',e.currency].join('\u001f');
  if(!groups.has(key))groups.set(key,{platform:e.platform,account:e.account||'Unassigned app',currency:e.currency,gross:0,net:0,count:0});
  const g=groups.get(key);g.gross+=e.gross;g.net+=net(e);g.count++;
 }
 for(const a of adjustments){
  if(!dateInPeriod(a.date))continue;
  const matching=[...groups.values()].filter(g=>g.platform===a.platform&&g.account===a.account&&g.currency===a.currency);
  if(matching.length===1)matching[0].net+=a.amount;
  else if(a.platform==='Apple App Store'||a.platform==='Google Play'||a.platform==='Other app store'){
   const key=[a.platform,a.account||'Unassigned app',a.currency].join('\u001f');
   if(!groups.has(key))groups.set(key,{platform:a.platform,account:a.account||'Unassigned app',currency:a.currency,gross:0,net:0,count:0});
   groups.get(key).net+=a.amount;
  }
 }
 const sorted=[...groups.values()].sort((a,b)=>a.platform.localeCompare(b.platform)||a.account.localeCompare(b.account)||a.currency.localeCompare(b.currency));
 $('appRevenueDetails').innerHTML=sorted.map(g=>`<div class="platform"><div class="platform-ico">▣</div><div style="min-width:0"><strong title="${esc(g.account)}">${esc(g.account)}</strong><small>${esc(g.platform)} · ${esc(g.currency)} · ${g.count} records</small><br><small>Net ${money(g.net,g.currency)} · Gross ${money(g.gross,g.currency)}</small></div></div>`).join('')||'<div class="empty" style="grid-column:1/-1">App Store and Google Play earnings will appear here after you add or import them.</div>';
}
function updatePlatform(selected){let ch=$('channel').value;$('platform').innerHTML=Object.keys(catalogs[ch]).map(p=>`<option value="${esc(p)}">${esc(p)}</option>`).join('');if(selected&&catalogs[ch][selected])$('platform').value=selected;updateTypes()}
function updateTypes(selected){let list=catalogs[$('channel').value][$('platform').value]||['Other'];$('incomeType').innerHTML=list.map(t=>`<option value="${esc(t)}">${esc(t)}</option>`).join('');if(selected&&!list.includes(selected))$('incomeType').add(new Option(selected,selected));if(selected)$('incomeType').value=selected}
function preview(){let n=Math.max(0,num($('gross').value)-num($('fees').value)-num($('refunds').value)-num($('tax').value));$('netPreview').textContent=money(n,$('currency').value)}
function openModal(e){if(!requireWritable())return;$('savedAccounts').innerHTML=accounts.filter(a=>a.platform===$('platform').value).map(a=>`<option value="${esc(a.name)}"></option>`).join('');$('incomeForm').reset();$('entryId').value='';$('modalTitle').textContent='Add income';$('deleteFromModal').classList.add('hidden');$('earnedDate').value=today();updatePlatform();if(e){for(let k of ['entryId','channel','account','currency','gross','fees','refunds','tax','earnedDate','payoutDate','status','reference','description']){let key=k==='entryId'?'id':k;$(k).value=e[key]??''}updatePlatform(e.platform);updateTypes(e.incomeType);$('modalTitle').textContent='Edit income';$('deleteFromModal').classList.remove('hidden')}preview();$('modal').classList.add('show')}
function closeModal(){$('modal').classList.remove('show')}
window.editEntry=id=>{let e=entries.find(x=>x.id===id);if(e)openModal(e)};
window.duplicateEntry=id=>{let e=entries.find(x=>x.id===id);if(!e)return;let old=entries;entries=[...entries,{...e,id:makeId(),reference:'',description:e.description+' (copy)'}];if(persist()){render();toast('Entry duplicated')}else entries=old};
function deleteEntry(){let id=$('entryId').value;if(allocatedTo(id)>0){toast('Remove payout allocations before deleting this income');return}if(adjustments.some(a=>a.entryId===id)){toast('Unlink associated adjustments before deleting this income');return}if(id&&confirm('Permanently delete this transaction?')){let old=entries;entries=entries.filter(e=>e.id!==id);if(persist()){closeModal();render();toast('Entry deleted')}else entries=old}}
function download(name,body,type){let a=document.createElement('a'),url=URL.createObjectURL(new Blob([body],{type}));a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}
const headers=['id','channel','platform','account','incomeType','currency','gross','fees','refunds','tax','earnedDate','payoutDate','status','reference','description'];
function csvCell(v){
 // Prevent spreadsheet applications from evaluating user-supplied text as a formula.
 // The leading apostrophe is an export-only safety marker; original ledger data is unchanged.
 const raw=String(v??'');const safe=/^[\s\u0000-\u001f]*[=+@\-]/.test(raw)&&!/^\s*-?\d+(?:\.\d+)?\s*$/.test(raw)?"'"+raw:raw;
 return '"'+safe.replace(/"/g,'""')+'"';
}
function exportTableCSV(filename,columns,rows){
 const header=columns.map(c=>csvCell(Array.isArray(c)?c[0]:c)).join(',');
 const lines=rows.map(r=>columns.map((c,i)=>csvCell(Array.isArray(c)?(typeof c[1]==='function'?c[1](r):r[c[1]]):Array.isArray(r)?r[i]:r[c])).join(','));
 const content='\uFEFF'+[header,...lines].join('\r\n');
 download(filename,content,'text/csv;charset=utf-8');
}
function exportAdjustmentCSV(){
 const columns=['id','date','platform','account','type','currency','amount','reference','entryId','recovered','recoveryDate','recoveryReference','recoveryPayoutId','notes'].map(k=>[k,k]);
 exportTableCSV('cloutflow-adjustments.csv',columns,adjustments);toast('Adjustments CSV exported');
}
function recoveryReviewRows(){return adjustments.filter(a=>a.amount<0).map(a=>{
 const e=entries.find(e=>e.id===a.entryId),p=payouts.find(p=>p.id===a.recoveryPayoutId),recovered=Number(a.recovered||0),refund=-Number(a.amount);
 return {adjustmentId:a.id,date:a.date,platform:a.platform,account:a.account,currency:a.currency,refundAmount:refund,confirmedRecovery:recovered,unconfirmedAmount:Math.max(0,refund-recovered),linkedEarningsId:a.entryId||'',originalEarningsDate:e?.earnedDate||'',matchedPayoutId:p?.id||'',matchedPayoutDate:p?.received||'',settlementReference:a.recoveryReference||'',reviewStatus:!a.entryId?'Unlinked adjustment':e&&(allocatedTo(e.id)>0||e.status==='Paid')?'Previously paid earnings — verify recovery':'No recorded payout link'};
 });}
function exportRecoveryCSV(){
 const columns=['adjustmentId','date','platform','account','currency','refundAmount','confirmedRecovery','unconfirmedAmount','linkedEarningsId','originalEarningsDate','matchedPayoutId','matchedPayoutDate','settlementReference','reviewStatus'].map(k=>[k,k]);
 exportTableCSV('cloutflow-recovery-review.csv',columns,recoveryReviewRows());toast('Recovery review CSV exported');
}
function exportCSV(){download('cloutflow-transactions.csv',[headers.join(','),...entries.map(e=>headers.map(k=>csvCell(e[k])).join(','))].join('\r\n'),'text/csv;charset=utf-8');toast('CSV exported')}
function backup(){const exportedAt=new Date().toISOString();const filename='cloutflow-backup-'+exportedAt.replace(/[:.]/g,'-')+'.json';const payload={app:'CloutFlow',version:4,exportedAt,entries,accounts,payouts,adjustments};if(typeof CloutFlowRecurringAgreements!=='undefined'){const result=CloutFlowRecurringAgreements.read(localStorage);if(result.error){toast('Backup blocked: recurring agreements require repair');return}payload.recurringAgreements=result.records}if(typeof CloutFlowAgreementSettlements!=='undefined'){const settlementData=CloutFlowAgreementSettlements.read(localStorage);if(settlementData.error){toast('Backup blocked: agreement settlement links require repair');return}payload.agreementSettlements=settlementData.records}if(typeof CloutFlowPaymentFollowups!=='undefined'){const followupData=CloutFlowPaymentFollowups.read(localStorage);if(followupData.error){toast('Backup blocked: payment follow-ups require repair');return}payload.paymentFollowups=followupData.records}download(filename,JSON.stringify(payload,null,2),'application/json');toast('Backup downloaded')}
function parseCSV(text){
 // RFC 4180-style parser: embedded commas, escaped quotes and multiline fields.
 // Reject malformed quoting instead of silently shifting financial columns.
 const rows=[];let row=[],cell='',quoted=false,closed=false,atStart=true;
 const finish=()=>{row.push(cell);if(row.some(v=>v.trim()))rows.push(row);row=[];cell='';closed=false;atStart=true};
 for(let i=0;i<text.length;i++){
  const ch=text[i];
  if(quoted){
   if(ch==='"'){if(text[i+1]==='"'){cell+='"';i++}else{quoted=false;closed=true}}
   else cell+=ch;
  }else if(ch==='"'){
   if(!atStart||closed)throw Error('Unexpected quote in CSV field at character '+(i+1));
   quoted=true;atStart=false;
  }else if(ch===','){
   row.push(cell);cell='';closed=false;atStart=true;
  }else if(ch==='\n'||ch==='\r'){
   if(ch==='\r'&&text[i+1]==='\n')i++;
   finish();
  }else{
   if(closed)throw Error('Unexpected text after closing CSV quote at character '+(i+1));
   cell+=ch;atStart=false;
  }
 }
 if(quoted)throw Error('Unclosed CSV quote');
 if(row.length||cell.length||closed)finish();
 return rows;
}
let pendingImport=null;
function prepareCSVImport(text){
 let rows=parseCSV(text.replace(/^\uFEFF/,''));if(rows.length<2)throw Error('No rows found');
 let cols=rows[0].map(s=>s.trim()),required=['platform','gross','earnedDate'];
 if(required.some(k=>!cols.includes(k)))throw Error('CSV must include platform, gross, and earnedDate columns. Use the app CSV export as a template.');
 if(new Set(cols).size!==cols.length)throw Error('CSV contains duplicate column names');
 let incoming=[];
 for(let [i,row] of rows.slice(1).entries()){
  if(row.length!==cols.length)throw Error('Unexpected number of columns in row '+(i+2));
  let raw={};cols.forEach((k,j)=>raw[k]=row[j]||'');
  if(!raw.platform||!validDate(raw.earnedDate)||!validMoney(raw.gross,false))throw Error('Invalid platform, date or gross amount in row '+(i+2));
  if(raw.currency&&!['USD','CAD','GBP','EUR','AUD','JPY'].includes(raw.currency))throw Error('Invalid currency in row '+(i+2));
  if(raw.status&&!['Pending','Processing','Paid','Disputed'].includes(raw.status))throw Error('Invalid payout status in row '+(i+2));
  if(raw.payoutDate&&(!validDate(raw.payoutDate)||raw.payoutDate<raw.earnedDate))throw Error('Invalid payout date in row '+(i+2));
  if(raw.status==='Paid'&&!raw.payoutDate)throw Error('Paid record needs a payout date in row '+(i+2));
  if(raw.payoutDate&&raw.status!=='Paid')throw Error('Payout date requires Paid status in row '+(i+2));
  for(let k of ['fees','refunds','tax'])if(raw[k]!==''&&!validMoney(raw[k]))throw Error('Invalid '+k+' in row '+(i+2));
  if(Math.round(Number(raw.gross)*100)<['fees','refunds','tax'].reduce((t,k)=>t+Math.round(Number(raw[k]||0)*100),0))throw Error('Deductions exceed gross in row '+(i+2));
  incoming.push(normalize(raw));
 }
 let existing=new Set(entries.map(e=>e.id)),fingerprints=new Set(entries.map(fingerprint)),records=[];
 for(let e of incoming){let f=fingerprint(e),duplicate=existing.has(e.id)||fingerprints.has(f);records.push({entry:e,duplicate});if(!duplicate){existing.add(e.id);fingerprints.add(f)}}
 return records;
}
function parseYouTubeAnalytics(text,account){
 const rows=parseCSV(text.replace(/^\uFEFF/,''));if(rows.length<2)throw Error('YouTube report has no data rows');
 const headers=rows[0].map(v=>v.trim().toLowerCase().replace(/\s+/g,' '));
 const dateCol=headers.findIndex(v=>v==='date');
 const revenueCol=headers.findIndex(v=>/^(estimated revenue|your estimated revenue)( \(usd\)| \[usd\]| \(us dollars\))?$/.test(v));
 if(dateCol<0||revenueCol<0)throw Error('Expected YouTube Analytics columns: Date and Estimated revenue (USD). Other report formats are not supported yet.');
 if(!/usd|us dollars/.test(headers[revenueCol]))throw Error('Revenue currency must be explicitly labeled USD; unlabeled amounts cannot be safely imported');
 if(!account.trim())throw Error('Enter the YouTube channel/account name before importing');
 const imported=[];
 for(const [i,row] of rows.slice(1).entries()){
  if(row.length!==headers.length)throw Error('YouTube row '+(i+2)+' has an unexpected column count');
  let d=row[dateCol].trim();
  if(/^\d{8}$/.test(d))d=d.slice(0,4)+'-'+d.slice(4,6)+'-'+d.slice(6,8);
  if(!validDate(d))throw Error('Invalid date in YouTube row '+(i+2));
  let value=row[revenueCol].trim().replace(/^\$/,'').replace(/,/g,'');
  if(!validMoney(value,false))throw Error('Invalid, zero or negative revenue in YouTube row '+(i+2));
  imported.push(normalize({id:makeId(),channel:'stream',platform:'YouTube',account:account.trim(),incomeType:'Other',currency:'USD',gross:value,fees:0,refunds:0,tax:0,earnedDate:d,status:'Pending',description:'YouTube Analytics estimated daily revenue'}));
 }
 return imported;
}
function parseAppleSalesTrends(text,account){
 // Apple Sales and Trends units/proceeds export is a tab-separated sales report, NOT a financial settlement report.
 if(!account.trim())throw Error('Enter the app/account name before importing Apple proceeds');
 const lines=text.replace(/^\uFEFF/,'').split(/\r?\n/).filter(x=>x.trim());
 if(lines.length<2)throw Error('Apple report has no data rows');
 const cols=lines[0].split('\t').map(v=>v.trim().toLowerCase().replace(/\s+/g,' '));
 if(new Set(cols).size!==cols.length)throw Error('Apple report contains duplicate headers');
 const idx=name=>cols.indexOf(name);
 const dateCol=idx('begin date'),unitsCol=idx('units'),proceedsCol=idx('developer proceeds'),currencyCol=idx('proceeds currency');
 const titleCol=idx('title'),skuCol=idx('sku'),typeCol=idx('product type identifier'),countryCol=idx('country code'),appleIdCol=idx('apple identifier'),parentIdCol=idx('parent identifier');
 if([dateCol,unitsCol,proceedsCol,currencyCol].some(n=>n<0))throw Error('Expected Apple Sales and Trends TSV with Begin Date, Units, Developer Proceeds and Proceeds Currency columns. Financial payout reports cannot be imported with this adapter.');
 const incoming=[];
 for(let i=1;i<lines.length;i++){
  const row=lines[i].split('\t');if(row.length!==cols.length)throw Error('Apple row '+(i+1)+' has an unexpected number of columns');
  let d=row[dateCol].trim();
  if(/^\d{8}$/.test(d))d=d.slice(0,4)+'-'+d.slice(4,6)+'-'+d.slice(6,8);
  if(/^\d{2}\/\d{2}\/\d{4}$/.test(d)){const [mm,dd,yyyy]=d.split('/');d=yyyy+'-'+mm+'-'+dd}
  if(!validDate(d))throw Error('Invalid date in Apple row '+(i+1));
  const units=Number(row[unitsCol]),unitProceeds=Number(row[proceedsCol]);
  if(!Number.isSafeInteger(units)||units<0)throw Error('Apple row '+(i+1)+' has negative/refunded or invalid units. Handle refunds separately; this adapter only accepts nonnegative unit counts.');
  if(!Number.isFinite(unitProceeds)||unitProceeds<0)throw Error('Apple row '+(i+1)+' has invalid developer proceeds');
  const value=Math.round(units*unitProceeds*100)/100;
  if(Math.abs(value-units*unitProceeds)>0.005||!validMoney(value,false))throw Error('Apple row '+(i+1)+' has proceeds that cannot be represented accurately');
  const currency=row[currencyCol].trim().toUpperCase();
  if(!['USD','CAD','GBP','EUR','AUD','JPY'].includes(currency))throw Error('Unsupported Apple proceeds currency '+currency+' in row '+(i+1));
  const product=titleCol>=0?row[titleCol].trim():'';
  const sku=skuCol>=0?row[skuCol].trim():'';
  const productType=typeCol>=0?row[typeCol].trim():'';
  const country=countryCol>=0?row[countryCol].trim():'';
  const appleId=appleIdCol>=0?row[appleIdCol].trim():'';
  const parentId=parentIdCol>=0?row[parentIdCol].trim():'';
  // Apple product-type identifiers are not self-describing. Classify only explicit,
  // recognizable labels; otherwise retain an unclassified category for user review.
  const typeLabel=productType.toLowerCase();
  const category=/subscription/.test(typeLabel)?'Subscriptions':
    /in.app|in app|iap/.test(typeLabel)?'In-app purchases':
    /paid app|paid download/.test(typeLabel)?'Paid downloads':'Other';
  incoming.push(normalize({id:makeId(),channel:'app',platform:'Apple App Store',account:account.trim(),incomeType:category,currency,gross:value,fees:0,refunds:0,tax:0,earnedDate:d,status:'Pending',reference:'',description:'Apple Sales and Trends proceeds'+(product?' · '+product:'')+(sku?' · SKU '+sku:'')+(productType?' · '+productType:'')+(country?' · Territory '+country:'')+(appleId?' · Apple ID '+appleId:'')+(parentId?' · Parent ID '+parentId:'')}));
 }
 return incoming;
}
function parseGooglePlayEarnings(text,account){
 // Strict supported-column adapter, not a claim to support every Play Console export.
 // This adapter only supports positive sale rows; refund/chargeback statement rows need a separate, verified mapping to the adjustment register.
 if(!account.trim())throw Error('Enter the developer account or app name before importing Google Play earnings');
 const rows=parseCSV(text.replace(/^\uFEFF/,''));
 if(rows.length<2)throw Error('Google Play report has no data rows');
 const headers=rows[0].map(h=>h.trim().toLowerCase().replace(/\s+/g,' '));
 if(new Set(headers).size!==headers.length)throw Error('Google Play report has duplicate column headers');
 const idx=(...names)=>names.map(n=>headers.indexOf(n)).find(n=>n>=0)??-1;
 const dateCol=idx('transaction date'),typeCol=idx('transaction type'),amountCol=idx('amount (merchant currency)'),currencyCol=idx('merchant currency'),productCol=idx('product title');
 const idCol=idx('transaction id','order number'),productIdCol=idx('product id','package id');
 if([dateCol,typeCol,amountCol,currencyCol,productCol].some(n=>n<0))throw Error('Unsupported Google Play CSV. Required headers: Transaction Date, Transaction Type, Amount (Merchant Currency), Merchant Currency, Product Title.');
 const incoming=[];
 for(let i=1;i<rows.length;i++){
  const row=rows[i];if(row.length!==headers.length)throw Error('Google Play row '+(i+2)+' has an unexpected column count');
  const kind=row[typeCol].trim();
  if(!/^sale$/i.test(kind))throw Error('Google Play row '+(i+2)+' is '+(kind||'unclassified')+'. Refunds, taxes, chargebacks and other adjustments cannot be imported as sales. Record these separately in the adjustment register.');
  let d=row[dateCol].trim();
  if(/^\d{4}\/\d{2}\/\d{2}$/.test(d))d=d.replaceAll('/','-');
  if(!validDate(d))throw Error('Invalid Google Play date in row '+(i+2)+'; use YYYY-MM-DD');
  const amount=row[amountCol].trim(),currency=row[currencyCol].trim().toUpperCase();
  if(!validMoney(amount,false))throw Error('Google Play row '+(i+2)+' contains invalid, zero or negative merchant-currency proceeds');
  if(!['USD','CAD','GBP','EUR','AUD','JPY'].includes(currency))throw Error('Unsupported Google Play merchant currency in row '+(i+2)+': '+currency);
  const product=row[productCol].trim();if(!product)throw Error('Google Play row '+(i+2)+' is missing a product title');
  const reference=idCol>=0?row[idCol].trim():'';
  const productId=productIdCol>=0?row[productIdCol].trim():'';
  incoming.push(normalize({id:makeId(),channel:'app',platform:'Google Play',account:account.trim(),incomeType:'Other',currency,gross:amount,fees:0,refunds:0,tax:0,earnedDate:d,status:'Pending',reference:reference?('googleplay:'+reference):'',description:'Google Play sale · '+product+(productId?' · Product ID '+productId:'')+(reference?' · Order '+reference:'')}));
 }
 return incoming;
}
function preparePlatformImport(text){
 let incoming=$('importFormat').value==='apple'?parseAppleSalesTrends(text,$('importAccount').value):$('importFormat').value==='google'?parseGooglePlayEarnings(text,$('importAccount').value):parseYouTubeAnalytics(text,$('importAccount').value),existing=new Set(entries.map(e=>e.id)),fingerprints=new Set(entries.map(fingerprint));
 return incoming.map(entry=>{let fp=fingerprint(entry),duplicate=existing.has(entry.id)||fingerprints.has(fp);if(!duplicate){existing.add(entry.id);fingerprints.add(fp)}return {entry,duplicate}});
}
function showImportPreview(text){
 pendingImport=null;
 let format=$('importFormat').value;let records=format==='ledger'?prepareCSVImport(text):preparePlatformImport(text);pendingImport=records;$('importSourceNote').style.display=format==='ledger'?'none':'block';$('importSourceNote').textContent=format==='youtube'?'YouTube Analytics amounts are estimated USD revenue, not final platform proceeds or paid deposits. The category is provisional because the report does not separate monetization types.':format==='google'?'Google Play: only positive Sale rows with explicitly reported merchant-currency amounts are supported. The import is classified as Other until the revenue type is verified. Refunds and adjustments are blocked, and imported sales are not bank deposits.':format==='apple'?'Apple Sales and Trends Developer Proceeds are reported sales proceeds, not confirmed deposits. Negative/refunded units and unsupported currencies are rejected. Unrecognized Apple product codes are labeled Other instead of guessed. This adapter does not support Apple financial settlement reports.':'CloutFlow transaction format.';
 let ready=records.filter(r=>!r.duplicate).length;
 $('importSummary').textContent=`${records.length} rows checked · ${ready} new · ${records.length-ready} duplicate(s) skipped. No changes have been made.`;
 $('importPreviewRows').innerHTML=records.slice(0,30).map(r=>{let e=r.entry;return `<tr><td>${esc(e.platform)}</td><td>${esc(e.account)}</td><td>${esc(e.earnedDate)}</td><td>${esc(e.incomeType)}</td><td>${money(e.gross,e.currency)}</td><td>${money(net(e),e.currency)}</td><td><span class="pill ${r.duplicate?'status-pending':'status-paid'}">${r.duplicate?'Skip duplicate':'New'}</span></td></tr>`}).join('');
 $('confirmImport').disabled=!ready;
 $('confirmImport').textContent=ready?`Import ${ready} new ${ready===1?'record':'records'}`:'No new records';
 $('importPreviewCount').textContent=records.length>30?`Showing first 30 of ${records.length} rows. All ${ready} new records will be imported if confirmed.`:`Showing all ${records.length} rows.`;
 $('importPreviewModal').classList.add('show');
 $('cancelImport').focus({preventScroll:true});
}
function commitCSVImport(){
 if(!pendingImport)return;
 // Recheck against current data at commit time.
 let existing=new Set(entries.map(e=>e.id)),fingerprints=new Set(entries.map(fingerprint)),add=[];
 for(let r of pendingImport){let e=r.entry,f=fingerprint(e);if(existing.has(e.id)||fingerprints.has(f))continue;add.push(e);existing.add(e.id);fingerprints.add(f)}
 if(!add.length){$('confirmImport').disabled=true;toast('No new transactions to import');return}
 let old=entries;entries=[...entries,...add];if(persist()){render();$('importPreviewModal').classList.remove('show');pendingImport=null;toast(`Imported ${add.length} new transactions`)}else entries=old;
}
function importCSV(text){showImportPreview(text)}
function fingerprint(e){return e.reference.trim()?['reference',e.platform,e.account,e.currency,e.reference.trim().toLowerCase()].join('|'):['record',e.channel,e.platform,e.account,e.incomeType,e.currency,e.gross,e.fees,e.refunds,e.tax,e.earnedDate,e.description].join('|')}
function restore(text){let obj=JSON.parse(text);if(!obj||![2,3,4].includes(obj.version)||!Array.isArray(obj.entries))throw Error('Not a compatible CloutFlow / Creator Ledger backup');if((obj.accounts!==undefined&&!Array.isArray(obj.accounts))||(obj.payouts!==undefined&&!Array.isArray(obj.payouts)))throw Error('Backup accounts and payouts must be arrays');if(obj.adjustments!==undefined&&!Array.isArray(obj.adjustments))throw Error('Backup adjustment list must be an array');if(obj.recurringAgreements!==undefined){if(typeof CloutFlowRecurringAgreements==='undefined')throw Error('Agreement backup support is unavailable');const agreements=obj.recurringAgreements;if(!Array.isArray(agreements)||agreements.length>1000||agreements.some(CloutFlowRecurringAgreements.validate)||new Set(agreements.map(a=>a.id)).size!==agreements.length)throw Error('Backup contains invalid recurring agreements');const existing=CloutFlowRecurringAgreements.read(localStorage);if(existing.error)throw Error('Current recurring agreements require repair before a unified restore')}if(obj.agreementSettlements!==undefined){if(typeof CloutFlowAgreementSettlements==='undefined')throw Error('Settlement backup support unavailable');const error=CloutFlowAgreementSettlements.validate(obj.agreementSettlements);if(error)throw Error('Backup settlement links invalid: '+error);if(obj.recurringAgreements===undefined)throw Error('Settlement backup must include agreement records');const oldSettlements=CloutFlowAgreementSettlements.read(localStorage);if(oldSettlements.error)throw Error('Current settlement links require repair before restore')}if(obj.paymentFollowups!==undefined){if(typeof CloutFlowPaymentFollowups==='undefined')throw Error('Payment follow-up backup support unavailable');const followups=obj.paymentFollowups;if(!Array.isArray(followups)||followups.length>10000||!followups.every(CloutFlowPaymentFollowups.validate)||new Set(followups.map(f=>CloutFlowPaymentFollowups.key(f.agreementId,f.due))).size!==followups.length)throw Error('Backup contains invalid payment follow-ups');if(obj.recurringAgreements===undefined)throw Error('Follow-up backup must include recurring agreements');const existingFollowups=CloutFlowPaymentFollowups.read(localStorage);if(existingFollowups.error)throw Error('Current payment follow-ups require repair before restore')}const rawIssue=validateRawFinancialRecords(obj);if(rawIssue)throw Error('Backup: '+rawIssue);let restoredAdjustments=(obj.adjustments||[]).map(a=>({...a}));if(new Set(restoredAdjustments.map(a=>a.id)).size!==restoredAdjustments.length)throw Error('Backup has duplicate adjustment IDs');let restored=obj.entries.map(normalize),restoredAccounts=Array.isArray(obj.accounts)?obj.accounts.map(normalizeAccount):[];if(obj.entries.some(e=>!validMoney(e.gross??e.amount)||['fees','refunds','tax'].some(k=>!validMoney(e[k]))))throw Error('Backup contains invalid monetary amounts');if(restored.some(e=>net(e)<-0.001))throw Error('Backup contains income with deductions greater than gross');if(obj.payouts!==undefined&&!Array.isArray(obj.payouts))throw Error('Backup payout list must be an array');if(Array.isArray(obj.payouts)){for(const p of obj.payouts){if(!validMoney(p.amount,false)||!Array.isArray(p.allocations)||p.allocations.some(a=>!validMoney(a.amount,false)))throw Error('Backup contains invalid payout amounts or allocations')}}let newPayouts=Array.isArray(obj.payouts)?obj.payouts.map(normalizePayout):[];if(auditLedgerDetailed(restored,restoredAccounts,newPayouts).some(f=>f.level==='error'))throw Error('Backup contains critical financial integrity errors');if(auditAdjustments(restoredAdjustments,restored,newPayouts).some(f=>f.level==='error'))throw Error('Backup contains invalid adjustment links or values');if(new Set(restored.map(e=>e.id)).size!==restored.length)throw Error('Backup has duplicate income IDs');if(new Set(newPayouts.map(p=>p.id)).size!==newPayouts.length)throw Error('Backup has duplicate payout IDs');if(restored.some(e=>!validDate(e.earnedDate)||(e.payoutDate&&(!validDate(e.payoutDate)||e.payoutDate<e.earnedDate))||(e.status==='Paid'&&!e.payoutDate)||!['USD','CAD','GBP','EUR','AUD','JPY'].includes(e.currency)))throw Error('Backup has invalid income dates or currencies');let allocations=new Map();for(const p of newPayouts){const error=validatePayoutData(p,restored,newPayouts);if(error)throw Error('Backup payout invalid: '+error)}for(const p of newPayouts){if(p.amount<=0||sum(p.allocations,a=>a.amount)>p.amount+.001)throw Error('Backup has an invalid payout');for(const a of p.allocations){let e=restored.find(e=>e.id===a.entryId);if(!e||e.platform!==p.platform||e.account!==p.account||e.currency!==p.currency||a.amount<=0)throw Error('Backup has an invalid payout allocation');allocations.set(a.entryId,(allocations.get(a.entryId)||0)+a.amount)}}for(const [eid,value] of allocations){if(restored.find(e=>e.id===eid)?.status==='Paid')throw Error('Backup mixes paid status with reconciled allocations');if(value>net(restored.find(e=>e.id===eid))+.001)throw Error('Backup overallocates an income record')}if(obj.agreementSettlements!==undefined){const scheduled=CloutFlowRecurringAgreements.schedule(obj.recurringAgreements,'1900-01-01','2100-01-01');const check=CloutFlowAgreementSettlements.reconcile(scheduled,newPayouts,obj.agreementSettlements);if(check.issues.length)throw Error('Backup settlement links conflict with agreements or deposits: '+check.issues[0].reason)}const restoreCounts=[['income records',restored.length],['accounts',restoredAccounts.length],['deposits',newPayouts.length],['adjustments',restoredAdjustments.length]];if(obj.recurringAgreements!==undefined)restoreCounts.push(['agreements',obj.recurringAgreements.length]);if(obj.agreementSettlements!==undefined)restoreCounts.push(['settlement links',obj.agreementSettlements.length]);if(obj.paymentFollowups!==undefined)restoreCounts.push(['payment follow-ups',obj.paymentFollowups.length]);const backupSummary=restoreCounts.map(([label,count])=>`${count} ${label}`).join(', ');const retainedExtras=['recurringAgreements','agreementSettlements','paymentFollowups'].filter(k=>obj[k]===undefined);const legacyNotice=retainedExtras.length?'\n\nThis older backup does not contain '+retainedExtras.map(k=>({recurringAgreements:'agreements',agreementSettlements:'settlement links',paymentFollowups:'payment follow-ups'}[k])).join(', ')+'. Those existing records will be preserved.':'';if(!confirm(`Restore backup containing ${backupSummary}?\n\nThis replaces your current income ledger, accounts, deposits, and adjustments. Export your current backup first.${legacyNotice}`))return;let old=entries,oldAccounts=accounts,oldPayouts=payouts,oldAdjustments=adjustments;const previousLedgerRaw=localStorage.getItem(KEY);const previousAgreementsRaw=typeof CloutFlowRecurringAgreements!=='undefined'?localStorage.getItem(CloutFlowRecurringAgreements.KEY):null;const previousSettlementsRaw=typeof CloutFlowAgreementSettlements!=='undefined'?localStorage.getItem(CloutFlowAgreementSettlements.KEY):null;const previousFollowupsRaw=typeof CloutFlowPaymentFollowups!=='undefined'?localStorage.getItem(CloutFlowPaymentFollowups.KEY):null;function rollbackUnified(){entries=old;accounts=oldAccounts;payouts=oldPayouts;adjustments=oldAdjustments;try{for(const [k,v] of [[KEY,previousLedgerRaw],[CloutFlowRecurringAgreements?.KEY,previousAgreementsRaw],[CloutFlowAgreementSettlements?.KEY,previousSettlementsRaw],[CloutFlowPaymentFollowups?.KEY,previousFollowupsRaw]]){if(!k)continue;if(v===null)localStorage.removeItem(k);else localStorage.setItem(k,v)}}catch{}}entries=restored;accounts=restoredAccounts;payouts=newPayouts;adjustments=restoredAdjustments;if(!persist(true)){entries=old;accounts=oldAccounts;payouts=oldPayouts;adjustments=oldAdjustments;return}if(obj.recurringAgreements!==undefined&&!CloutFlowRecurringAgreements.save(localStorage,obj.recurringAgreements)){rollbackUnified();throw Error('Could not restore recurring agreements; financial data rollback attempted')}if(obj.agreementSettlements!==undefined&&!CloutFlowAgreementSettlements.save(localStorage,obj.agreementSettlements)){rollbackUnified();throw Error('Could not restore settlement links; rollback attempted')}if(obj.paymentFollowups!==undefined&&!CloutFlowPaymentFollowups.save(localStorage,obj.paymentFollowups)){rollbackUnified();throw Error('Could not restore payment follow-ups; rollback attempted')}ledgerReadOnly=false;integrityLoadFailure='';render();window.CloutFlowAgreementUIInstance?.refresh();toast('Backup restored')}

function normalizeAccount(a){return {id:String(a.id||makeId()),name:String(a.name||'').trim(),channel:['stream','app','commerce'].includes(a.channel)?a.channel:'stream',platform:String(a.platform||'Other streaming / social'),notes:String(a.notes||'')}}
function updateManagedPlatform(selected){let ch=$('managedChannel').value;$('managedPlatform').innerHTML=Object.keys(catalogs[ch]).map(p=>`<option value="${esc(p)}">${esc(p)}</option>`).join('');if(selected&&catalogs[ch][selected])$('managedPlatform').value=selected}
function showAccountModal(a){if(!requireWritable())return;$('accountForm').reset();$('managedAccountId').value=a?.id||'';$('managedAccountName').value=a?.name||'';$('managedChannel').value=a?.channel||'stream';updateManagedPlatform(a?.platform);$('managedNotes').value=a?.notes||'';$('accountModalTitle').textContent=a?'Edit creator account':'Add creator account';$('removeManagedAccount').classList.toggle('hidden',!a);$('accountModal').classList.add('show')}
function accountCurrencyTotals(account,period){const totals=new Map();for(const e of period){if(e.platform!==account.platform||e.account!==account.name)continue;totals.set(e.currency,(totals.get(e.currency)||0)+net(e))}return [...totals].sort(([a],[b])=>a.localeCompare(b))}
function renderAccounts(){let all=periodEntries(),merged=new Map();for(let a of accounts)merged.set(a.platform+'\u001f'+a.name,{...a,tracked:true});for(let e of entries){if(!e.account.trim())continue;let key=e.platform+'\u001f'+e.account;if(!merged.has(key))merged.set(key,{id:'',name:e.account,platform:e.platform,channel:e.channel,notes:'',tracked:false})}
let allCards=[...merged.values()].sort((a,b)=>a.platform.localeCompare(b.platform)||a.name.localeCompare(b.name));let cards=CloutFlowAccountDirectory.filter(allCards,$('accountDirectorySearch').value,$('accountDirectoryStatus').value);let counts=CloutFlowAccountDirectory.summary(allCards,cards);$('accountDirectoryCount').textContent=`Showing ${counts.visible} of ${counts.total} accounts · ${counts.managed} managed`; $('accountCards').innerHTML=cards.map(a=>{let totals=accountCurrencyTotals(a,all);let amounts=totals.length?totals.map(([currency,value])=>`<span class="account-currency-total">${money(value,currency)} <span>${esc(currency)}</span></span>`).join(''):'<span class="account-no-earnings">No earnings in selected period</span>';let button=a.tracked?`<button type="button" class="btn small" data-account-edit="${esc(a.id)}">Edit account</button>`:`<button type="button" class="btn small" data-account-track="${esc(a.platform+'\u001f'+a.name)}">Manage account</button>`;return `<article class="platform account-summary-card"><div class="platform-ico" aria-hidden="true">✦</div><div class="account-summary-content"><strong class="account-summary-name">${esc(a.name)}</strong><small class="account-summary-platform">${esc(a.platform)}</small><div class="account-currency-list" aria-label="Net earnings by currency">${amounts}</div><div class="account-summary-actions">${button}</div></div></article>`}).join('')||`<div class="empty" style="grid-column:1/-1">${allCards.length?'No accounts match your search.':'Add an account or record income to get started.'}</div>`}
$('accountDirectorySearch').addEventListener('input',renderAccounts);$('accountDirectoryStatus').addEventListener('change',renderAccounts);$('manageAccountBtn').onclick=()=>showAccountModal();$('closeAccountModal').onclick=()=>$('accountModal').classList.remove('show');$('accountModal').onclick=e=>{if(e.target===$('accountModal'))$('accountModal').classList.remove('show')};$('managedChannel').onchange=()=>updateManagedPlatform();
$('accountCards').onclick=e=>{let b=e.target.closest('button');if(!b)return;if(b.hasAttribute('data-account-edit')){let a=accounts.find(x=>x.id===b.dataset.accountEdit);if(a)showAccountModal(a)}else if(b.hasAttribute('data-account-track')){let [platform,name]=b.dataset.accountTrack.split('\u001f');showAccountModal({name,platform,channel:entries.find(e=>e.platform===platform&&e.account===name)?.channel||'stream',notes:''})}};
$('accountForm').onsubmit=e=>{e.preventDefault();if(!requireWritable())return;let a=normalizeAccount({id:$('managedAccountId').value||makeId(),name:$('managedAccountName').value,channel:$('managedChannel').value,platform:$('managedPlatform').value,notes:$('managedNotes').value});if(!a.name){toast('Enter an account name');return}if(accounts.some(x=>x.id!==a.id&&x.name.toLowerCase()===a.name.toLowerCase()&&x.platform===a.platform)){toast('This account already exists');return}let previous=accounts.find(x=>x.id===a.id),oldEntries=entries.map(x=>({...x})),oldAccounts=accounts.map(x=>({...x})),oldPayouts=payouts.map(x=>({...x,allocations:x.allocations.map(y=>({...y}))}));let oldAdjustments=adjustments.map(x=>({...x}));if(previous&&(previous.name!==a.name||previous.platform!==a.platform)){const affected=payouts.filter(p=>p.account===previous.name&&p.platform===previous.platform);if(affected.length&&a.platform!==previous.platform){toast('Cannot move an account with payout records to a different platform. Reconcile those payouts first.');return}if(affected.some(p=>payouts.some(other=>other.id!==p.id&&other.platform===a.platform&&other.account===a.name&&other.reference&&other.reference===p.reference))){toast('Account rename would create duplicate payout references');return}entries=entries.map(x=>x.account===previous.name&&x.platform===previous.platform?{...x,account:a.name,platform:a.platform,channel:a.channel}:x);payouts=payouts.map(p=>p.account===previous.name&&p.platform===previous.platform?{...p,account:a.name,platform:a.platform}:p);adjustments=adjustments.map(x=>x.account===previous.name&&x.platform===previous.platform?{...x,account:a.name,platform:a.platform}:x)}let i=accounts.findIndex(x=>x.id===a.id);if(i<0)accounts.push(a);else accounts[i]=a;if(auditAdjustments(adjustments,entries,payouts).some(f=>f.level==='error')){entries=oldEntries;accounts=oldAccounts;payouts=oldPayouts;adjustments=oldAdjustments;toast('Account change would invalidate linked adjustments');return}if(!persist()){entries=oldEntries;accounts=oldAccounts;payouts=oldPayouts;adjustments=oldAdjustments;return}$('accountModal').classList.remove('show');render();toast('Account saved')};
$('removeManagedAccount').onclick=()=>{if(!requireWritable())return;let a=accounts.find(x=>x.id===$('managedAccountId').value);if(!a)return;if(!confirm('Remove this account from your account manager? Transactions will be kept.'))return;let old=accounts;accounts=accounts.filter(x=>x.id!==a.id);if(!persist()){accounts=old;return}$('accountModal').classList.remove('show');render();toast('Account removed; transactions retained')};


// Reconciliation register: actual deposits and allocations are stored separately from earned revenue.
function normalizePayout(p){return {id:String(p.id||makeId()),platform:String(p.platform||''),account:String(p.account||''),currency:String(p.currency||'USD'),amount:Number(p.amount),received:String(p.received||''),reference:String(p.reference||''),notes:String(p.notes||''),allocations:Array.isArray(p.allocations)?p.allocations.map(a=>({entryId:String(a.entryId),amount:Number(a.amount)})):[]}}
function allocatedTo(entryId,excludePayoutId=''){return sum(payouts.filter(p=>p.id!==excludePayoutId),p=>sum(p.allocations.filter(a=>a.entryId===entryId),a=>a.amount))}
function payoutReconciliationSummary(ledger=entries,paymentList=payouts,adjustmentList=adjustments,filter=dateInPeriod){
 const currencies=new Set([...ledger.map(e=>e.currency),...paymentList.map(p=>p.currency),...adjustmentList.map(a=>a.currency)]);
 return [...currencies].sort().map(currency=>{
  const periodEarnings=ledger.filter(e=>e.currency===currency&&filter(e.earnedDate));
  const periodAdjustments=adjustmentList.filter(a=>a.currency===currency&&filter(a.date));
  const deposits=paymentList.filter(p=>p.currency===currency&&filter(p.received));
  const allocated=sum(deposits,p=>sum(p.allocations,a=>a.amount));
  const received=sum(deposits,p=>p.amount);
  const legacyPaid=sum(ledger.filter(e=>e.currency===currency&&e.status==='Paid'&&e.payoutDate&&filter(e.payoutDate)&&!paymentList.some(p=>p.allocations.some(a=>a.entryId===e.id))),net);
  const gross=sum(periodEarnings,e=>e.gross),earnedNet=sum(periodEarnings,net),adjustmentNet=sum(periodAdjustments,a=>a.amount);
  return {currency,gross,earnedNet,adjustmentNet,adjustedNet:earnedNet+adjustmentNet,received,allocated,unallocated:Math.max(0,received-allocated),legacyPaid,depositCount:deposits.length};
 });
}
function renderReconciliationSummary(){
 const rows=payoutReconciliationSummary();
 $('reconciliationSummary').innerHTML=rows.map(r=>`<div class="platform" style="align-items:flex-start"><div class="platform-ico">${esc(r.currency)}</div><div style="min-width:0"><strong>${esc(r.currency)} · ${money(r.received,r.currency)} deposits</strong><small>${money(r.allocated,r.currency)} allocated · ${money(r.unallocated,r.currency)} unallocated</small><small>Earned net ${money(r.earnedNet,r.currency)} · Adjustments ${money(r.adjustmentNet,r.currency)}</small><small>Adjusted revenue ${money(r.adjustedNet,r.currency)} · Legacy paid ${money(r.legacyPaid,r.currency)}</small></div></div>`).join('')||'<div class="empty">No records for the selected period.</div>';
}
function exportPayoutReconciliation(){
 const rows=payouts.map(p=>{const allocated=sum(p.allocations,a=>a.amount);return [p.id,p.received,p.platform,p.account,p.currency,p.amount,allocated,Math.max(0,p.amount-allocated),p.reference,p.notes,p.allocations.map(a=>a.entryId+':'+a.amount).join('; ')];});
 exportTableCSV('cloutflow-payout-reconciliation.csv',['Payout ID','Deposit date','Platform','Account','Currency','Deposit amount','Allocated amount','Unallocated amount','Reference','Notes','Earnings allocations'],rows);
 toast('Payout worksheet exported');
}
function settlementRows(ledger=entries,paymentList=payouts){
 return ledger.map(e=>{const allocated=sum(paymentList,p=>sum(p.allocations.filter(a=>a.entryId===e.id),a=>a.amount));const earned=net(e);const remaining=Math.max(0,Math.round((earned-allocated)*100)/100);const legacyPaid=e.status==='Paid'&&allocated<0.001;
 let settlementStatus=legacyPaid?'Legacy paid — not allocated':allocated>=earned-0.001?'Fully allocated':allocated>0?'Partially allocated':'Not allocated';
 if(earned<0.001)settlementStatus='Zero net earnings';
 return {entry:e,earned,allocated,remaining,legacyPaid,settlementStatus};
 });
}
function renderSettlementReview(){
 const rows=settlementRows(entries.filter(e=>dateInPeriod(e.earnedDate))).sort((a,b)=>b.entry.earnedDate.localeCompare(a.entry.earnedDate));
 $('settlementReviewRows').innerHTML=rows.map(r=>{const e=r.entry;return `<tr><td data-label="Earned">${esc(e.earnedDate)}</td><td data-label="Platform / account">${esc(e.platform)}<div class="subtext">${esc(e.account||'No account')}</div></td><td data-label="Net" class="amount">${money(r.earned,e.currency)}</td><td data-label="Allocated" class="amount">${money(r.allocated,e.currency)}</td><td data-label="Unallocated" class="amount">${money(r.remaining,e.currency)}</td><td data-label="Status"><span class="pill">${esc(r.settlementStatus)}</span></td><td data-label="Action" class="mobile-row-action"><button class="btn small" data-settlement-entry="${esc(e.id)}">Review</button></td></tr>`}).join('');
 $('settlementReviewEmpty').style.display=rows.length?'none':'block';
}
function exportSettlementReview(){
 const rows=settlementRows().map(r=>{const e=r.entry;return [e.id,e.earnedDate,e.platform,e.account,e.currency,e.gross,e.fees,e.refunds,e.tax,r.earned,r.allocated,r.remaining,e.status,r.settlementStatus,e.reference,e.description];});
 exportTableCSV('cloutflow-earnings-settlement.csv',['Earnings ID','Earned date','Platform','Account','Currency','Gross','Fees','Refunds','Tax withheld','Net earnings','Deposit allocations','Unallocated earnings','Income status','Settlement status','Reference','Description'],rows);
 toast('Earnings settlement worksheet exported');
}
$('exportSettlementReview').onclick=exportSettlementReview;
$('settlementReviewRows').onclick=e=>{const btn=e.target.closest('[data-settlement-entry]');if(!btn)return;const entry=entries.find(x=>x.id===btn.dataset.settlementEntry);if(entry)editEntry(entry.id)};
function renderPayoutQueue(){
 const pending=CloutFlowPayoutQueue.pending(payouts.filter(p=>dateInPeriod(p.received)));
 const totals=CloutFlowPayoutQueue.totals(pending);
 $('payoutQueueCount').textContent=pending.length+' deposit'+(pending.length===1?'':'s');
 $('payoutQueueTotals').innerHTML=totals.map(t=>`<span class="pill">${esc(t.currency)}: ${money(t.remaining,t.currency)} · ${t.count} deposit${t.count===1?'':'s'}</span>`).join('');
 $('payoutQueueRows').innerHTML=pending.map(p=>`<article class="payout-queue-item"><div class="payout-queue-copy"><strong>${esc(p.platform)} · ${esc(p.account||'No account')}</strong><small>${esc(p.received)} · ${esc(p.reference||'No reference')}</small></div><div class="payout-queue-amount"><strong>${money(p.remaining,p.currency)}</strong><small>Unallocated</small></div><button type="button" class="btn small" data-queue-payout="${esc(p.id)}" aria-label="Review payout for ${esc(p.platform)} ${esc(p.account||'No account')} received ${esc(p.received)}">Review</button></article>`).join('')||'<div class="empty">No unallocated deposits in this reporting period.</div>';
}
$('payoutQueueRows').addEventListener('click',e=>{const button=e.target.closest('[data-queue-payout]');if(!button)return;const payout=payouts.find(p=>p.id===button.dataset.queuePayout);if(payout)openPayout(payout)});
function renderReconciliation(){let shown=payouts.filter(p=>dateInPeriod(p.received)).sort((a,b)=>b.received.localeCompare(a.received));$('reconciliationRows').innerHTML=shown.map(p=>{let allocated=sum(p.allocations,a=>a.amount);return `<tr><td data-label="Received">${esc(p.received)}</td><td data-label="Platform / account">${esc(p.platform)}<div class="subtext">${esc(p.account||'No account')}</div></td><td data-label="Deposit" class="amount">${money(p.amount,p.currency)}</td><td data-label="Allocated" class="amount">${money(allocated,p.currency)}</td><td data-label="Unallocated" class="amount">${money(Math.max(0,p.amount-allocated),p.currency)}</td><td data-label="Reference">${esc(p.reference||'—')}</td><td data-label="Action" class="mobile-row-action"><button class="btn small" data-payout-edit="${esc(p.id)}">Edit</button></td></tr>`}).join('');$('reconciliationEmpty').style.display=shown.length?'none':'block'}
function payoutOptions(){let platforms=[...new Set([...entries.map(e=>e.platform),...accounts.map(a=>a.platform)])].filter(Boolean).sort();$('payoutPlatform').innerHTML=platforms.map(p=>`<option value="${esc(p)}">${esc(p)}</option>`).join('')||'<option value="">Add income first</option>'}
function payoutAccounts(selected){let platform=$('payoutPlatform').value;let names=[...new Set([...entries.filter(e=>e.platform===platform).map(e=>e.account),...accounts.filter(a=>a.platform===platform).map(a=>a.name)])].sort();$('payoutAccount').innerHTML=names.map(n=>`<option value="${esc(n)}">${esc(n||'(No account)')}</option>`).join('')||'<option value="">(No account)</option>';if(selected!==undefined&&names.includes(selected))$('payoutAccount').value=selected}
function payoutAllocationRows(existing){let p=$('payoutPlatform').value,a=$('payoutAccount').value,c=$('payoutCurrency').value,oldId=$('payoutRecordId').value;let previous=new Map((existing?.allocations||[]).map(x=>[x.entryId,x.amount]));let matching=entries.filter(e=>e.platform===p&&e.account===a&&e.currency===c).sort((x,y)=>x.earnedDate.localeCompare(y.earnedDate)||x.id.localeCompare(y.id));$('payoutAllocations').innerHTML=matching.map(e=>{let available=Math.max(0,net(e)-allocatedTo(e.id,oldId));return `<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:9px"><div><strong>${esc(e.incomeType)}</strong><div class="subtext">${esc(e.earnedDate)} · ${esc(e.description||e.reference||e.id.slice(0,8))} · available ${money(available,c)}</div></div><input type="number" data-allocation="${esc(e.id)}" min="0" max="${available.toFixed(2)}" step="0.01" value="${previous.get(e.id)||0}" style="width:100px;background:#18253a;color:white;border:1px solid #364968;border-radius:9px;padding:8px"></div>`}).join('')||'<div class="hint">No matching income entries. You may save the deposit unallocated.</div>';allocationPreview()}
function allocationPreview(){let total=sum([...$('payoutAllocations').querySelectorAll('[data-allocation]')],el=>num(el.value));$('allocationSummary').textContent=money(total,$('payoutCurrency').value)+' allocated'}
function payoutDuplicatePreview(){
 const draft={id:$('payoutRecordId').value,platform:$('payoutPlatform').value,account:$('payoutAccount').value,currency:$('payoutCurrency').value,received:$('payoutReceived').value,amount:$('payoutAmount').value};
 const matches=CloutFlowPayoutDuplicates.candidates(draft,payouts);
 const warning=$('payoutDuplicateWarning');
 warning.classList.toggle('hidden',!matches.length);
 warning.textContent=matches.length?`Possible duplicate deposit: ${matches.length} existing record(s) have the same account, date, currency and amount. Review your bank statement before saving.`:'';
 return matches;
}
function openPayout(p){if(!requireWritable())return;$('payoutForm').reset();$('payoutRecordId').value=p?.id||'';payoutOptions();if(p&&[...$('payoutPlatform').options].some(o=>o.value===p.platform))$('payoutPlatform').value=p.platform;payoutAccounts(p?.account);$('payoutCurrency').value=p?.currency||'USD';$('payoutAmount').value=p?.amount??'';$('payoutReceived').value=p?.received||today();$('payoutReference').value=p?.reference||'';$('payoutNotes').value=p?.notes||'';$('deletePayoutBtn').classList.toggle('hidden',!p);payoutAllocationRows(p);payoutDuplicatePreview();$('payoutModal').classList.add('show')}
$('exportPayoutReconciliation').onclick=exportPayoutReconciliation;$('newPayoutBtn').onclick=()=>openPayout();$('cancelPayoutBtn').onclick=()=>$('payoutModal').classList.remove('show');$('payoutModal').onclick=e=>{if(e.target===$('payoutModal'))$('payoutModal').classList.remove('show')};$('payoutPlatform').onchange=()=>{payoutAccounts();payoutAllocationRows();payoutDuplicatePreview()};$('payoutAccount').onchange=()=>{payoutAllocationRows();payoutDuplicatePreview()};$('payoutCurrency').onchange=()=>{payoutAllocationRows();payoutDuplicatePreview()};$('payoutAllocations').oninput=allocationPreview;for(const id of ['payoutPlatform','payoutAccount','payoutCurrency','payoutAmount','payoutReceived'])$(id).addEventListener('change',payoutDuplicatePreview);$('payoutAmount').addEventListener('input',payoutDuplicatePreview);
$('reconciliationRows').onclick=e=>{let btn=e.target.closest('[data-payout-edit]');if(btn){let p=payouts.find(p=>p.id===btn.dataset.payoutEdit);if(p)openPayout(p)}};
function payoutFinancialDetailsChanged(before,after){
 if(before.platform!==after.platform||before.account!==after.account||before.currency!==after.currency||before.amount!==after.amount||before.received!==after.received)return true;
 const allocations=p=>(p.allocations||[]).map(a=>[a.entryId,Number(a.amount)]).sort((a,b)=>a[0].localeCompare(b[0]));
 return JSON.stringify(allocations(before))!==JSON.stringify(allocations(after));
}
$('payoutForm').onsubmit=e=>{e.preventDefault();if(!requireWritable())return;
// Validate raw form fields before normalizePayout converts strings into numbers.
// Otherwise a blank allocation or an invalid amount could become zero silently.
const rawAmount=$('payoutAmount').value;
if(!validMoney(rawAmount,false)){toast('Deposit amount must be a positive number with at most two decimals');return}
const rawAllocationFields=[...$('payoutAllocations').querySelectorAll('[data-allocation]')];
if(rawAllocationFields.some(el=>el.value.trim()!==''&&!validMoney(el.value))){toast('Allocations must use valid nonnegative amounts with at most two decimals');return}
let record=normalizePayout({id:$('payoutRecordId').value||makeId(),platform:$('payoutPlatform').value,account:$('payoutAccount').value,currency:$('payoutCurrency').value,amount:$('payoutAmount').value,received:$('payoutReceived').value,reference:$('payoutReference').value,notes:$('payoutNotes').value,allocations:[...$('payoutAllocations').querySelectorAll('[data-allocation]')].filter(el=>el.value.trim()!==''&&Number(el.value)>0).map(el=>({entryId:el.dataset.allocation,amount:Number(el.value)}))});const payoutError=validatePayoutData(record,entries,payouts);if(payoutError){toast(payoutError);return}if(!record.platform||!record.received||!/^\d{4}-\d{2}-\d{2}$/.test(record.received)||!Number.isFinite(new Date(record.received+'T12:00:00').getTime())||record.amount<=0){toast('Enter a valid platform, deposit date and amount');return}let total=sum(record.allocations,a=>a.amount);if(total>record.amount+.001){toast('Allocated amount exceeds deposit');return}for(let a of record.allocations){let entry=entries.find(e=>e.id===a.entryId);if(!entry||entry.platform!==record.platform||entry.account!==record.account||entry.currency!==record.currency||a.amount>net(entry)-allocatedTo(a.entryId,record.id)+.001){toast('An allocation exceeds available matching earnings');return}}if(record.reference.trim()&&payouts.some(p=>p.id!==record.id&&p.platform===record.platform&&p.account===record.account&&p.currency===record.currency&&p.reference.trim().toLowerCase()===record.reference.trim().toLowerCase())){toast('This payout reference already exists');return}
if(CloutFlowPayoutDuplicates.candidates(record,payouts).length&&!confirm('Possible duplicate deposit: an existing payout has the same account, date, currency and amount. Have you verified this is a separate deposit?'))return;
const previousPayout=payouts.find(p=>p.id===record.id);
if(previousPayout&&payoutFinancialDetailsChanged(previousPayout,record)&&!confirm('This edit changes a recorded deposit or its allocations. Verify the amount, date and settlement statement before replacing the existing record. Continue?'))return;
let old=[...payouts],idx=payouts.findIndex(p=>p.id===record.id);if(idx<0)payouts.push(record);else payouts[idx]=record;if(adjustments.some(a=>a.recoveryPayoutId===record.id&&validateRecoveryMatch(a,payouts))){payouts=old;toast('Payout edit would invalidate a confirmed recovery match. Unlink the adjustment first.');return}if(!persist()){payouts=old;return}$('payoutModal').classList.remove('show');render();toast('Payout recorded')};
$('deletePayoutBtn').onclick=()=>{if(!requireWritable())return;let id=$('payoutRecordId').value;if(adjustments.some(a=>a.recoveryPayoutId===id)){toast('This payout is linked to a confirmed recovery. Unlink the adjustment before deleting it.');return}if(!confirm('Delete this payout and its allocations? Earnings records will remain unchanged.'))return;let old=payouts;payouts=payouts.filter(p=>p.id!==id);if(!persist()){payouts=old;return}$('payoutModal').classList.remove('show');render();toast('Payout deleted')};

$('entries').onclick=event=>{const button=event.target.closest('button');if(!button)return;if(button.hasAttribute('data-income-edit'))editEntry(button.dataset.incomeEdit);else if(button.hasAttribute('data-income-copy'))duplicateEntry(button.dataset.incomeCopy)};
$('addBtn').onclick=()=>openModal();$('platformAdd').onclick=()=>openModal();$('mobileAdd').onclick=()=>openModal();$('cancel').onclick=closeModal;$('modal').onclick=e=>{if(e.target===$('modal'))closeModal()};$('channel').onchange=()=>updatePlatform();$('platform').onchange=()=>{updateTypes();$('savedAccounts').innerHTML=accounts.filter(a=>a.platform===$('platform').value).map(a=>`<option value="${esc(a.name)}"></option>`).join('')};for(let k of ['gross','fees','refunds','tax','currency'])$(k).addEventListener('input',preview);$('deleteFromModal').onclick=deleteEntry;$('period').onchange=e=>{selectedPeriod=e.target.value;render()};$('search').oninput=render;$('typeFilter').onchange=render;$('accountFilter').onchange=render;$('insightAccount').onchange=()=>renderAccountInsights(periodEntries());$('statusFilter').onchange=render;$('ledgerSort').onchange=render;$('clearSearch').onclick=()=>{$('search').value='';render();$('search').focus()};$('resetLedgerFilters').onclick=()=>{$('search').value='';$('accountFilter').value='all';$('typeFilter').value='all';$('statusFilter').value='all';$('ledgerSort').value='newest';render();$('search').focus()};document.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'&&!e.altKey){e.preventDefault();$('search').focus();$('search').select()}else if(e.key==='Escape'&&document.activeElement===$('search')&&$('search').value){$('search').value='';render()}});
$('incomeForm').onsubmit=e=>{e.preventDefault();if(!requireWritable())return;let gross=Number($('gross').value);if(!validMoney($('gross').value,false)){toast('Gross earnings must be positive with at most two decimals');return}let obj={id:$('entryId').value||makeId()};for(let k of ['channel','platform','account','incomeType','currency','gross','fees','refunds','tax','earnedDate','payoutDate','status','reference','description'])obj[k]=$(k).value;if(['gross','fees','refunds','tax'].some(k=>!validMoney(obj[k]))){toast('Amounts must be valid nonnegative values with at most two decimals');return}obj=normalize(obj);if(obj.fees+obj.refunds+obj.tax>obj.gross){toast('Deductions cannot exceed gross earnings');return}if(!/^\d{4}-\d{2}-\d{2}$/.test(obj.earnedDate)||!validDate(obj.earnedDate)){toast('Enter a valid earned date');return}if(allocatedTo(obj.id)>0&&obj.status==='Paid'){toast('Use the payout register for reconciled earnings');return}if(obj.status==='Paid'&&!obj.payoutDate){toast('Add the payout date for paid earnings');return}if(obj.payoutDate&&(!/^\d{4}-\d{2}-\d{2}$/.test(obj.payoutDate)||obj.payoutDate<obj.earnedDate)){toast('Payout date must be valid and not before earned date');return}if(obj.payoutDate&&obj.status!=='Paid'){toast('Payout date requires Paid status');return}let alreadyAllocated=allocatedTo(obj.id);if(alreadyAllocated>0&&payouts.some(p=>p.allocations.some(a=>a.entryId===obj.id)&&p.received<obj.earnedDate)){toast('Earned date cannot be later than an already allocated payout date');return}if(alreadyAllocated>0&&(obj.platform!==entries.find(x=>x.id===obj.id)?.platform||obj.account!==entries.find(x=>x.id===obj.id)?.account||obj.currency!==entries.find(x=>x.id===obj.id)?.currency||net(obj)+.001<alreadyAllocated)){toast('Existing payout allocations must remain valid. Edit or remove allocations first.');return}if(adjustments.some(a=>a.entryId===obj.id&&(a.platform!==obj.platform||a.account!==obj.account||a.currency!==obj.currency||a.date<obj.earnedDate))){toast('Linked adjustments would become invalid. Unlink or update them first.');return}if(alreadyAllocated>0&&obj.status==='Paid'){toast('This income has recorded payout allocations. Keep its status Pending/Processing to avoid double counting.');return}let idx=entries.findIndex(x=>x.id===obj.id),old=[...entries];if(idx>=0)entries[idx]=obj;else entries.push(obj);if(persist()){closeModal();render();toast('Transaction saved')}else entries=old};
function openImportOptions(){if(!requireWritable())return;$('importOptionsModal').classList.add('show')} $('cancelImportOptions').onclick=()=>$('importOptionsModal').classList.remove('show');$('chooseImportFile').onclick=()=>{$('importOptionsModal').classList.remove('show');$('csvFile').click()};$('cancelImport').onclick=()=>{$('importPreviewModal').classList.remove('show');pendingImport=null;$('importBtn')?.focus()};$('confirmImport').onclick=commitCSVImport;$('exportBtn').onclick=exportCSV;$('mobileExport').onclick=exportCSV;$('backupBtn').onclick=backup;$('mobileBackup').onclick=backup;$('mobileImport').onclick=()=>openImportOptions();$('mobileRestore').onclick=()=>$('backupFile').click();$('importBtn').onclick=()=>openImportOptions();$('restoreBtn').onclick=()=>$('backupFile').click();$('csvFile').onchange=async e=>{let f=e.target.files[0];if(!f)return;try{importCSV(await f.text())}catch(err){alert('CSV import failed: '+err.message)}e.target.value=''};$('backupFile').onchange=async e=>{let f=e.target.files[0];if(!f)return;try{restore(await f.text())}catch(err){alert('Restore failed: '+err.message)}e.target.value=''};
$('exportAdjustments').onclick=exportAdjustmentCSV;$('exportRecoveries').onclick=exportRecoveryCSV;$('integrityRefresh').onclick=()=>{renderIntegrity();toast('Integrity review refreshed')};$('integrityExport').onclick=exportIntegrity;$('integrityRaw').onclick=()=>{try{const raw=localStorage.getItem(KEY);if(raw===null){toast('No saved data found');return}download('cloutflow-raw-recovery.txt',raw,'text/plain');toast('Raw saved data exported')}catch(error){console.error('Raw data recovery failed:',error);toast('Could not read saved data. Check browser storage permissions.')}};

function matchingRecoveryPayouts(a,paymentList=payouts){return paymentList.filter(p=>p.platform===a.platform&&p.account===a.account&&p.currency===a.currency&&validDate(p.received)&&(!a.recoveryDate||p.received>=a.recoveryDate))}
function validateRecoveryMatch(a,paymentList=payouts){
 if(!a.recoveryPayoutId)return '';
 if(!(Number(a.recovered)>0))return 'A payout match requires a confirmed recovery amount';
 const p=paymentList.find(p=>p.id===a.recoveryPayoutId);
 if(!p)return 'Matched payout no longer exists';
 if(p.platform!==a.platform||p.account!==a.account||p.currency!==a.currency)return 'Matched payout must use the same platform, account and currency';
 if(!validDate(p.received)||p.received<a.recoveryDate)return 'Matched payout cannot predate confirmed recovery';
 return '';
}
function validateAdjustment(a,ledger=entries,paymentList=payouts){
 if(!a||typeof a!=='object'||!a.id||!validDate(a.date)||!String(a.platform||'').trim()||!['Refund','Chargeback','Reversal','Correction','Other'].includes(a.type)||!['USD','CAD','GBP','EUR','AUD','JPY'].includes(a.currency))return 'Invalid adjustment metadata';
 if(a.entryId!==undefined&&typeof a.entryId!=='string')return 'Invalid linked earnings identifier';if(a.recoveryPayoutId!==undefined&&typeof a.recoveryPayoutId!=='string')return 'Invalid matched payout identifier';
 if(a.entryId){const e=ledger.find(e=>e.id===a.entryId);if(!e)return 'Linked earnings record not found';if(e.platform!==a.platform||e.account!==a.account||e.currency!==a.currency)return 'Linked earnings must match platform, account and currency';if(a.date<e.earnedDate)return 'Adjustment cannot predate linked earnings'}
 if(!Number.isFinite(Number(a.amount))||Number(a.amount)===0||Math.abs(Math.round(Number(a.amount)*100)-Number(a.amount)*100)>1e-7)return 'Adjustment must be a nonzero amount in cents';
 if(a.recovered!==undefined&&a.recovered!==''&&(!validMoney(a.recovered)||Number(a.recovered)>Math.max(0,-Number(a.amount))+.000001))return 'Recovered amount must be nonnegative and cannot exceed the negative adjustment';
 if(Number(a.recovered||0)>0){if(Number(a.amount)>=0)return 'Only negative adjustments can have platform recoveries';if(!validDate(a.recoveryDate)||a.recoveryDate<a.date)return 'Recovery date must be valid and not before the adjustment';if(!String(a.recoveryReference||'').trim())return 'Enter a settlement reference for confirmed recovery'}
 if((a.recoveryDate||a.recoveryReference)&&!(Number(a.recovered||0)>0))return 'Recovery details require a positive recovered amount';
 if(['Refund','Chargeback','Reversal'].includes(a.type)&&Number(a.amount)>=0)return 'Refunds, chargebacks and reversals must be negative';const matchIssue=validateRecoveryMatch(a,paymentList);if(matchIssue)return matchIssue;
 return '';
}
function renderLinkedAdjustmentReview(){
 const linked=adjustments.filter(a=>a.entryId&&dateInPeriod(a.date)).sort((a,b)=>b.date.localeCompare(a.date));
 $('linkedAdjustmentRows').innerHTML=linked.map(a=>{const e=entries.find(x=>x.id===a.entryId);if(!e)return `<tr><td>${esc(a.date)}</td><td>Missing earnings</td><td>${money(a.amount,a.currency)}</td><td>—</td><td>—</td><td><span class="pill status-disputed">Integrity issue</span></td></tr>`;
 const allocated=allocatedTo(e.id),legacyPaid=e.status==='Paid'&&allocated===0?net(e):0,received=allocated+legacyPaid;
 const flag=a.amount<0&&received>0;const recovered=Number(a.recovered||0),outstanding=Math.max(0,-a.amount-recovered);const match=a.recoveryPayoutId?payouts.find(p=>p.id===a.recoveryPayoutId):null;
 const recoveryLabel=a.amount<0?`${money(recovered,a.currency)} confirmed · ${money(outstanding,a.currency)} unconfirmed${match?`<div class="subtext">Matched deposit: ${esc(match.received)} · ${esc(match.reference||match.id.slice(0,8))}</div>`:''}`: 'Not applicable';
 return `<tr><td>${esc(a.date)}<div class="subtext">${esc(a.type)} · ${esc(a.reference||'No reference')}</div></td><td>${esc(e.description||e.incomeType)}<div class="subtext">${esc(e.platform)} · ${esc(e.account||'No account')} · ${esc(e.earnedDate)}</div></td><td class="amount">${money(a.amount,a.currency)}</td><td class="amount">${money(received,a.currency)}</td><td>${recoveryLabel}${recovered?`<div class="subtext">${esc(a.recoveryDate)} · ${esc(a.recoveryReference)}</div>`:''}</td><td><span class="pill ${flag&&outstanding>0?'status-pending':'status-processing'}">${flag?(outstanding>0?'Recovery review':'Recovery recorded'):'No paid refund conflict'}</span>${flag&&outstanding>0?'<div class="subtext">Unconfirmed amount is not an assumed debt or bank withdrawal</div>':''}</td></tr>`;
 }).join('');$('linkedAdjustmentEmpty').style.display=linked.length?'none':'block';
}
function renderAdjustments(){const shown=adjustments.filter(a=>dateInPeriod(a.date)).sort((a,b)=>b.date.localeCompare(a.date));$('adjustmentRows').innerHTML=shown.map(a=>`<tr><td>${esc(a.date)}</td><td>${esc(a.platform)}<div class="subtext">${esc(a.account||'—')}</div></td><td>${esc(a.type)}</td><td class="amount">${money(a.amount,a.currency)}</td><td>${esc(a.reference||'—')}${a.entryId?`<div class="subtext">Linked: ${esc(entries.find(e=>e.id===a.entryId)?.description||a.entryId.slice(0,8))}</div>`:''}</td><td><button class="btn small" data-adjustment-edit="${esc(a.id)}">Edit</button></td></tr>`).join('');$('adjustmentEmpty').style.display=shown.length?'none':'block'}
function refreshAdjustmentLinks(selected=''){
 const platform=$('adjustmentPlatform').value.trim(),account=$('adjustmentAccount').value.trim(),currency=$('adjustmentCurrency').value;
 const matching=entries.filter(e=>e.platform===platform&&e.account===account&&e.currency===currency);
 $('adjustmentEntryId').innerHTML='<option value="">Unlinked / platform-level adjustment</option>'+matching.map(e=>`<option value="${esc(e.id)}">${esc(e.earnedDate+' · '+e.incomeType+' · '+(e.description||e.reference||e.id.slice(0,8))+' · '+money(net(e),e.currency))}</option>`).join('');
 $('adjustmentEntryId').value=matching.some(e=>e.id===selected)?selected:'';
 $('adjustmentLinkHint').textContent=matching.length?`${matching.length} matching income record(s). Linkage does not change payout allocations.`:'No matching earnings. Leave this as an unlinked adjustment.';
}
function refreshRecoveryPayouts(selected=''){
 const a={platform:$('adjustmentPlatform').value.trim(),account:$('adjustmentAccount').value.trim(),currency:$('adjustmentCurrency').value,recoveryDate:$('adjustmentRecoveryDate').value};
 const matches=matchingRecoveryPayouts(a);
 $('adjustmentRecoveryPayoutId').innerHTML='<option value="">No recorded payout matched</option>'+matches.map(p=>`<option value="${esc(p.id)}">${esc(p.received)} · ${esc(p.reference||p.id.slice(0,8))} · ${esc(money(p.amount,p.currency))}</option>`).join('');
 $('adjustmentRecoveryPayoutId').value=matches.some(p=>p.id===selected)?selected:'';
 $('adjustmentRecoveryPayoutHint').textContent=matches.length?`${matches.length} matching deposit(s). Check the actual platform statement before linking a recovery.`:'No eligible deposits. You can leave the recovery unmatched until a corresponding deposit is recorded.';
}
for(const field of ['adjustmentPlatform','adjustmentAccount','adjustmentCurrency'])$(field).addEventListener('change',()=>{refreshAdjustmentLinks();refreshRecoveryPayouts()});
$('adjustmentRecoveryDate').addEventListener('change',()=>refreshRecoveryPayouts());
function openAdjustment(a){if(!requireWritable())return;$('adjustmentForm').reset();$('adjustmentId').value=a?.id||'';$('adjustmentDate').value=a?.date||today();for(const k of ['platform','account','type','currency','amount','reference','notes','recovered','recoveryDate','recoveryReference'])if(a)$('adjustment'+k[0].toUpperCase()+k.slice(1)).value=a[k]??'';refreshAdjustmentLinks(a?.entryId||'');refreshRecoveryPayouts(a?.recoveryPayoutId||'');$('deleteAdjustment').classList.toggle('hidden',!a);$('adjustmentModal').classList.add('show')}
$('addAdjustmentBtn').onclick=()=>openAdjustment();$('cancelAdjustment').onclick=()=>$('adjustmentModal').classList.remove('show');$('adjustmentModal').onclick=e=>{if(e.target===$('adjustmentModal'))$('adjustmentModal').classList.remove('show')};
$('adjustmentRows').onclick=e=>{const b=e.target.closest('[data-adjustment-edit]');if(b){const a=adjustments.find(a=>a.id===b.dataset.adjustmentEdit);if(a)openAdjustment(a)}};
$('adjustmentForm').onsubmit=e=>{e.preventDefault();if(!requireWritable())return;const a={id:$('adjustmentId').value||makeId(),date:$('adjustmentDate').value,platform:$('adjustmentPlatform').value.trim(),account:$('adjustmentAccount').value.trim(),type:$('adjustmentType').value,currency:$('adjustmentCurrency').value,amount:Number($('adjustmentAmount').value),reference:$('adjustmentReference').value.trim(),notes:$('adjustmentNotes').value.trim(),entryId:$('adjustmentEntryId').value,recovered:$('adjustmentRecovered').value===''?0:Number($('adjustmentRecovered').value),recoveryDate:$('adjustmentRecoveryDate').value,recoveryReference:$('adjustmentRecoveryReference').value.trim(),recoveryPayoutId:$('adjustmentRecoveryPayoutId').value};const issue=validateAdjustment(a);if(issue){toast(issue);return}if(a.recoveryPayoutId&&!confirm('Have you checked the actual platform settlement statement and verified this recovery against the selected deposit? Matching does not alter the deposit or deduct revenue again.'))return;if(a.recovered>0&&!confirm('Confirm that this amount was actually withheld in a later platform settlement? This is tracking metadata and will NOT reduce revenue or bank deposits again.'))return;if(a.entryId&&a.amount<0){const original=entries.find(x=>x.id===a.entryId);if(original&&(allocatedTo(original.id)>0||original.status==='Paid')){if(!confirm('This refund affects earnings that have already been paid or allocated. CloutFlow will reduce reported revenue, but will NOT change bank deposits or automatically record a clawback. Continue?'))return}}const prior=[...adjustments];const idx=adjustments.findIndex(x=>x.id===a.id);if(idx>=0)adjustments[idx]=a;else adjustments.push(a);if(!persist()){adjustments=prior;return}$('adjustmentModal').classList.remove('show');render();toast('Adjustment saved')};
$('deleteAdjustment').onclick=()=>{if(!requireWritable())return;const id=$('adjustmentId').value;if(!confirm('Delete this adjustment permanently?'))return;const prior=adjustments;adjustments=adjustments.filter(a=>a.id!==id);if(!persist()){adjustments=prior;return}$('adjustmentModal').classList.remove('show');render();toast('Adjustment deleted')};

$('toggleTrendTable').addEventListener('click',()=>{const wrap=$('trendTableWrap'),open=wrap.hidden;wrap.hidden=!open;$('toggleTrendTable').setAttribute('aria-expanded',String(open));$('toggleTrendTable').textContent=open?'Hide chart data':'Show chart data'});
$('exportTrendCsv').addEventListener('click',()=>{const rows=trendProjection(periodEntries().filter(e=>e.currency==='USD')).rows;exportTableCSV('cloutflow-revenue-trends.csv',[['Period','period'],['Adjusted net revenue (USD)','adjustedNet']],rows);toast('Revenue trends CSV exported')});
window.CloutFlowPaymentDashboard?.mount(document);window.addEventListener('resize',()=>drawChart(periodEntries().filter(e=>e.currency==='USD')));load();render();if(window.CloutFlowRecurringAgreementsUI&&window.CloutFlowRecurringAgreements){let agreementStore;try{agreementStore=window.localStorage}catch{agreementStore=null}if(agreementStore)window.CloutFlowAgreementUIInstance=CloutFlowRecurringAgreementsUI.mount(document,agreementStore,CloutFlowRecurringAgreements,undefined,()=>payouts);}
