'use strict';const assert=require('assert');const {analyze}=require('../assets/js/income-intelligence');
const report={currencies:['USD','EUR'],rows:[{month:'2026-09',amounts:[{currency:'USD',amount:100,hasData:true},{currency:'EUR',amount:0,hasData:false}]},{month:'2026-10',amounts:[{currency:'USD',amount:150,hasData:true},{currency:'EUR',amount:20,hasData:true}]},{month:'2026-11',amounts:[{currency:'USD',amount:120,hasData:true},{currency:'EUR',amount:0,hasData:false}]}]};
const [usd,eur]=analyze(report);assert.equal(usd.delta,-30);assert.equal(usd.percentChange,-20);assert.equal(usd.average,123.33);assert.equal(usd.averageAbsoluteChange,35);assert.equal(usd.observedMonths,3);assert.equal(eur.delta,null);assert.equal(eur.observedMonths,1);assert.equal(eur.averageAbsoluteChange,null);
assert.deepEqual(analyze({rows:[],currencies:[]}),[]);assert.equal(analyze({currencies:['USD'],rows:[{month:'2026-10',amounts:[{currency:'USD',amount:0,hasData:true}]},{month:'2026-11',amounts:[{currency:'USD',amount:30,hasData:true}]}]})[0].percentChange,null);
console.log('Income intelligence tests passed');

const fourMonths={currencies:['USD'],rows:[
 {month:'2026-07',amounts:[{currency:'USD',amount:90,hasData:true}]},
 {month:'2026-08',amounts:[{currency:'USD',amount:100,hasData:true}]},
 {month:'2026-09',amounts:[{currency:'USD',amount:1000,hasData:true}]},
 {month:'2026-10',amounts:[{currency:'USD',amount:10,hasData:true}]}
]};
assert.deepEqual(analyze(fourMonths)[0].baseline,{amount:100,months:['2026-07','2026-08','2026-09'],method:'median of three completed recorded months'});
assert.equal(analyze({...fourMonths,rows:fourMonths.rows.slice(1)})[0].baseline,null);
assert.equal(analyze({...fourMonths,rows:[fourMonths.rows[0],{...fourMonths.rows[1],month:'2026-08',amounts:[]},...fourMonths.rows.slice(2)]})[0].baseline,null);
assert.equal(analyze({...fourMonths,rows:[fourMonths.rows[0],{...fourMonths.rows[1],month:'2026-06'},...fourMonths.rows.slice(2)]})[0].baseline,null);
