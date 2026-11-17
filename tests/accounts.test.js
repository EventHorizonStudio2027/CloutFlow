const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../assets/js/app.js'),'utf8');
const start=source.indexOf('function accountCurrencyTotals('),end=source.indexOf('function renderAccounts()',start);
assert(start>=0&&end>start,'account currency helper must exist');
const context={net:e=>e.gross-e.fees-e.refunds-e.tax};vm.createContext(context);vm.runInContext(source.slice(start,end),context);
const account={platform:'YouTube',name:'Main'};
const record=(currency,gross,accountName='Main',platform='YouTube')=>({platform,account:accountName,currency,gross,fees:0,refunds:0,tax:0});
const cases=[
 ['no earnings returns empty list',()=>assert.equal(context.accountCurrencyTotals(account,[]).length,0)],
 ['USD and EUR remain separate',()=>{let r=context.accountCurrencyTotals(account,[record('USD',100),record('EUR',40)]);assert.deepEqual(Array.from(r,([c,v])=>[c,v]),[['EUR',40],['USD',100]])}],
 ['same-currency earnings sum',()=>assert.equal(context.accountCurrencyTotals(account,[record('USD',20),record('USD',30)])[0][1],50)],
 ['fees and tax reduce net',()=>assert.equal(context.accountCurrencyTotals(account,[{...record('USD',100),fees:10,tax:5}])[0][1],85)],
 ['different account excluded',()=>assert.equal(context.accountCurrencyTotals(account,[record('USD',100,'Other')]).length,0)],
 ['different platform excluded',()=>assert.equal(context.accountCurrencyTotals(account,[record('USD',100,'Main','Twitch')]).length,0)],
 ['negative net adjustment embedded in record reflected',()=>assert.equal(context.accountCurrencyTotals(account,[{...record('USD',100),refunds:20}])[0][1],80)]
];
for(const [name,test] of cases){test();console.log('PASS',name)}console.log(`${cases.length}/${cases.length} account currency tests passed`);
