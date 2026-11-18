/* Visual income-source picker. Platform options remain sourced from the financial catalog. */
(function(){
'use strict';
const ICONS={'YouTube':'youtube','Twitch':'twitch','TikTok':'tiktok','Kick':'kick','Facebook':'facebook','Instagram':'instagram','Patreon':'patreon','X':'x','Substack':'substack','Discord':'discord','Rumble':'rumble','Snapchat':'snapchat','LinkedIn':'linkedin','Pinterest':'pinterest','Spotify':'spotify','SoundCloud':'soundcloud','Medium':'medium','OnlyFans':'onlyfans','Apple App Store':'apple','Google Play':'googleplay','Steam':'steam','Epic Games Store':'epicgames','itch.io':'itchdotio','Roblox':'roblox','Unity Asset Store':'unity','Unreal Engine Marketplace':'unrealengine','Microsoft Store':'microsoftstore','Shopify':'shopify','Fourthwall':'fourthwall','Etsy':'etsy','Ko-fi':'kofi','Buy Me a Coffee':'buymeacoffee','Amazon Associates':'amazon','Amazon KDP':'amazon','Gumroad':'gumroad','Lemon Squeezy':'lemonsqueezy','Sellfy':'sellfy','Teespring':'spring','Redbubble':'redbubble','Printful':'printful','eBay':'ebay','PayPal':'paypal','Stripe':'stripe','Streamlabs':'streamlabs','Impact':'impact','LTK':'liketoknowit','Fiverr':'fiverr','Upwork':'upwork'};
const GROUPS=[{key:'stream',title:'Streaming, social & audience',desc:'Videos, livestreams, memberships, music and podcasts'},{key:'app',title:'Apps, games & digital products',desc:'App stores, PC games, creator marketplaces and game revenue'},{key:'commerce',title:'Shops, sponsors & other income',desc:'Merchandise, donations, affiliates, client work and brand deals'}];
function init(){
 const section=document.getElementById('sourceHomeSection')||document.getElementById('platformsSection'),channel=document.getElementById('channel'),platform=document.getElementById('platform');
 if(!section||!channel||!platform||document.getElementById('sourceDirectory'))return;
 const container=document.createElement('div');container.id='sourceDirectory';container.className='source-directory';
 const heading=document.createElement('div');heading.className='source-directory-heading';
 const h=document.createElement('h4');h.textContent='Explore income sources';const p=document.createElement('p');p.textContent='Choose a source to start recording income. Logos are visual shortcuts, not connected accounts.';
 heading.append(h,p);container.append(heading);
 for(const group of GROUPS){
  channel.value=group.key;channel.dispatchEvent(new Event('change'));
  const names=Array.from(platform.options).map(o=>o.value);
  const block=document.createElement('section');block.className='source-group';
  const title=document.createElement('h5');title.textContent=group.title;
  const description=document.createElement('p');description.textContent=group.desc;
  const grid=document.createElement('div');grid.className='source-grid';
  for(const name of names){
   const button=document.createElement('button');button.type='button';button.className='source-tile';button.setAttribute('aria-label','Add income from '+name);
   const icon=document.createElement('span');icon.className='source-logo';
   const slug=ICONS[name];if(slug){
    const img=document.createElement('img');img.src='https://cdn.simpleicons.org/'+slug;img.alt='';img.loading='lazy';img.referrerPolicy='no-referrer';
    img.addEventListener('error',()=>{img.remove();icon.textContent=name.slice(0,2).toUpperCase()},{once:true});icon.append(img);
   }else icon.textContent=name.slice(0,2).toUpperCase();
   const label=document.createElement('span');label.className='source-label';label.textContent=name;
   button.append(icon,label);
   button.addEventListener('click',()=>{
    const add=document.getElementById('platformAdd');if(!add)return;
    add.click();channel.value=group.key;channel.dispatchEvent(new Event('change'));
    platform.value=name;platform.dispatchEvent(new Event('change'));
    const title=document.getElementById('modalTitle');if(title)title.textContent='Add '+name+' income';
    document.getElementById('gross')?.focus();
   });grid.append(button);
  }
  block.append(title,description,grid);container.append(block);
 }
 channel.value='stream';channel.dispatchEvent(new Event('change'));
 section.append(container);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();