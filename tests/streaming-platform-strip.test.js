const assert=require('node:assert/strict');
const fs=require('node:fs');
const html=fs.readFileSync('index.html','utf8');
const css=fs.readFileSync('assets/css/app.css','utf8');
const start=html.indexOf('class="streaming-platform-strip"');
const section=html.slice(start,html.indexOf('</section>',start));
assert.ok(start>html.indexOf('class="welcome"'));
assert.ok(start<html.indexOf('class="quick-access"'),'streaming dock must remain above Quick access');
assert.ok(start<html.indexOf('class="command-center"'),'streaming dock must remain above workspace');
assert.equal((html.match(/class="streaming-platform-strip"/g)||[]).length,1);
assert.match(section,/<strong>Streaming<\/strong><span>Quick links to your creator platforms<\/span>/);
for(const name of ['YouTube','Twitch','Kick','TikTok','Facebook','Instagram','Discord','Patreon','Ko-fi'])assert.ok(section.includes('>'+name+'</span>'),name+' shortcut missing');
assert.equal((section.match(/<a href=/g)||[]).length,9);
assert.match(section,/id="addStreamingPlatform"/);
assert.match(section,/aria-controls="streamingAddForm" aria-expanded="false"/);
assert.match(section,/Saved on this device\. Up to three custom shortcuts\./);
assert.match(section,/id="streamingAddForm"/);
assert.ok(!section.includes('streaming-platform-scroll'),'horizontal scroll wrapper removed');
assert.match(css,/grid-template-columns:repeat\(10,minmax\(0,1fr\)\)/);
assert.match(css,/\/\* Streaming dock refinement:[\s\S]*display:flex;justify-content:center/);
for(const slug of ['youtube','twitch','kick','tiktok','facebook','instagram','discord','patreon','kofi'])assert.ok(fs.readFileSync('assets/icons/'+slug+'.svg','utf8').includes('<svg'),slug+' local SVG missing');
assert.ok(html.includes('assets/js/streaming-shortcuts.js'));
assert.match(css,/\.streaming-add-form\[data-at-capacity="true"\]/);
assert.match(fs.readFileSync('assets/js/streaming-shortcuts.js','utf8'),/function syncCapacity\(\)/);
const custom=require('../assets/js/streaming-shortcuts.js');
assert.equal(custom.normalize('Example','javascript:alert(1)'),null);
assert.equal(custom.normalize('Example','http://example.com'),null);
assert.equal(custom.normalize('Example','https://exam'+String.fromCharCode(10)+'ple.com/'),null);
assert.equal(custom.normalize('Example','https://example.com/'+'a'.repeat(2050)),null);
assert.deepEqual(custom.normalize('  My   Channel  ',' https://example.com/ '),{name:'My Channel',url:'https://example.com/'});
assert.equal(custom.normalize('Example','https://user:pass@example.com'),null);
assert.deepEqual(custom.normalize(' Example ','https://example.com/'),{name:'Example',url:'https://example.com/'});
const memory={};const store={getItem:k=>memory[k]??null,setItem:(k,v)=>memory[k]=v};
assert.equal(custom.save(store,[{name:'Example',url:'https://example.com/'}]),true);
assert.deepEqual(custom.read(store),[{name:'Example',url:'https://example.com/'}]);
assert.equal(custom.save(store,[{name:'Bad',url:'javascript:alert(1)'}]),false);
assert.equal(custom.save(store,[1,2,3,4].map(n=>({name:'Platform '+n,url:'https://example'+n+'.com'}))),false);
store.setItem(custom.key,JSON.stringify([null,{name:'Recovered',url:'https://example.net'}]));
assert.deepEqual(custom.read(store),[{name:'Recovered',url:'https://example.net/'}]);
store.setItem(custom.key,JSON.stringify([null,null,null,{name:'Fourth',url:'https://fourth.example'}]));
assert.deepEqual(custom.read(store),[{name:'Fourth',url:'https://fourth.example/'}]);
store.setItem(custom.key,JSON.stringify([{name:'Example',url:'https://example.com/'}]));
assert.equal(custom.save(store,[{name:'A',url:'https://example.org'},{name:'B',url:'https://example.org'}]),false);
assert.equal(custom.save(store,[{name:'Same',url:'https://one.example'},{name:'same',url:'https://two.example'}]),false);
store.setItem(custom.key,JSON.stringify([{name:'One',url:'https://one.example'},{name:'Again',url:'https://one.example'}]));
assert.deepEqual(custom.read(store),[{name:'One',url:'https://one.example/'}]);
store.setItem(custom.key,JSON.stringify([{name:'Example',url:'https://example.com/'}]));
assert.deepEqual(custom.read(store),[{name:'Example',url:'https://example.com/'}]);
console.log('Streaming grid: 9 brand icons, add tile, responsive layout and safe custom URL checks passed');

// Current dock must stay a single centered flex row with slim shell and larger brand marks.
const latest=css.slice(css.lastIndexOf('/* Streaming dock refinement:'));
assert.match(latest,/display:flex;justify-content:center/);
assert.match(latest,/gap:2px/);
assert.match(latest,/width:27px;height:27px/);
assert.match(latest,/padding:5px 10px 6px/);
assert.ok(!latest.includes('repeat(5,'),'streaming icons must not wrap into two rows');
const shortcutSource=fs.readFileSync('assets/js/streaming-shortcuts.js','utf8');
assert.match(shortcutSource,/Custom shortcuts supplement the original platform links/);

// Compact editor must support keyboard dismissal and hide empty management controls.
assert.match(shortcutSource,/event\.key==='Escape'/);
assert.match(shortcutSource,/manage\.hidden=items\.length===0/);
assert.match(shortcutSource,/streaming-capacity-status/);
assert.match(shortcutSource,/Remove one to add another/);
assert.match(css,/\.streaming-capacity-status\{/);
assert.match(css,/\.streaming-manage-list\[hidden\]\{display:none!important\}/);

// Regression: capacity status must be inserted only after its reference element exists.
assert.ok(shortcutSource.indexOf('form.appendChild(manage)')<shortcutSource.indexOf('form.insertBefore(capacityStatus,manage)'));

// Adding custom links must never silently replace original platform icons.
assert.doesNotMatch(shortcutSource,/replaceable\.slice\(/);
assert.match(shortcutSource,/defaults\.forEach\(el=>\{el\.hidden=false\}\)/);
assert.match(css,/\.streaming-platform-icons\{overflow-x:auto;overflow-y:hidden/);
assert.match(css,/\.streaming-platform-icons a,\.streaming-platform-icons button\.streaming-add\{flex-shrink:0\}/);

// New shortcuts receive focus and are scrolled into view for keyboard and mobile users.
assert.match(shortcutSource,/added\.scrollIntoView\?\.\(\{block:'nearest',inline:'nearest'\}\)/);
assert.match(shortcutSource,/added\.focus\(\)/);
assert.match(shortcutSource,/builtInUrls\.has\(item\.url\)/);

// Removal at capacity must focus an enabled control, not a disabled name field.
assert.match(shortcutSource,/const next=manage\.querySelector\('button'\)\|\|\(!name\.disabled\?name:cancel\)/);
assert.match(shortcutSource,/capacityStatus\.id='streamingShortcutCount'/);
assert.match(css,/a\[data-custom-streaming\] span:last-child\{max-width:100%;overflow:hidden;text-overflow:ellipsis/);

// Built-in platform names cannot be impersonated by a custom shortcut.
assert.match(shortcutSource,/builtInNames\.has\(item\.name\.toLocaleLowerCase\(\)\)/);
assert.match(shortcutSource,/add\.setAttribute\('aria-haspopup','true'\)/);
assert.match(shortcutSource,/error\.textContent='';add\.focus\(\)/);
