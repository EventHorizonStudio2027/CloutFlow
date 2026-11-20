'use strict';
/* Presentation-only privacy shield: financial records and exports are untouched. */
(function(){
 const KEY='cloutflow_privacy_shield_v1';
 const button=document.getElementById('privacyShieldToggle');
 if(!button)return;
 let hidden=false;
 try{hidden=localStorage.getItem(KEY)==='on'}catch{}
 function apply(){
  document.body.classList.toggle('privacy-shield',hidden);
  button.setAttribute('aria-pressed',String(hidden));
  button.textContent=hidden?'◉ Show amounts':'◌ Hide amounts';
  button.setAttribute('aria-label',hidden?'Show financial amounts':'Hide financial amounts');
  button.title=hidden?'Reveal financial figures (Alt+Shift+P)':'Conceal financial figures (Alt+Shift+P)';
 }
 function toggle(){hidden=!hidden;apply();try{localStorage.setItem(KEY,hidden?'on':'off')}catch{}}
 button.addEventListener('click',toggle);
 document.addEventListener('keydown',event=>{
  if(event.altKey&&event.shiftKey&&event.key.toLowerCase()==='p'&&!event.repeat&&!event.isComposing&&!event.target?.closest?.('input,textarea,select,[contenteditable="true"]')){event.preventDefault();toggle()}
 });
 apply();
})();
