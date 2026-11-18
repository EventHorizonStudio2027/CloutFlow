'use strict';
/* Dashboard density is a display preference only; never touches financial records. */
(function(){
  const button=document.getElementById('densityToggle');
  if(!button)return;
  const storageKey='cloutflow_dashboard_density_v1';
  let compact=true;
  try{compact=localStorage.getItem(storageKey)!=='comfortable'}catch(_){}
  function render(){
    document.documentElement.classList.toggle('comfortable-dashboard',!compact);
    button.setAttribute('aria-pressed',String(compact));
    button.textContent=compact?'Compact view':'Comfortable view';
    button.title=compact?'Switch to roomier dashboard spacing':'Switch to compact dashboard spacing';
  }
  button.addEventListener('click',function(){
    compact=!compact;
    try{localStorage.setItem(storageKey,compact?'compact':'comfortable')}catch(_){}
    render();
  });
  render();
})();
