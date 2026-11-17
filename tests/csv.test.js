const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const source=fs.readFileSync(path.resolve(__dirname,'../assets/js/app.js'),'utf8');
function segment(start,end){const a=source.indexOf(start),b=source.indexOf(end,a);assert(a>=0&&b>a);return source.slice(a,b)}
const context=vm.createContext({});
vm.runInContext(segment('function csvCell(v){','function exportAdjustmentCSV(){')+'\n'+segment('function parseCSV(text){','let pendingImport=null;'),context);
const parse=text=>Array.from(vm.runInContext('parseCSV('+JSON.stringify(text)+')',context),row=>Array.from(row));
const cell=value=>vm.runInContext('csvCell('+JSON.stringify(value)+')',context);
const tests=[
 ['quoted commas',()=>assert.deepEqual(parse('a,b\r\n"hello, world",42\r\n'),[['a','b'],['hello, world','42']])],
 ['embedded newlines',()=>assert.deepEqual(parse('a,b\n"line 1\nline 2",ok'),[['a','b'],['line 1\nline 2','ok']])],
 ['escaped quotes',()=>assert.deepEqual(parse('a\n"He said ""yes"""'),[['a'],['He said "yes"']])],
 ['blank lines and trailing newline',()=>assert.deepEqual(parse('a,b\n\n1,2\n'),[['a','b'],['1','2']])],
 ['unclosed quote rejected',()=>assert.throws(()=>parse('a\n"unfinished'),/Unclosed CSV quote/)],
 ['unquoted interior quote rejected',()=>assert.throws(()=>parse('a\nfoo"bar'),/Unexpected quote/)],
 ['text after closing quote rejected',()=>assert.throws(()=>parse('a\n"hello"oops'),/Unexpected text/)],
 ['quote after closed field rejected',()=>assert.throws(()=>parse('a\n"hello" "world"'),/Unexpected text/)],
 ['safe export of formula',()=>assert.equal(cell('=HYPERLINK("https://evil")'),'"\'=HYPERLINK(""https://evil"")"')],
 ['negative numeric values stay numeric',()=>assert.equal(cell(-12.5),'"-12.5"')],
 ['ordinary cells round trip',()=>{for(const s of ['A, B','He said "hi"','first\nsecond','plain'])assert.equal(parse(cell(s))[0][0],s)}],
 ['empty CSV is empty',()=>assert.deepEqual(parse(''),[])],
 ['table export round trip',()=>{
  context.download=(name,body)=>{context.exported={name,body}};
  context.testRows=[{description:'Hello, "world"\nsecond line',gross:12.34}];
  vm.runInContext('exportTableCSV("test.csv",[["description","description"],["gross","gross"]],testRows)',context);
  assert.equal(context.exported.name,'test.csv');
  assert.deepEqual(parse(context.exported.body.replace(/^\uFEFF/,'')),[['description','gross'],['Hello, "world"\nsecond line','12.34']]);
 }],
];
let passed=0;for(const [name,test] of tests){try{test();passed++;console.log('PASS:',name)}catch(e){console.error('FAIL:',name);throw e}}
console.log(`${passed}/${tests.length} CSV regression tests passed`);
