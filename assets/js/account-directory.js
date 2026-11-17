/* Search and filter creator accounts without changing financial records. */
(function(root){
 'use strict';
 function filter(accounts,query='',status='all'){
  const needle=String(query||'').trim().toLocaleLowerCase();
  return accounts.filter(a=>{
   if(status==='managed'&&!a.tracked)return false;
   if(status==='unmanaged'&&a.tracked)return false;
   return !needle||[a.name,a.platform,a.notes].some(v=>String(v||'').toLocaleLowerCase().includes(needle));
  });
 }
 function summary(all,visible){return {total:all.length,visible:visible.length,managed:all.filter(a=>a.tracked).length,unmanaged:all.filter(a=>!a.tracked).length}}
 const api={filter,summary};root.CloutFlowAccountDirectory=api;
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
