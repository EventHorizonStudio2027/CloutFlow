/* CloutFlow home source rail: popular streaming icons + add-any-source picker. */
(function(){
'use strict';
const ICONS={'YouTube':'youtube','Twitch':'twitch','TikTok':'tiktok','Kick':'kick','Facebook':'facebook','Instagram':'instagram','Patreon':'patreon','X':'x','Substack':'substack','Discord':'discord','Rumble':'rumble','Snapchat':'snapchat','LinkedIn':'linkedin','Pinterest':'pinterest','Spotify':'spotify','SoundCloud':'soundcloud','Medium':'medium','OnlyFans':'onlyfans','Apple App Store':'apple','Google Play':'googleplay','Steam':'steam','Epic Games Store':'epicgames','itch.io':'itchdotio','Roblox':'roblox','Unity Asset Store':'unity','Unreal Engine Marketplace':'unrealengine','Microsoft Store':'microsoftstore','Shopify':'shopify','Fourthwall':'fourthwall','Etsy':'etsy','Ko-fi':'kofi','Buy Me a Coffee':'buymeacoffee','Amazon Associates':'amazon','Amazon KDP':'amazon','Gumroad':'gumroad','Lemon Squeezy':'lemonsqueezy','Sellfy':'sellfy','Teespring':'spring','Redbubble':'redbubble','Printful':'printful','eBay':'ebay','PayPal':'paypal','Stripe':'stripe','Streamlabs':'streamlabs','Impact':'impact','LTK':'liketoknowit','Fiverr':'fiverr','Upwork':'upwork'};
const DEFAULT=['YouTube','Twitch','TikTok','Kick','Facebook','Instagram','Patreon','Rumble','Discord','X'];
const STORAGE='cloutflow_home_sources_v1';
function init(){
 const home=document.getElementById('sourceHomeSection'),channel=document.getElementById('channel'),platform=document.getElementById('platform');
 if(!home||!channel||!platform||document.getElementById('sourceRail'))return;
 const originalChannel=channel.value,originalPlatform=platform.value;
 const groups=[{key:'stream',title:'Streaming & social'},{key:'app',title:'Apps & games'},{key:'commerce',title:'Stores & other'}];
 const catalog={};
 for(const group of groups){channel.value=group.key;channel.dispatchEvent(new Event('change'));for(const option of platform.options)catalog[option.value]=group.key;}
 channel.value=originalChannel;channel.dispatchEvent(new Event('change'));if(catalog[originalPlatform]===originalChannel)platform.value=originalPlatform;
 let saved=[];try{const value=JSON.parse(localStorage.getItem(STORAGE)||'[]');if(Array.isArray(value))saved=value.filter(n=>typeof n==='string'&&catalog[n]&&!DEFAULT.includes(n)).slice(0,30)}catch{}
 const section=document.createElement('div');section.id='sourceRail';section.className='source-rail';
 const rail=document.createElement('div');rail.className='source-rail-list';rail.setAttribute('aria-label','Streaming and creator income platforms');
 const picker=document.createElement('div');picker.className='source-picker';picker.hidden=true;
 const heading=document.createElement('div');heading.className='source-picker-heading';
 const title=document.createElement('strong');title.textContent='Add a platform to your shortcuts';
 const close=document.createElement('button');close.type='button';close.className='btn small';close.textContent='Close';close.addEventListener('click',()=>{picker.hidden=true;plus.focus()});
 heading.append(title,close);
 const search=document.createElement('input');search.type='search';search.placeholder='Search streaming, apps, games, stores…';search.setAttribute('aria-label','Search available income platforms');
 const options=document.createElement('div');options.className='source-picker-options';picker.append(heading,search,options);
 function logo(name){const icon=document.createElement('span');icon.className='source-logo';const slug=ICONS[name];if(slug){const img=document.createElement('img');img.alt='';img.loading='lazy';img.referrerPolicy='no-referrer';img.src='https://cdn.simpleicons.org/'+slug;img.addEventListener('error',()=>{img.remove();icon.textContent=name.slice(0,2).toUpperCase()},{once:true});icon.append(img)}else icon.textContent=name.slice(0,2).toUpperCase();return icon}
 function openIncome(name){document.getElementById('addBtn')?.click();channel.value=catalog[name];channel.dispatchEvent(new Event('change'));platform.value=name;platform.dispatchEvent(new Event('change'));const title=document.getElementById('modalTitle');if(title)title.textContent='Add '+name+' income';document.getElementById('gross')?.focus()}
 function tile(name){const btn=document.createElement('button');btn.type='button';btn.className='source-shortcut';btn.setAttribute('aria-label','Record income from '+name);btn.append(logo(name));const label=document.createElement('span');label.textContent=name;btn.append(label);btn.addEventListener('click',()=>openIncome(name));return btn}
 const plus=document.createElement('button');plus.type='button';plus.className='source-shortcut source-plus';plus.setAttribute('aria-expanded','false');plus.setAttribute('aria-controls','sourcePicker');plus.setAttribute('aria-label','Add another income platform');const plusIcon=document.createElement('span');plusIcon.className='source-logo';plusIcon.textContent='+';const plusText=document.createElement('span');plusText.textContent='Add more';plus.append(plusIcon,plusText);
 picker.id='sourcePicker';
 plus.addEventListener('click',()=>{picker.hidden=!picker.hidden;plus.setAttribute('aria-expanded',String(!picker.hidden));if(!picker.hidden){search.value='';drawOptions();search.focus()}});
 function drawRail(){rail.replaceChildren(...[...DEFAULT,...saved].map(tile),plus)}
 function drawOptions(){options.replaceChildren();const query=search.value.trim().toLowerCase();for(const group of groups){const names=Object.keys(catalog).filter(name=>catalog[name]===group.key&&!DEFAULT.includes(name)&&!saved.includes(name)&&name.toLowerCase().includes(query));if(!names.length)continue;const label=document.createElement('h5');label.textContent=group.title;options.append(label);for(const name of names){const btn=document.createElement('button');btn.type='button';btn.className='source-option';btn.append(logo(name),document.createTextNode(name));btn.addEventListener('click',()=>{saved.push(name);try{localStorage.setItem(STORAGE,JSON.stringify(saved))}catch{}drawRail();drawOptions();picker.hidden=true;plus.setAttribute('aria-expanded','false')});options.append(btn)}}if(!options.children.length)options.textContent='No matching platforms found.'}
 search.addEventListener('input',drawOptions);drawRail();section.append(rail,picker);home.append(section);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();