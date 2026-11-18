/* CloutFlow provider connection UI. Never stores OAuth tokens or provider secrets. */
(function(root){
'use strict';
const PROVIDERS=[
 {id:'youtube',name:'YouTube',group:'Streaming & social',logo:'youtube',scope:'Channel identity and earnings',status:'planned'},
 {id:'twitch',name:'Twitch',group:'Streaming & social',logo:'twitch',scope:'Channel identity and earnings',status:'planned'},
 {id:'patreon',name:'Patreon',group:'Memberships',logo:'patreon',scope:'Creator identity and payouts',status:'planned'},
 {id:'shopify',name:'Shopify',group:'Commerce',logo:'shopify',scope:'Store identity and sales',status:'planned'},
 {id:'stripe',name:'Stripe',group:'Payments',logo:'stripe',scope:'Connected account and balance transactions',status:'planned'},
 {id:'paypal',name:'PayPal',group:'Payments',logo:'paypal',scope:'Merchant transactions',status:'planned'},
 {id:'googleplay',name:'Google Play',group:'Apps & games',logo:'googleplay',scope:'App sales and subscriptions',status:'planned'},
 {id:'apple',name:'Apple App Store',group:'Apps & games',logo:'apple',scope:'App sales and subscriptions',status:'planned'}
];
const DEFAULT_CONFIG={apiBase:''};
function validateApiBase(value,origin){
 if(!value)return '';
 try{const url=new URL(value,origin);if(url.username||url.password||url.search||url.hash)return '';if(url.protocol!=='https:'&&url.origin!==origin)return '';return url.href.replace(/\/$/,'')}catch{return ''}
}
function init(doc=root.document,config=DEFAULT_CONFIG){
 if(!doc||doc.getElementById('cloutflowIntegrations'))return;
 const section=doc.getElementById('accountsSection');if(!section)return;
 const wrap=doc.createElement('section');wrap.id='cloutflowIntegrations';wrap.className='integration-center';
 const heading=doc.createElement('div');heading.className='integration-head';
 const title=doc.createElement('h4');title.textContent='Account integrations';
 const explanation=doc.createElement('p');explanation.textContent='Secure connections are being developed. No platform is linked yet. Adding an account manually does not authorize data access.';
 heading.append(title,explanation);wrap.append(heading);
 const state=doc.createElement('p');state.id='integrationState';state.className='integration-state';state.setAttribute('role','status');state.textContent='Automatic account linking requires a secure connection service.';wrap.append(state);
 const grid=doc.createElement('div');grid.className='integration-grid';wrap.append(grid);
 const origin=doc.defaultView?.location?.origin||'https://example.com';
 const apiBase=validateApiBase(config.apiBase||'',origin);
 function renderStatuses(statuses={}){
  grid.replaceChildren();
  for(const provider of PROVIDERS){
   const card=doc.createElement('article');card.className='integration-card';
   const icon=doc.createElement('span');icon.className='integration-icon';icon.textContent=provider.name.slice(0,1);
   const logo=doc.createElement('img');logo.alt='';logo.loading='lazy';logo.referrerPolicy='no-referrer';logo.src='https://cdn.simpleicons.org/'+provider.logo;
   logo.addEventListener('error',()=>logo.remove(),{once:true});icon.append(logo);
   const text=doc.createElement('div');const name=doc.createElement('strong');name.textContent=provider.name;
   const detail=doc.createElement('small');detail.textContent=provider.scope;const group=doc.createElement('small');group.textContent=provider.group;
   text.append(name,detail,group);
   const status=statuses[provider.id];const connected=status&&status.connected===true;
   const button=doc.createElement('button');button.type='button';button.className='btn small';
   if(connected){button.textContent='Connected';button.disabled=true;}
   else if(apiBase&&status&&status.available===true){
    button.textContent='Connect';
    button.addEventListener('click',()=>{const endpoint=apiBase+'/oauth/'+encodeURIComponent(provider.id)+'/start';root.location.assign(endpoint)});
   }else{button.textContent='Coming soon';button.disabled=true;}
   card.append(icon,text,button);grid.append(card);
  }
 }
 renderStatuses();
 if(apiBase&&typeof root.fetch==='function'){
  root.fetch(apiBase+'/integrations/status',{credentials:'include',headers:{Accept:'application/json'}})
   .then(r=>{if(!r.ok)throw Error('Connection service unavailable');return r.json()})
   .then(data=>{if(!data||typeof data!=='object'||!data.providers||typeof data.providers!=='object')throw Error('Invalid status response');renderStatuses(data.providers);state.textContent='Connection availability retrieved. Earnings import requires a separate authorized sync.'})
   .catch(()=>{state.textContent='Secure connection service unavailable. Your local income records are unaffected.'});
 }
 section.append(wrap);
}
const api={PROVIDERS,validateApiBase,init};
root.CloutFlowIntegrations=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
if(root.document){if(root.document.readyState==='loading')root.document.addEventListener('DOMContentLoaded',()=>init(root.document,root.CloutFlowIntegrationConfig||DEFAULT_CONFIG));else init(root.document,root.CloutFlowIntegrationConfig||DEFAULT_CONFIG)}
})(typeof window!=='undefined'?window:globalThis);
