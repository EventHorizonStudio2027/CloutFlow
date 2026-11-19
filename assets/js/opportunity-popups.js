/* Contextual, non-blocking growth suggestions. Never modifies ledger records. */
(function(root){
'use strict';
const KEY='cloutflow_opportunity_dismissals_v1';
const PREF_KEY='cloutflow_opportunity_popup_preferences_v1';
const ACTIVITY_KEY='cloutflow_opportunity_activity_v1';
const LAST_KEY='cloutflow_opportunity_last_shown_v1';
const MILESTONE_KEY='cloutflow_opportunity_milestones_v1';
const MILESTONE_RULES=[{key:'sponsor',test:/sponsor|brand deal|paid partnership/i,ideas:['digital','merch','affiliate']},{key:'affiliate',test:/affiliate|commission/i,ideas:['digital','memberships','store-email']},{key:'membership',test:/subscription|membership|patreon/i,ideas:['merch','digital','store-email']},{key:'tips',test:/tips|donation|gift|super chat|bits|stars/i,ideas:['memberships','merch','digital']}];
function milestoneTypes(entries){const found=new Set();for(const e of Array.isArray(entries)?entries:[]){if(!e||typeof e!=='object')continue;const type=String(e.incomeType||e.category||'');for(const rule of MILESTONE_RULES)if(rule.test.test(type))found.add(rule.key)}return [...found].sort()}
function detectMilestones(entries,store){const current=milestoneTypes(entries);try{const raw=store.getItem(MILESTONE_KEY);if(raw===null){store.setItem(MILESTONE_KEY,JSON.stringify(current));return []}const previous=JSON.parse(raw);if(!Array.isArray(previous))return [];const added=current.filter(x=>!previous.includes(x));store.setItem(MILESTONE_KEY,JSON.stringify(current));return added}catch{return []}}
const COOLDOWN_MS=24*60*60*1000;
function disabled(store){try{return store.getItem(PREF_KEY)==='off'}catch{return false}}
function setEnabled(store,enabled){try{store.setItem(PREF_KEY,enabled?'on':'off');return true}catch{return false}}
let shownThisVisit=false;
function activity(ideas){return [...new Set(ideas.flatMap(i=>i.matchedPlatforms||[]).map(x=>String(x).trim().toLowerCase()).filter(Boolean))].sort()}
function detectNewPlatforms(ideas,store){
 const current=activity(ideas);if(!current.length)return [];
 try{
  const raw=store.getItem(ACTIVITY_KEY);
  if(raw===null){store.setItem(ACTIVITY_KEY,JSON.stringify(current));return []}
  const previous=JSON.parse(raw);if(!Array.isArray(previous))throw Error('Invalid activity history');
  const added=current.filter(x=>!previous.includes(x));
  store.setItem(ACTIVITY_KEY,JSON.stringify(current));return added;
 }catch{return []}
}
function recentlyShown(store,now){try{const last=Number(store.getItem(LAST_KEY));return Number.isFinite(last)&&last>0&&now>=last&&now-last<COOLDOWN_MS}catch{return false}}
function markShown(store,now){try{store.setItem(LAST_KEY,String(now))}catch{/* optional preference storage */}}

function read(store){try{const x=JSON.parse(store.getItem(KEY)||'{}');return x&&typeof x==='object'&&!Array.isArray(x)?x:{}}catch{return {}}}
function eligible(ideas,store,now=Date.now()){
 const dismissed=read(store);
 const progress=root.CloutFlowOpportunityProgress;const statuses=progress?progress.read(store):{};
 return ideas.filter(i=>!i.already&&statuses[i.id]!=='doing'&&(!Number.isFinite(Number(dismissed[i.id]))||Number(dismissed[i.id])<=now));
}
function snooze(id,store,now=Date.now(),days=30){try{const x=read(store);x[id]=now+days*86400000;store.setItem(KEY,JSON.stringify(x))}catch{/* storage may be disabled */}}
function mount(doc,store){
 let panel=doc.getElementById('growthPopup');if(panel)return panel;
 panel=doc.createElement('aside');panel.id='growthPopup';panel.className='growth-popup';panel.setAttribute('role','region');panel.setAttribute('aria-label','Creator income opportunity');panel.hidden=true;
 panel.innerHTML='<div class="growth-popup-head"><span class="growth-popup-eyebrow">✦ Growth idea for you</span><button type="button" class="growth-popup-close" aria-label="Dismiss this recommendation">×</button></div><h3 id="growthPopupTitle"></h3><p id="growthPopupWhy"></p><p id="growthPopupAction"></p><p class="growth-popup-caution" id="growthPopupCaution"></p><div class="growth-popup-actions"><button type="button" class="btn small" id="growthPopupLater">Not now</button><button type="button" class="btn primary small" id="growthPopupMore">Explore ideas</button></div><button type="button" class="growth-popup-optout" id="growthPopupOptout">Turn off automatic tips</button>';
 doc.body.appendChild(panel);
 // A live dialog wins over optional tips; explicit display avoids competing legacy CSS.
 const syncVisibility=()=>{if(panel.hidden){panel.style.removeProperty('display');return}const blocked=hasActiveDialog(doc);const next=blocked?'none':'block';if(panel.style.getPropertyValue('display')!==next||panel.style.getPropertyPriority('display')!=='important')panel.style.setProperty('display',next,'important');const hidden=String(blocked);if(panel.getAttribute('aria-hidden')!==hidden)panel.setAttribute('aria-hidden',hidden)};
 if(doc.defaultView&&doc.defaultView.MutationObserver){
  const observer=new doc.defaultView.MutationObserver(syncVisibility);
  observer.observe(doc.body,{subtree:true,attributes:true,attributeFilter:['class','hidden','open','aria-hidden']});
 }
 panel._syncVisibility=syncVisibility;
 const close=()=>{if(panel.hidden)return;panel.hidden=true;panel.style.removeProperty('display');if(panel._idea)snooze(panel._idea.id,store)};
 panel.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();close();}});
 panel.querySelector('.growth-popup-close').addEventListener('click',close);
 panel.querySelector('#growthPopupLater').addEventListener('click',close);
 panel.querySelector('#growthPopupOptout').addEventListener('click',()=>{setEnabled(store,false);panel.hidden=true;panel.style.removeProperty('display');const launcher=doc.getElementById('showGrowthIdeas');if(launcher)launcher.focus({preventScroll:true});const pref=doc.getElementById('growthTipPreference');if(pref){pref.textContent='Automatic tips: Off';pref.setAttribute('aria-pressed','false');}});
 panel.querySelector('#growthPopupMore').addEventListener('click',()=>{panel.hidden=true;panel.style.removeProperty('display');const section=doc.getElementById('incomeOpportunitiesSection');if(section){section.hidden=false;const launcher=doc.getElementById('showGrowthIdeas');if(launcher){launcher.setAttribute('aria-expanded','true');launcher.textContent='− Hide growth ideas'}section.scrollIntoView({behavior:'smooth',block:'start'});const title=doc.getElementById('incomeOpportunitiesTitle');if(title){title.setAttribute('tabindex','-1');title.focus({preventScroll:true})}}});
 return panel;
}
function hasActiveDialog(doc){if(!doc||!doc.querySelectorAll)return false;return Array.from(doc.querySelectorAll('.modal-backdrop.show,dialog[open],[role="dialog"][aria-modal="true"]')).some(el=>{if(el.hidden||el.closest('[hidden]')||el.getAttribute('aria-hidden')==='true'||(el.getClientRects&&el.getClientRects().length===0))return false;const view=doc.defaultView;const style=view&&view.getComputedStyle?view.getComputedStyle(el):null;return !style||(style.display!=='none'&&style.visibility!=='hidden')})}
function present(ideas,doc,store,options={}){
 if(!doc||!store||!Array.isArray(ideas)||hasActiveDialog(doc)||(!options.force&&disabled(store)))return false;
 if(shownThisVisit&&!options.force)return false;
 const now=options.now??Date.now();
 const newPlatforms=detectNewPlatforms(ideas,store);
 const milestones=Array.isArray(options.entries)?detectMilestones(options.entries,store):[];
 const matches=eligible(ideas,store,now);
 const milestoneIds=new Set(MILESTONE_RULES.filter(r=>milestones.includes(r.key)).flatMap(r=>r.ideas));
 const milestoneMatches=matches.filter(i=>milestoneIds.has(i.id));
 const platformMatches=newPlatforms.length?matches.filter(i=>(i.matchedPlatforms||[]).some(p=>newPlatforms.includes(String(p).toLowerCase()))):[];
 if(!options.force&&!milestoneMatches.length&&!platformMatches.length&&recentlyShown(store,now))return false;
 const item=platformMatches[0]||milestoneMatches[0]||matches[0];if(!item)return false;
 const panel=mount(doc,store);if(!panel.hidden)return false;
 panel._idea=item;
 panel.querySelector('#growthPopupTitle').textContent=item.title;
 panel.querySelector('#growthPopupWhy').textContent=item.why;
 panel.querySelector('#growthPopupAction').textContent='Try this: '+item.action;
 panel.querySelector('#growthPopupCaution').textContent='Before you start: '+item.caution;
 panel.hidden=false;panel._syncVisibility();shownThisVisit=true;markShown(store,now);return true;
}
function bindLauncher(doc){const pref=doc.getElementById('growthTipPreference');if(pref&&!pref.dataset.bound){pref.dataset.bound='1';const store=(()=>{try{return doc.defaultView.localStorage}catch{return null}})();const sync=()=>{const enabled=!store||!disabled(store);pref.textContent='Automatic tips: '+(enabled?'On':'Off');pref.setAttribute('aria-pressed',String(enabled))};pref.addEventListener('click',()=>{if(store)setEnabled(store,disabled(store));sync();const panel=doc.getElementById('growthPopup');if(panel&&!panel.hidden&&store&&disabled(store)){panel.hidden=true;panel.style.removeProperty('display')}});sync();}
 const btn=doc.getElementById('showGrowthIdeas');if(!btn||btn.dataset.bound)return;btn.dataset.bound='1';btn.addEventListener('click',()=>{const section=doc.getElementById('incomeOpportunitiesSection');if(!section)return;section.hidden=!section.hidden;btn.setAttribute('aria-expanded',String(!section.hidden));btn.textContent=section.hidden?'✦ Browse growth ideas':'− Hide growth ideas';if(!section.hidden)section.scrollIntoView({behavior:'smooth',block:'start'});});btn.setAttribute('aria-expanded','false')}
const api={eligible,snooze,present,hasActiveDialog,read,disabled,setEnabled,activity,detectNewPlatforms,recentlyShown,activityKey:ACTIVITY_KEY,milestoneKey:MILESTONE_KEY,milestoneTypes,detectMilestones,lastKey:LAST_KEY,cooldownMs:COOLDOWN_MS,preferenceKey:PREF_KEY,bindLauncher,resetSession:()=>{shownThisVisit=false},key:KEY};
root.CloutFlowOpportunityPopups=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
