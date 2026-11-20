/* Account controls deliberately do not synchronize financial data yet. */
(function(){'use strict';
const panel=document.getElementById('cloudAccountPanel'),status=document.getElementById('cloudAccountStatus');
if(!panel||!status||!window.CloutFlowAuth)return;
let token=null;
panel.addEventListener('submit',async event=>{
 event.preventDefault();const form=event.target;if(!(form instanceof HTMLFormElement))return;
 const button=event.submitter;if(!button||!button.dataset.authAction)return;
 const email=form.elements.namedItem('cloudEmail')?.value?.trim();
 const password=form.elements.namedItem('cloudPassword')?.value;
 if(!email||!password){status.textContent='Enter your email and password.';return}
 button.disabled=true;status.textContent='Contacting secure account service…';
 try{
  const data=button.dataset.authAction==='signup'?await window.CloutFlowAuth.signUp(email,password):await window.CloutFlowAuth.signIn(email,password);
  if(data.access_token){token=data.access_token;status.textContent='Signed in for this page session. Financial data is still stored only in this browser.';panel.querySelector('[data-cloud-signout]').hidden=false;}
  else status.textContent='Account request received. Check your email to confirm your address before signing in.';
  form.elements.namedItem('cloudPassword').value='';
 }catch(e){status.textContent=e.message||'Could not authenticate.'}
 finally{button.disabled=false}
});
panel.querySelector('[data-cloud-signout]')?.addEventListener('click',async()=>{
 if(token){try{await window.CloutFlowAuth.signOut(token)}catch(_){/* Local session still cleared */}}
 token=null;status.textContent='Signed out. Your local financial records have not changed.';
 panel.querySelector('[data-cloud-signout]').hidden=true;
});
})();
