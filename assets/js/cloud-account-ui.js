/* Account controls deliberately do not synchronize financial data yet. */
(function(){'use strict';
const panel=document.getElementById('cloudAccountPanel'),status=document.getElementById('cloudAccountStatus');
if(!panel||!status||!window.CloutFlowAuth)return;
let token=null;
const cloudBackup=panel.querySelector('[data-cloud-backup]');
const cloudDownload=panel.querySelector('[data-cloud-download]');
const canonical=value=>JSON.stringify(value,(key,item)=>item&&typeof item==='object'&&!Array.isArray(item)?Object.fromEntries(Object.entries(item).sort(([a],[b])=>a.localeCompare(b))):item);
panel.addEventListener('submit',async event=>{
 event.preventDefault();const form=event.target;if(!(form instanceof HTMLFormElement))return;
 const button=event.submitter;if(!button||!button.dataset.authAction)return;
 const email=form.elements.namedItem('cloudEmail')?.value?.trim();
 const password=form.elements.namedItem('cloudPassword')?.value;
 if(!email||!password){status.textContent='Enter your email and password.';return}
 button.disabled=true;status.textContent='Contacting secure account service…';
 try{
  const data=button.dataset.authAction==='signup'?await window.CloutFlowAuth.signUp(email,password):await window.CloutFlowAuth.signIn(email,password);
  if(data.access_token){token=data.access_token;status.textContent='Signed in for this page session. Financial data is still stored only in this browser.';panel.querySelector('[data-cloud-signout]').hidden=false;cloudBackup.hidden=false;cloudDownload.hidden=false;}
  else status.textContent='Account request received. Check your email to confirm your address before signing in.';
  form.elements.namedItem('cloudPassword').value='';
 }catch(e){status.textContent=e.message||'Could not authenticate.'}
 finally{button.disabled=false}
});
cloudBackup?.addEventListener('click',async()=>{
 if(!token)return;
 const raw=localStorage.getItem('creatorLedgerData_v2');
 if(!raw){status.textContent='No saved core ledger was found in this browser.';return}
 let snapshot;
 try{snapshot=JSON.parse(raw)}catch(_){status.textContent='Local ledger is invalid; export a backup and repair it first.';return}
 if(!snapshot||!Array.isArray(snapshot.entries)||!Array.isArray(snapshot.accounts)||!Array.isArray(snapshot.payouts)||!Array.isArray(snapshot.adjustments)){
  status.textContent='Core ledger structure is incomplete. Nothing uploaded.';return;
 }
 if(!confirm('Save a first cloud copy of the core ledger (income, accounts, payouts, adjustments)? This is not automatic sync, and the existing cloud copy cannot be overwritten. Other local modules are not included.'))return;
 cloudBackup.disabled=true;status.textContent='Saving and verifying first cloud copy…';
 try{
  const user=await window.CloutFlowAuth.currentUser(token);
  if(!user.id)throw Error('Could not identify signed-in account');
  await window.CloutFlowAuth.firstBackup(token,user.id,snapshot);
  const saved=await window.CloutFlowAuth.readBackup(token,user.id);
  if(!saved||!saved.snapshot||!Array.isArray(saved.snapshot.entries))throw Error('Cloud readback has an invalid ledger structure');
  if(!saved||canonical(saved.snapshot)!==canonical(snapshot))throw Error('Cloud copy saved, but exact readback verification failed. Do not retry blindly.');
  status.textContent='First cloud copy saved and verified. Local records remain unchanged. This is not live sync.';
  cloudBackup.hidden=true;
 }catch(e){status.textContent=e.message||'Cloud copy could not be verified'}
 finally{cloudBackup.disabled=false}
});
cloudDownload?.addEventListener('click',async()=>{
 if(!token)return;
 cloudDownload.disabled=true;status.textContent='Retrieving your cloud copy…';
 try{
  const user=await window.CloutFlowAuth.currentUser(token);
  if(!user.id)throw Error('Could not identify signed-in account');
  const saved=await window.CloutFlowAuth.readBackup(token,user.id);
  if(!saved||!saved.snapshot)throw Error('No cloud copy exists for this account');
  const ledger=saved.snapshot;
  if(!ledger||!['entries','accounts','payouts','adjustments'].every(key=>Array.isArray(ledger[key])))throw Error('Cloud copy has an invalid core-ledger structure. Download blocked.');
  const blob=new Blob([JSON.stringify(saved.snapshot,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob),link=document.createElement('a');
  link.href=url;link.download='cloutflow-cloud-core-ledger-'+new Date().toISOString().slice(0,10)+'.json';
  document.body.appendChild(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),60000);
  status.textContent='Cloud core-ledger copy downloaded. Existing local data was not changed.';
 }catch(e){status.textContent=e.message||'Cloud copy download failed'}
 finally{cloudDownload.disabled=false}
});
panel.querySelector('[data-cloud-signout]')?.addEventListener('click',async()=>{
 if(token){try{await window.CloutFlowAuth.signOut(token)}catch(_){/* Local session still cleared */}}
 token=null;status.textContent='Signed out. Your local financial records have not changed.';
 panel.querySelector('[data-cloud-signout]').hidden=true;cloudBackup.hidden=true;cloudDownload.hidden=true;
});
})();
