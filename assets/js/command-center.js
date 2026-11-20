/* Customizable, local-only dashboard navigation. Does not modify financial records. */
(function(root){
 'use strict';
 const KEY='cloutflow.commandCenter.v1';
 const ITEMS=[
  {id:'ledgerSection',name:'Recent transactions',detail:'Review earnings and latest activity',icon:'≋'},
  {id:'paymentDashboard',name:'Payment reminders',detail:'See payments requiring attention',icon:'◷'},
  {id:'reconciliationSection',name:'Payout center',detail:'Review pending and recorded payouts',icon:'↗'},
  {id:'recurringAgreements',name:'Agreements & follow-ups',detail:'Track expected income and follow-ups',icon:'▤'},
  {id:'appRevenueSection',name:'Income trends',detail:'Explore earnings over time',icon:'▥'},
  {id:'accountsSection',name:'Creator accounts',detail:'Manage your linked platform profiles',icon:'◎'},
  {id:'incomeOpportunitiesSection',name:'Growth ideas',detail:'Explore possible revenue opportunities',icon:'✦'},
  {id:'integritySection',name:'Financial integrity',detail:'Review data health and discrepancies',icon:'✓'}
 ];
 function normalize(input){
  const all=ITEMS.map(x=>x.id),valid=Array.isArray(input?.order)?input.order.filter((id,i,a)=>all.includes(id)&&a.indexOf(id)===i):[];
  const order=[...valid,...all.filter(id=>!valid.includes(id))];
  const hidden=Array.isArray(input?.hidden)?[...new Set(input.hidden.filter(id=>all.includes(id)))]:[];
  return {order,hidden};
 }
 function init(doc){
  const grid=doc.getElementById('commandCenterCards'),options=doc.getElementById('commandCenterOptions'),settings=doc.getElementById('commandCenterSettings'),toggle=doc.getElementById('customizeCommandCenter');
  if(!grid||!options||!settings||!toggle||grid.dataset.ready)return;
  grid.dataset.ready='true';
  let state;
  try{state=normalize(JSON.parse(root.localStorage.getItem(KEY)||'null'));}catch(_){state=normalize(null);}
  function save(){try{root.localStorage.setItem(KEY,JSON.stringify(state));}catch(_){/* Storage may be disabled. */}}
  function make(tag,cls,text){const el=doc.createElement(tag);if(cls)el.className=cls;if(text)el.textContent=text;return el;}
  function render(){
   grid.replaceChildren();options.replaceChildren();
   for(const [index,id] of state.order.entries()){
    const item=ITEMS.find(x=>x.id===id),hidden=state.hidden.includes(id);
    if(!hidden){
     const card=make('button','command-card');card.type='button';card.dataset.commandTarget=id;
     card.append(make('span','command-icon',item.icon),make('strong','',item.name),make('span','command-detail',item.detail));
     card.addEventListener('click',()=>{const section=doc.getElementById(id);if(!section)return;section.scrollIntoView({behavior:root.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});const heading=section.querySelector('h2,h3,h4');if(heading){if(!heading.hasAttribute('tabindex'))heading.setAttribute('tabindex','-1');heading.focus({preventScroll:true});}});grid.append(card);
    }
    const line=make('div','command-option');const label=make('label','command-option-label');const check=make('input');check.type='checkbox';check.checked=!hidden;check.setAttribute('aria-label','Show '+item.name);check.addEventListener('change',()=>{state.hidden=check.checked?state.hidden.filter(x=>x!==id):[...state.hidden,id];save();render();const updated=Array.from(options.querySelectorAll('.command-option')).find(row=>row.querySelector('input')?.getAttribute('aria-label')==='Show '+item.name);updated?.querySelector('input')?.focus();});label.append(check,doc.createTextNode(item.name));line.append(label);
    for(const [direction,delta] of [['Move up',-1],['Move down',1]]){
     const button=make('button','btn small',delta===-1?'↑':'↓');button.type='button';button.title=direction+' '+item.name;button.setAttribute('aria-label',direction+' '+item.name);button.disabled=index+delta<0||index+delta>=state.order.length;
     button.addEventListener('click',()=>{const other=index+delta;[state.order[index],state.order[other]]=[state.order[other],state.order[index]];save();render();options.querySelectorAll('.command-option')[other]?.querySelector(delta===-1?'[aria-label^="Move up"]':'[aria-label^="Move down"]')?.focus();});line.append(button);
    }
    options.append(line);
   }
   if(!grid.childElementCount)grid.append(make('p','footnote','All shortcuts are hidden. Use Customize to show one.'));
   const count=doc.getElementById('commandCenterCount');if(count)count.textContent=`${grid.querySelectorAll('.command-card').length} of ${ITEMS.length} shortcuts shown`;
  }
  toggle.addEventListener('click',()=>{settings.hidden=!settings.hidden;toggle.setAttribute('aria-expanded',String(!settings.hidden));});
  settings.addEventListener('keydown',event=>{if(event.key==='Escape'){settings.hidden=true;toggle.setAttribute('aria-expanded','false');toggle.focus();}});
  doc.getElementById('resetCommandCenter')?.addEventListener('click',()=>{state=normalize(null);save();render();});
  render();
 }
 const api={init,normalize,ITEMS,KEY};root.CloutFlowCommandCenter=api;
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(root.document){if(root.document.readyState==='loading')root.document.addEventListener('DOMContentLoaded',()=>init(root.document));else init(root.document);}
})(typeof window!=='undefined'?window:globalThis);
