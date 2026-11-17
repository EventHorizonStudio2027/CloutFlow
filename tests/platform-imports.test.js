const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const src=fs.readFileSync(path.join(__dirname,'../assets/js/app.js'),'utf8');
function slice(a,b){const i=src.indexOf(a),j=src.indexOf(b,i);assert(i>=0&&j>i,`Missing ${a}`);return src.slice(i,j)}
const ctx={crypto:{randomUUID:()=>`id-${++ctx.serial}`},serial:0};vm.createContext(ctx);
vm.runInContext([slice('const $=id=>','function toast(s)'),slice('function parseCSV(text){','let pendingImport=null;'),slice('function parseYouTubeAnalytics(text,account){','function preparePlatformImport(text){'),slice('function fingerprint(e){','function restore(text){')].join('\n'),ctx);
function call(fn,...args){ctx.args=args;return vm.runInContext(fn+'(...args)',ctx)}
const yt='Date,Estimated revenue (USD)\n2026-10-01,12.45\n';
const apple='Begin Date\tUnits\tDeveloper Proceeds\tProceeds Currency\tTitle\n20261001\t2\t1.25\tUSD\tMy App\n';
const google='Transaction Date,Transaction Type,Amount (Merchant Currency),Merchant Currency,Product Title,Transaction ID\n2026-10-01,Sale,2.50,USD,My App,order-1\n';
const tests=[
 ['YouTube valid estimated revenue',()=>{const r=call('parseYouTubeAnalytics',yt,'Channel');assert.equal(r.length,1);assert.equal(r[0].gross,12.45);assert.equal(r[0].status,'Pending')}],
 ['YouTube rejects unlabeled currency',()=>assert.throws(()=>call('parseYouTubeAnalytics',yt.replace(' (USD)',''),'Channel'),/currency/i)],
 ['YouTube rejects zero revenue',()=>assert.throws(()=>call('parseYouTubeAnalytics',yt.replace('12.45','0'),'Channel'),/zero/i)],
 ['YouTube rejects negative revenue',()=>assert.throws(()=>call('parseYouTubeAnalytics',yt.replace('12.45','-1'),'Channel'),/negative/i)],
 ['YouTube rejects invalid date',()=>assert.throws(()=>call('parseYouTubeAnalytics',yt.replace('2026-10-01','2026-02-30'),'Channel'),/date/i)],
 ['Apple positive proceeds and units',()=>{const r=call('parseAppleSalesTrends',apple,'App');assert.equal(r[0].gross,2.5);assert.equal(r[0].platform,'Apple App Store')}],
 ['Apple rejects zero units',()=>assert.throws(()=>call('parseAppleSalesTrends',apple.replace('\t2\t1.25','\t0\t1.25'),'App'),/proceeds|represented/i)],
 ['Apple rejects refunded units',()=>assert.throws(()=>call('parseAppleSalesTrends',apple.replace('\t2\t1.25','\t-2\t1.25'),'App'),/refunded/i)],
 ['Apple rejects unsupported currency',()=>assert.throws(()=>call('parseAppleSalesTrends',apple.replace('\tUSD\t','\tINR\t'),'App'),/currency/i)],
 ['Apple rejects malformed columns',()=>assert.throws(()=>call('parseAppleSalesTrends',apple.replace('My App','My App\textra'),'App'),/columns/i)],
 ['Google positive sale',()=>{const r=call('parseGooglePlayEarnings',google,'Game');assert.equal(r[0].gross,2.5);assert.equal(r[0].reference,'googleplay:order-1')}],
 ['Google rejects zero sale',()=>assert.throws(()=>call('parseGooglePlayEarnings',google.replace(',2.50,',',0,'),'Game'),/zero/i)],
 ['Google rejects chargebacks',()=>assert.throws(()=>call('parseGooglePlayEarnings',google.replace(',Sale,',',Chargeback,'),'Game'),/chargeback/i)],
 ['Google rejects negative proceeds',()=>assert.throws(()=>call('parseGooglePlayEarnings',google.replace(',2.50,',',-2.50,'),'Game'),/negative/i)],
 ['Google rejects unsupported currency',()=>assert.throws(()=>call('parseGooglePlayEarnings',google.replace(',USD,',',INR,'),'Game'),/currency/i)],
 ['Google rejects missing required headers',()=>assert.throws(()=>call('parseGooglePlayEarnings',google.replace('Product Title','Unknown Title'),'Game'),/required headers/i)],
 ['Google rejects malformed quoted rows',()=>assert.throws(()=>call('parseGooglePlayEarnings',google.replace('My App','"Unclosed'),'Game'),/quote/i)],
 ['Reference dedup ignores case but respects currency',()=>{const base={reference:' Order-1 ',platform:'Google Play',account:'Game',currency:'USD'};assert.equal(call('fingerprint',base),call('fingerprint',{...base,reference:'order-1'}));assert.notEqual(call('fingerprint',base),call('fingerprint',{...base,currency:'EUR'}))}],
 ['Raw validator rejects malformed account collection',()=>assert.match(call('validateRawFinancialRecords',{entries:[],accounts:{}}),/array/i)],
 ['Raw validator rejects conflicting legacy amounts',()=>assert.match(call('validateRawFinancialRecords',{entries:[{id:'a',gross:5,amount:10}]}),/conflicting/i)]
];
let passed=0;for(const [name,fn] of tests){try{fn();passed++;console.log('PASS:',name)}catch(e){console.error('FAIL:',name);throw e}}console.log(`${passed}/${tests.length} platform import tests passed`);
