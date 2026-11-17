/* Secondary navigation is UI-only; accounting actions remain owned by app.js. */
(()=>{'use strict';
 const more=document.getElementById('mobileMore');
 const menu=document.getElementById('mobileMoreMenu');
 if(!more||!menu)return;
 const close=(restore=false)=>{menu.hidden=true;more.setAttribute('aria-expanded','false');if(restore)more.focus()};
 const open=()=>{menu.hidden=false;more.setAttribute('aria-expanded','true');menu.querySelector('button')?.focus()};
 more.addEventListener('click',()=>menu.hidden?open():close(true));
 menu.addEventListener('click',e=>{if(e.target.closest('button'))close(true)});
 document.addEventListener('pointerdown',e=>{if(!menu.hidden&&!menu.contains(e.target)&&!more.contains(e.target))close()});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!menu.hidden){e.preventDefault();e.stopImmediatePropagation();close(true)}} ,true);
 const navigate=id=>{close();document.getElementById(id)?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'})};
 document.getElementById('mobileOverview')?.addEventListener('click',()=>navigate('mainContent'));
 document.getElementById('mobileActivity')?.addEventListener('click',()=>navigate('ledgerSection'));
 window.matchMedia('(min-width:801px)').addEventListener('change',e=>{if(e.matches)close()});
})();
