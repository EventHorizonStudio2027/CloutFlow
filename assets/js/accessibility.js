/* CloutFlow dialog and keyboard accessibility enhancement. No financial data mutations. */
(()=>{
 'use strict';
 const dialogs=[...document.querySelectorAll('.modal-backdrop')];
 const focusable='button:not([disabled]):not(.hidden),[href],input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
 const lastFocus=new WeakMap();
 let active=null;
 for(const dialog of dialogs){
   const panel=dialog.querySelector('.modal');
   if(!panel)continue;
   dialog.setAttribute('role','dialog');
   dialog.setAttribute('aria-modal','true');
   const heading=panel.querySelector('h3');
   if(heading){if(!heading.id)heading.id='heading-'+dialog.id;dialog.setAttribute('aria-labelledby',heading.id)}
   const description=panel.querySelector(':scope > p');
   if(description){if(!description.id)description.id='description-'+dialog.id;dialog.setAttribute('aria-describedby',description.id)}
   panel.setAttribute('tabindex','-1');
 }
 function opened(){return dialogs.filter(d=>d.classList.contains('show'))}
 function refresh(){
   const visible=opened(),top=visible[visible.length-1]||null;
   if(top===active)return;
   const previous=active;active=top;
   if(previous&&!previous.classList.contains('show')){
     const origin=lastFocus.get(previous);
     if(origin&&origin.isConnected&&typeof origin.focus==='function')origin.focus({preventScroll:true});
   }
   if(top){
     if(!lastFocus.has(top))lastFocus.set(top,document.activeElement);
     const first=top.querySelector(focusable);
     (first||top.querySelector('.modal')).focus({preventScroll:true});
   }
   document.body.classList.toggle('dialog-open',Boolean(top));
 }
 const observer=new MutationObserver(refresh);
 for(const dialog of dialogs)observer.observe(dialog,{attributes:true,attributeFilter:['class']});
 document.addEventListener('keydown',event=>{
   const visible=opened(),dialog=visible[visible.length-1];if(!dialog)return;
   if(event.key==='Escape'){
     event.preventDefault();
     dialog.classList.remove('show');
     return;
   }
   if(event.key!=='Tab')return;
   const nodes=[...dialog.querySelectorAll(focusable)].filter(el=>el.getClientRects().length>0);
   if(!nodes.length){event.preventDefault();dialog.querySelector('.modal').focus();return}
   const first=nodes[0],last=nodes[nodes.length-1];
   if(event.shiftKey&&(document.activeElement===first||!dialog.contains(document.activeElement))){event.preventDefault();last.focus()}
   else if(!event.shiftKey&&(document.activeElement===last||!dialog.contains(document.activeElement))){event.preventDefault();first.focus()}
 });
 // Labels are explicitly associated with their controls for screen-reader and touch use.
 for(const field of document.querySelectorAll('.field')){
   const label=field.querySelector('label');
   const control=field.querySelector('input:not([type="hidden"]),select,textarea');
   if(label&&control&&control.id&&!label.hasAttribute('for'))label.setAttribute('for',control.id);
 }
})();
