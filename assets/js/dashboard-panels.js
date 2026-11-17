/* Dashboard panel disclosure preferences; no financial data is modified. */
(function(root){
 'use strict';
 const STORAGE_KEY='cloutflow_dashboard_panels_v1';
 const IDS=['currencyOverviewTitle','accountInsightsTitle','platformRankingsTitle','accountRankingsTitle','accountGrowthTitle','periodComparisonTitle'];
 function parse(raw){try{const obj=JSON.parse(raw);if(!obj||typeof obj!=='object'||Array.isArray(obj))return {};return Object.fromEntries(IDS.filter(id=>typeof obj[id]==='boolean').map(id=>[id,obj[id]]));}catch{return {}}}
 function init(doc,storage){
  if(!doc)return;
  let saved={};try{saved=parse(storage&&storage.getItem(STORAGE_KEY))}catch{}
  for(const id of IDS){
   const heading=doc.getElementById(id);const section=heading&&heading.closest('section');const head=section&&section.querySelector('.card-head');if(!head||!section||section.querySelector('[data-panel-toggle]'))continue;
   const body=[...section.children].filter(el=>el!==head);
   if(!body.length)continue;
   const button=doc.createElement('button');button.type='button';button.className='btn small panel-toggle';button.setAttribute('data-panel-toggle',id);
   const setOpen=open=>{body.forEach(el=>el.hidden=!open);button.setAttribute('aria-expanded',String(open));button.textContent=open?'− Collapse':'＋ Expand';section.classList.toggle('panel-collapsed',!open)};
   button.setAttribute('aria-label','Toggle '+heading.textContent.trim());
   head.appendChild(button);setOpen(saved[id]!==false);
   button.addEventListener('click',()=>{const open=button.getAttribute('aria-expanded')!=='true';setOpen(open);saved[id]=open;try{storage&&storage.setItem(STORAGE_KEY,JSON.stringify(saved))}catch{}});
  }
 }
 const api={parse,init,IDS,STORAGE_KEY};root.CloutFlowDashboardPanels=api;
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(root.document){const boot=()=>{let storage=null;try{storage=root.localStorage}catch{}init(root.document,storage)};if(root.document.readyState==='loading')root.document.addEventListener('DOMContentLoaded',boot);else boot()}
})(typeof window!=='undefined'?window:globalThis);
