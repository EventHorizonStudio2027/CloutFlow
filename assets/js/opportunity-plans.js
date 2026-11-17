/* Creator growth experiments: notes and targets, intentionally separate from the financial ledger. */
(function(root){'use strict';
const KEY='cloutflow_opportunity_plans_v1';
const ID=/^[a-z0-9-]{1,64}$/i;
const CURRENCIES=['USD','EUR','GBP','CAD','AUD','JPY'];
function clean(item){if(!item||typeof item!=='object'||Array.isArray(item))return null;
 const note=typeof item.note==='string'?item.note.trim().slice(0,500):'';
 const currency=CURRENCIES.includes(item.currency)?item.currency:'USD';
 const target=Number(item.target);
 if(!Number.isFinite(target)||target<0||target>1000000000||Math.round(target*100)!==target*100&&Math.abs(Math.round(target*100)-target*100)>0.00001)return null;
 if(!note&&target===0)return null;
 return {note,currency,target:Math.round(target*100)/100,updatedAt:typeof item.updatedAt==='string'?item.updatedAt:''};
}
function read(store){try{const parsed=JSON.parse(store.getItem(KEY)||'{}');if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))return {};const result={};for(const [id,item] of Object.entries(parsed)){if(ID.test(id)){const value=clean(item);if(value)result[id]=value;}}return result;}catch{return {}}}
function get(store,id){return read(store)[id]||{note:'',currency:'USD',target:0,updatedAt:''}}
function set(store,id,plan){if(!ID.test(String(id)))return false;const cleaned=clean(plan);if(!cleaned&&!(plan&&plan.note===''&&Number(plan.target)===0))return false;
 try{const data=read(store);if(cleaned)data[id]={...cleaned,updatedAt:new Date().toISOString()};else delete data[id];store.setItem(KEY,JSON.stringify(data));return true;}catch{return false;}}
function count(store){return Object.keys(read(store)).length}
const api={key:KEY,currencies:CURRENCIES,read,get,set,count};root.CloutFlowOpportunityPlans=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
