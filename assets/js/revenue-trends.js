/* Pure projection of the same USD buckets used by the dashboard chart. */
const RevenueTrends={rows(buckets){return buckets.map(b=>({period:String(b.label),adjustedNet:Math.round((Number(b.value)+Number.EPSILON)*100)/100}))}};
if(typeof module!=='undefined')module.exports=RevenueTrends;
