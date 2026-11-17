/* CloutFlow workspace router. Presentation-only: never changes financial records. */
(function(root){
 'use strict';
 const TARGETS=['mainContent','currencyOverviewSection','paymentDashboard','recurringAgreements','incomeOpportunitiesSection','accountInsightsSection','platformRankingsSection','accountRankingsSection','accountGrowthSection','periodComparisonSection','revenueChartsSection','platformsSection','accountsSection','reconciliationSection','payoutCenterSection','settlementReviewSection','appRevenueSection','ledgerSection','integritySection','linkedAdjustmentSection','adjustmentsSection'];
 const ACTIONS=['addBtn','newPayoutBtn'];
 const OVERVIEW=['mainContent','overviewNotice','overviewStats','alertCenter','commandCenter','paymentDashboard','revenueChartsSection'];
 function init(doc){
  if(!doc)return;
  const bar=doc.querySelector('.quick-access');if(!bar||bar.dataset.ready==='true')return;
  bar.dataset.ready='true';
  const toggle=doc.querySelector('.quick-sidebar-toggle'),close=bar.querySelector('.quick-sidebar-close'),scrim=doc.querySelector('.quick-sidebar-scrim');
  const panels=TARGETS.map(id=>doc.getElementById(id)).filter(Boolean);
  const setOpen=open=>{
   bar.classList.toggle('sidebar-open',open);
   if(toggle)toggle.setAttribute('aria-expanded',String(open));
   if(scrim)scrim.hidden=!open;
  };
  const setView=(target,focus=true)=>{
   if(!TARGETS.includes(target))return false;
   const section=doc.getElementById(target);if(!section)return false;
   if(target==='incomeOpportunitiesSection'&&section.hidden){
    const reveal=doc.getElementById('showGrowthIdeas');if(reveal)reveal.click();
   }
   doc.body.classList.add('workspace-mode');
   doc.body.dataset.workspaceView=target;
   const visible=target==='mainContent'?OVERVIEW:[target];
   doc.querySelectorAll('[data-workspace-panel]').forEach(panel=>{
    const show=visible.includes(panel.id);
    panel.hidden=!show;
    if(show)panel.removeAttribute('inert');else panel.setAttribute('inert','');
   });
   // The growth controller can hide its section independently; selecting it always reveals it.
   if(target==='incomeOpportunitiesSection')section.hidden=false;
   bar.querySelectorAll('[data-quick-target]').forEach(item=>{
    const active=item.dataset.quickTarget===target;
    item.classList.toggle('is-active',active);
    if(active)item.setAttribute('aria-current','page');else item.removeAttribute('aria-current');
   });
   if(focus){
    root.scrollTo?.({top:0,behavior:'instant'});
    const heading=section.querySelector('h2,h3,h4')||section;
    if(!heading.hasAttribute('tabindex'))heading.setAttribute('tabindex','-1');
    heading.focus({preventScroll:true});
   }
   return true;
  };
  if(toggle)toggle.addEventListener('click',()=>{setOpen(!bar.classList.contains('sidebar-open'));if(bar.classList.contains('sidebar-open')&&close)close.focus();});
  if(close)close.addEventListener('click',()=>{setOpen(false);if(toggle)toggle.focus();});
  if(scrim)scrim.addEventListener('click',()=>{setOpen(false);if(toggle)toggle.focus();});
  doc.addEventListener('keydown',event=>{if(event.key==='Escape'&&bar.classList.contains('sidebar-open')){setOpen(false);toggle?.focus();}});
  bar.addEventListener('click',event=>{
   const button=event.target.closest('button[data-quick-target],button[data-quick-action]');
   if(!button||!bar.contains(button))return;
   setOpen(false);
   if(button.dataset.quickTarget)setView(button.dataset.quickTarget);
   const action=button.dataset.quickAction;
   if(action&&ACTIONS.includes(action)){
    const source=doc.getElementById(action);
    if(source&&!source.disabled)source.click();
   }
  });
  // Existing dashboard and payment shortcuts remain functional from any workspace.
  doc.querySelectorAll('[data-payment-open]').forEach(button=>button.addEventListener('click',()=>setView('recurringAgreements')));
  const mobileMap={mobileOverview:'mainContent',mobileActivity:'ledgerSection',mobileAccounts:'accountsSection',mobilePayouts:'reconciliationSection'};
  Object.entries(mobileMap).forEach(([id,target])=>doc.getElementById(id)?.addEventListener('click',()=>setView(target,false)));
  // Always start in an intentional workspace, not the legacy long scrolling page.
  setView('mainContent',false);
  root.CloutFlowOpenWorkspace=setView;
 }
 const api={init,TARGETS,ACTIONS};root.CloutFlowQuickAccess=api;
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(root.document){if(root.document.readyState==='loading')root.document.addEventListener('DOMContentLoaded',()=>init(root.document));else init(root.document);}
})(typeof window!=='undefined'?window:globalThis);
