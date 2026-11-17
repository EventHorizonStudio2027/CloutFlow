/* Currency-isolated overview; never convert or combine unlike currencies. */
(function(root){
  function finite(n){return typeof n==='number'&&Number.isFinite(n)?n:0}
  function summarize(earned, adjustments, deposits, netFn){
    const groups=new Map();
    function group(currency){if(!groups.has(currency))groups.set(currency,{currency,transactions:0,net:0,adjustments:0,deposits:0});return groups.get(currency)}
    for(const e of earned){const g=group(e.currency);g.transactions++;g.net+=finite(netFn(e))}
    for(const a of adjustments)group(a.currency).adjustments+=finite(a.amount);
    for(const d of deposits)group(d.currency).deposits+=finite(d.amount);
    return [...groups.values()].map(g=>({...g,adjustedNet:g.net+g.adjustments})).sort((a,b)=>a.currency.localeCompare(b.currency));
  }
  root.CurrencyOverview={summarize};
  if(typeof module!=='undefined'&&module.exports)module.exports={summarize};
})(typeof window!=='undefined'?window:globalThis);
