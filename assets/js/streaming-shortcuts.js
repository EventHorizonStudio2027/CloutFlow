/* Custom creator shortcuts: local-only, no remote icon fetches or injected HTML. */
(function(root){'use strict';
const KEY='cloutflow_streaming_shortcuts_v1';
function normalize(name,url){
 const original=String(name||'');
 if(/[\u0000-\u001f\u007f]/.test(original))return null;
 const label=original.trim().replace(/\s+/g,' ').slice(0,22).trim();
 if(!label||/[\u202a-\u202e\u2066-\u2069]/.test(label))return null;
 try{const raw=String(url||'').trim();if(raw.length>2048||/[\u0000-\u001f\u007f]/.test(raw))return null;const parsed=new URL(raw);if(parsed.protocol!=='https:'||!parsed.hostname||parsed.username||parsed.password||parsed.port&&parsed.port!=='443')return null;return {name:label,url:parsed.href}}catch{return null}
}
function read(store){try{const data=JSON.parse(store.getItem(KEY)||'[]');if(!Array.isArray(data))return [];const seenUrls=new Set(),seenNames=new Set(),items=[];for(const entry of data){const item=normalize(entry?.name,entry?.url);if(!item)continue;const nameKey=item.name.toLocaleLowerCase();if(seenUrls.has(item.url)||seenNames.has(nameKey))continue;seenUrls.add(item.url);seenNames.add(nameKey);items.push(item);if(items.length===3)break}return items}catch{return []}}
function save(store,items){try{if(!Array.isArray(items)||items.length>3)return false;const valid=items.map(x=>normalize(x?.name,x?.url));if(valid.some(x=>!x)||new Set(valid.map(x=>x.url)).size!==valid.length||new Set(valid.map(x=>x.name.toLocaleLowerCase())).size!==valid.length)return false;store.setItem(KEY,JSON.stringify(valid));return true}catch{return false}}
function init(doc,store){
 const grid=doc.getElementById('streamingPlatformIcons'),add=doc.getElementById('addStreamingPlatform'),form=doc.getElementById('streamingAddForm');
 if(!grid||!add||!form||!store||add.dataset.bound)return;
 if(!doc.getElementById('streamingNewName')||!doc.getElementById('streamingNewUrl')||!doc.getElementById('streamingAddError')||!doc.getElementById('streamingAddCancel'))return;
 add.dataset.bound='1';
 const name=doc.getElementById('streamingNewName'),url=doc.getElementById('streamingNewUrl'),error=doc.getElementById('streamingAddError'),cancel=doc.getElementById('streamingAddCancel');
 const defaults=Array.from(grid.querySelectorAll('a'));
 const builtInUrls=new Set(defaults.map(link=>link.href));
 const builtInNames=new Set(defaults.map(link=>(link.getAttribute('aria-label')||'').replace(/^Open /,'').toLocaleLowerCase()));
 const fields=[name,url,...Array.from(form.querySelectorAll('button[type="submit"]'))];
 const capacityStatus=doc.createElement('p');capacityStatus.className='streaming-capacity-status';capacityStatus.setAttribute('role','status');capacityStatus.setAttribute('aria-live','polite');
 function syncCapacity(){const count=read(store).length;const full=count>=3;fields.forEach(el=>{el.hidden=full;el.disabled=full});form.dataset.atCapacity=String(full);capacityStatus.textContent=full?'3 of 3 shortcuts saved. Remove one to add another.':count+' of 3 shortcuts saved';return full}
 const manage=doc.createElement('div');manage.className='streaming-manage-list';manage.setAttribute('aria-label','Your custom platform shortcuts');form.appendChild(manage);
 capacityStatus.id='streamingShortcutCount';form.insertBefore(capacityStatus,manage);
 form.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();form.hidden=true;add.setAttribute('aria-expanded','false');error.textContent='';add.focus()}});
 defaults.forEach(link=>{link.title=link.getAttribute('aria-label')||link.textContent.trim()});
 add.title='Add a creator platform shortcut';
 function render(){
  grid.querySelectorAll('[data-custom-streaming]').forEach(el=>el.remove());
  const items=read(store);
  syncCapacity();
  manage.hidden=items.length===0;
  manage.setAttribute('role','group');
  manage.setAttribute('aria-label','Manage '+items.length+' custom creator '+(items.length===1?'shortcut':'shortcuts'));
  add.dataset.shortcutCount=String(items.length);
  // Custom shortcuts supplement the original platform links; never hide built-in icons.
  defaults.forEach(el=>{el.hidden=false});
  for(const item of items){
   const a=doc.createElement('a');a.href=item.url;a.target='_blank';a.rel='noopener noreferrer';a.setAttribute('aria-label','Open '+item.name);a.title='Open '+item.name;a.dataset.customStreaming='1';
   const mark=doc.createElement('span');mark.className='streaming-custom-mark';mark.textContent=item.name.slice(0,1).toUpperCase();
   const label=doc.createElement('span');label.textContent=item.name;a.append(mark,label);grid.insertBefore(a,add);
  }
  add.setAttribute('aria-label',items.length>=3?'Manage creator shortcuts':'Add a streaming platform');
  add.title=items.length>=3?'Manage your creator platform shortcuts':'Add a creator platform shortcut';
  add.setAttribute('aria-expanded',String(!form.hidden));
  add.setAttribute('aria-describedby','streamingShortcutCount');
  add.setAttribute('aria-haspopup','true');
  manage.replaceChildren();
  items.forEach(item=>{const row=doc.createElement('div');row.className='streaming-manage-item';const label=doc.createElement('span');label.textContent=item.name;const remove=doc.createElement('button');remove.type='button';remove.textContent='Remove';remove.setAttribute('aria-label','Remove '+item.name);remove.addEventListener('click',()=>{if(save(store,read(store).filter(x=>x.url!==item.url))){render();const next=manage.querySelector('button')||(!name.disabled?name:cancel);(form.hidden?add:next).focus()}});row.append(label,remove);manage.appendChild(row)});
 }
 add.addEventListener('click',()=>{form.hidden=!form.hidden;add.setAttribute('aria-expanded',String(!form.hidden));error.textContent='';if(!form.hidden)(syncCapacity()?manage.querySelector('button')||cancel:name).focus()});
 cancel.addEventListener('click',()=>{form.hidden=true;add.setAttribute('aria-expanded','false');add.focus()});
 form.addEventListener('submit',e=>{e.preventDefault();if(syncCapacity()){error.textContent='Remove a shortcut before adding another.';return}const item=normalize(name.value,url.value);if(!item){error.textContent='Enter a name and a secure https:// website URL.';return}const items=read(store);if(items.some(x=>x.url===item.url)||builtInUrls.has(item.url)){error.textContent='This shortcut already exists.';return}if(builtInNames.has(item.name.toLocaleLowerCase())||items.some(x=>x.name.toLocaleLowerCase()===item.name.toLocaleLowerCase())){error.textContent='Use a different name for this shortcut.';return}if(items.length>=3){error.textContent='Up to three custom shortcuts can be added.';return}if(!save(store,[...items,item])){error.textContent='Could not save this shortcut on this device.';return}error.textContent='';form.reset();form.hidden=true;render();const added=Array.from(grid.querySelectorAll('[data-custom-streaming]')).at(-1);if(added){added.scrollIntoView?.({block:'nearest',inline:'nearest'});added.focus()}else add.focus()});
 render();
}
const api={normalize,read,save,init,key:KEY};
root.CloutFlowStreamingShortcuts=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
if(root.document){const start=()=>{try{init(root.document,root.localStorage)}catch{}};if(root.document.readyState==='loading')root.document.addEventListener('DOMContentLoaded',start);else start()}
})(typeof window!=='undefined'?window:globalThis);
