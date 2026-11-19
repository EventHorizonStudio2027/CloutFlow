const assert=require('node:assert/strict');
const fs=require('node:fs');
const html=fs.readFileSync('index.html','utf8');
const css=fs.readFileSync('assets/css/app.css','utf8');
const quick=html.indexOf('class="quick-access"');
const strip=html.indexOf('class="streaming-platform-strip"');
const notice=html.indexOf('Dashboard totals are calculated');
assert.ok(quick>=0&&strip>quick&&strip<notice,'streaming rail must follow Quick access');
const section=html.slice(strip,html.indexOf('</section>',strip));
assert.match(section,/<strong>Streaming<\/strong>/,'heading should say Streaming, not Streaming platforms');
for(const name of ['YouTube','Twitch','Kick','TikTok','Facebook','Instagram','Discord','Patreon','Ko-fi','Spotify','Rumble','YT Live'])assert.ok(section.includes('>'+name+'</span>'),name+' shortcut missing');
assert.equal((section.match(/<a href=/g)||[]).length,12,'expected 12 creator shortcuts');
assert.equal((section.match(/rel="noopener noreferrer"/g)||[]).length,12,'external links must be isolated');
assert.equal((section.match(/onerror="this.hidden=true;this.nextElementSibling.hidden=false"/g)||[]).length,12,'all icons need offline fallback');
for(const slug of ['youtube','twitch','kick','tiktok','facebook','instagram','discord','patreon','kofi','spotify','rumble']){
 const path='assets/icons/'+slug+'.svg';
 assert.ok(fs.existsSync(path),slug+' bundled icon missing');
 assert.ok(section.includes(path),slug+' icon not used');
 assert.match(fs.readFileSync(path,'utf8'),/<svg\b/,slug+' icon is not SVG');
}
assert.ok(!section.includes('cdn.simpleicons.org'),'brand icons must work offline');
assert.match(section,/tabindex="0" role="region"/,'shortcut rail should be keyboard scrollable');
assert.match(css,/\.streaming-platform-scroll\{[^}]*overflow-x:auto/,'mobile strip must scroll');
assert.match(css,/\.streaming-platform-icons \.streaming-icon-fallback\[hidden\]\{display:none\}/,'offline fallback hidden state');
console.log('Streaming creator rail: labels, real offline icons, fallback, keyboard and responsive checks passed');
