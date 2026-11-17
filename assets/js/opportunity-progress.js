/* Local-only progress for creator growth ideas. Never modifies financial records. */
(function(root){
'use strict';
const KEY='cloutflow_opportunity_progress_v1';
const STATES=['interested','trying','doing'];
function read(store){try{const data=JSON.parse(store.getItem(KEY)||'{}');if(!data||typeof data!=='object'||Array.isArray(data))return {};return Object.fromEntries(Object.entries(data).filter(([id,value])=>/^[a-z0-9-]{1,64}$/i.test(id)&&STATES.includes(value)))}catch{return {}}}
function get(store,id){return read(store)[id]||''}
function set(store,id,value){if(!/^[a-z0-9-]{1,64}$/i.test(String(id))||!(STATES.includes(value)||value===''))return false;try{const data=read(store);if(value)data[id]=value;else delete data[id];store.setItem(KEY,JSON.stringify(data));return true}catch{return false}}
function decorate(ideas,store){const statuses=read(store);return (Array.isArray(ideas)?ideas:[]).map(idea=>({...idea,progress:statuses[idea.id]||''}))}
function filter(ideas,store,status='all'){
 const allowed=['all','not-started',...STATES];if(!allowed.includes(status))status='all';
 const decorated=decorate(ideas,store);
 return status==='all'?decorated:decorated.filter(idea=>status==='not-started'?!idea.progress:idea.progress===status);
}
function summary(ideas,store){const decorated=decorate(ideas,store);const counts={'all':decorated.length,'not-started':0,interested:0,trying:0,doing:0};for(const idea of decorated)counts[idea.progress||'not-started']++;return counts}
const api={key:KEY,states:STATES,read,get,set,decorate,filter,summary};root.CloutFlowOpportunityProgress=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
