/* CloutFlow ledger discovery. No currency conversion or data mutation. */
(function(root){
  'use strict';
  const normalized=value=>String(value??'').normalize('NFKC').toLocaleLowerCase();
  function matches(entry,query){
    const terms=normalized(query).trim().split(/\s+/).filter(Boolean);
    if(!terms.length)return true;
    const haystack=normalized([entry.platform,entry.account,entry.incomeType,entry.description,entry.reference,entry.currency,entry.status,entry.earnedDate,entry.channel].join(' '));
    return terms.every(term=>haystack.includes(term));
  }
  function sorter(mode,net){
    return (a,b)=>{
      let cmp=0;
      if(mode==='oldest')cmp=a.earnedDate.localeCompare(b.earnedDate);
      else if(mode==='platform')cmp=a.platform.localeCompare(b.platform,undefined,{sensitivity:'base'});
      else if(mode==='net-high'||mode==='net-low'){
        // Never compare numeric amounts from different currencies as though exchange rates were known.
        cmp=a.currency.localeCompare(b.currency);
        if(!cmp)cmp=(mode==='net-high'?-1:1)*(net(a)-net(b));
      }else cmp=b.earnedDate.localeCompare(a.earnedDate);
      return cmp||b.earnedDate.localeCompare(a.earnedDate)||String(a.id).localeCompare(String(b.id));
    };
  }
  function hasFilters({search,account,type,status,sort}){return !!String(search).trim()||account!=='all'||type!=='all'||status!=='all'||sort!=='newest'}
  const api={matches,sorter,hasFilters};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  root.LedgerTools=api;
})(typeof window!=='undefined'?window:globalThis);
