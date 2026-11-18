/* Creator platform logo resolver. Brand SVGs load from Simple Icons; fallback initials remain visible offline. */
(function(root){'use strict';
const slugs={
'youtube':'youtube','youtube music':'youtubemusic','twitch':'twitch','kick':'kick','tiktok':'tiktok','facebook':'facebook','facebook gaming':'facebookgaming','instagram':'instagram','threads':'threads','x':'x','twitter':'x','patreon':'patreon','kofi':'kofi','ko-fi':'kofi','paypal':'paypal','streamlabs':'streamlabs','shopify':'shopify','etsy':'etsy','teespring':'spring','spring':'spring','amazon':'amazon','impact':'impact','ltk':'ltk','apple app store':'appstore','app store':'appstore','google play':'googleplay','google play store':'googleplay','google adsense':'googleadsense','adsense':'googleadsense','substack':'substack','discord':'discord','spotify':'spotify','pinterest':'pinterest','snapchat':'snapchat','linkedin':'linkedin','stripe':'stripe','gumroad':'gumroad','buy me a coffee':'buymeacoffee','fourthwall':'fourthwall','bandcamp':'bandcamp','soundcloud':'soundcloud','medium':'medium','reddit':'reddit','github':'github','apple':'apple','google':'google'
};
function normalize(value){return String(value||'').trim().toLowerCase().replace(/\s+/g,' ')}
function slug(value){return slugs[normalize(value)]||null}
function initials(value){return String(value||'?').trim().slice(0,2).toUpperCase()||'?'}
function escape(value){return String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')}
function html(value){const name=String(value||'Unknown');const icon=slug(name);const fallback=escape(initials(name));return '<span class="platform-ico brand-icon" title="'+escape(name)+'" aria-label="'+escape(name)+'">'+(icon?'<img alt="" loading="lazy" decoding="async" src="https://cdn.simpleicons.org/'+icon+'" onerror="this.remove()" />':'')+'<span class="brand-fallback" aria-hidden="true">'+fallback+'</span></span>'}
const api={slug,html,initials};root.CloutFlowPlatformIcons=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
