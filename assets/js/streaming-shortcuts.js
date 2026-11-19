/* Custom creator shortcuts: local-only, no remote icon fetches or injected HTML. */
(function(root){'use strict';
const KEY='cloutflow_streaming_shortcuts_v1';
function normalize(name,url){
 const label=String(name||'').trim().replace(/\s+/g,' ').slice(0,22);
 if(!label)return null;
 try{const parsed=new URL(String(url||'').trim());if(parsed.protocol!=='https:'||!parsed.hostname||parsed.username||parsed.password)return null;return {name:label,url:parsed.href}}catch{return null}
}
function read(store){try{const data=JSON.parse(store.getItem(KEY)||'[]');return Array.isArray(data)?data.slice(0,3).map(x=>normalize(x.name,x.url)).filter(Boolean):[]}catch{return []}}
function save(store,items){try{if(!Array.isArray(items))return false;const valid=items.slice(0,3).map(x=>normalize(x?.name,x?.url));if(valid.some(x=>!x)||new Set(valid.map(x=>x.url)).size!==valid.length)return false;store.setItem(KEY,JSON.stringify(valid));return true}catch{return false}}
function init(doc,store){
 const grid=doc.getElementById('streamingPlatformIcons'),add=doc.getElementById('addStreamingPlatform'),form=doc.getElementById('streamingAddForm');
 if(!grid||!add||!form||!store||add.dataset.bound)return;
 add.dataset.bound='1';
 const name=doc.getElementById('streamingNewName'),url=doc.getElementById('streamingNewUrl'),error=doc.getElementById('streamingAddError'),cancel=doc.getElementById('streamingAddCancel');
 const defaults=Array.from(grid.querySelectorAll('a'));
 const manage=doc.createElement('div');manage.className='streaming-manage-list';manage.setAttribute('aria-label','Your custom platform shortcuts');form.appendChild(manage);
 form.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();form.hidden=true;add.focus()}});
 defaults.forEach(link=>{link.title=link.getAttribute('aria-label')||link.textContent.trim()});
 add.title='Add a creator platform shortcut';
 function render(){
  grid.querySelectorAll('[data-custom-streaming]').forEach(el=>el.remove());
  const items=read(store);
  manage.hidden=items.length===0;
  manage.setAttribute('aria-live','polite');
  const replaceable=defaults.filter(el=>!['Open Discord','Open Patreon'].includes(el.getAttribute('aria-label'))).reverse();
  defaults.forEach(el=>{el.hidden=false});
  replaceable.slice(0,items.length).forEach(el=>{el.hidden=true});
  for(const item of items){
   const a=doc.createElement('a');a.href=item.url;a.target='_blank';a.rel='noopener noreferrer';a.setAttribute('aria-label','Open '+item.name);a.title='Open '+item.name;a.dataset.customStreaming='1';
   const mark=doc.createElement('span');mark.className='streaming-custom-mark';mark.textContent=item.name.slice(0,1).toUpperCase();
   const label=doc.createElement('span');label.textContent=item.name;a.append(mark,label);grid.insertBefore(a,add);
  }
  add.setAttribute('aria-label',items.length>=3?'Manage creator shortcuts':'Add a streaming platform');
  add.title=items.length>=3?'Manage your creator platform shortcuts':'Add a creator platform shortcut';
  manage.replaceChildren();
  items.forEach(item=>{const row=doc.createElement('div');row.className='streaming-manage-item';const label=doc.createElement('span');label.textContent=item.name;const remove=doc.createElement('button');remove.type='button';remove.textContent='Remove';remove.setAttribute('aria-label','Remove '+item.name);remove.addEventListener('click',()=>{if(save(store,read(store).filter(x=>x.url!==item.url)))render()});row.append(label,remove);manage.appendChild(row)});
 }
 add.addEventListener('click',()=>{form.hidden=!form.hidden;error.textContent='';if(!form.hidden)name.focus()});
 cancel.addEventListener('click',()=>{form.hidden=true;add.focus()});
 form.addEventListener('submit',e=>{e.preventDefault();const item=normalize(name.value,url.value);if(!item){error.textContent='Enter a name and a secure https:// website URL.';return}const items=read(store);if(items.some(x=>x.url===item.url)||defaults.some(x=>x.href===item.url)){error.textContent='This shortcut already exists.';return}if(items.length>=3){error.textContent='Up to three custom shortcuts can be added.';return}if(!save(store,[...items,item])){error.textContent='Could not save this shortcut on this device.';return}form.reset();form.hidden=true;render();add.focus()});
 render();
}
const api={normalize,read,save,init,key:KEY};
root.CloutFlowStreamingShortcuts=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
if(root.document){const start=()=>{try{init(root.document,root.localStorage)}catch{}};if(root.document.readyState==='loading')root.document.addEventListener('DOMContentLoaded',start);else start()}
})(typeof window!=='undefined'?window:globalThis);
