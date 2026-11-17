/* Personalized, informational revenue ideas. Never writes financial records. */
(function(root){
'use strict';
const RULES=[
{id:'multistream',title:'Explore multistreaming',group:'live',tags:['stream'],platforms:['Twitch','Kick','YouTube','TikTok','Facebook','Other streaming / social'],keywords:[],why:'You record income from live or social content.',action:'Compare whether broadcasting to a second platform could help you reach a different audience. Test one additional destination and measure results.',caution:'Check each platform’s current simulcasting, exclusivity, and content rules before broadcasting.'},
{id:'clips',title:'Turn streams into short-form clips',group:'live',tags:['stream'],platforms:['Twitch','Kick','YouTube','TikTok','Facebook','Other streaming / social'],keywords:[],why:'You have a streaming or social creator account.',action:'Repurpose highlights into short videos and link viewers back to your primary content. Track any resulting income separately.',caution:'Clip monetization and reused-content eligibility vary by platform.'},
{id:'sponsors',title:'Pitch relevant brand sponsorships',group:'partners',tags:['stream'],platforms:['Twitch','Kick','YouTube','TikTok','Instagram','Facebook','X','Other streaming / social'],keywords:['sponsorship','brand deal'],why:'Your creator activity may appeal to brands in your niche.',action:'Create a one-page media kit with audience and engagement figures, then contact brands that fit your content.',caution:'Disclose paid endorsements and confirm each platform’s branded-content requirements.'},
{id:'affiliate',title:'Test affiliate recommendations',group:'partners',tags:['stream','commerce'],platforms:['Twitch','Kick','YouTube','TikTok','Instagram','Facebook','X','Shopify','Etsy','Other streaming / social'],keywords:['affiliate'],why:'Your audience may ask about products or tools you use.',action:'Recommend only relevant products you genuinely know, use trackable links, and measure commissions.',caution:'Affiliate programs have eligibility rules; clearly disclose affiliate relationships.'},
{id:'memberships',title:'Offer supporter memberships',group:'community',tags:['stream'],platforms:['Twitch','Kick','YouTube','TikTok','Instagram','Facebook','Discord','Substack','Other streaming / social'],keywords:['membership','subscription','patreon'],why:'You create recurring content that fans might want to support.',action:'Pilot one simple recurring benefit, such as exclusive Q&A or early access, before adding more tiers.',caution:'Platform fees, eligibility, and benefits differ; avoid promising access you cannot sustain.'},
{id:'digital',title:'Sell a useful digital product',group:'products',tags:['stream','commerce'],platforms:['YouTube','TikTok','Instagram','Twitch','Kick','Shopify','Etsy','Fourthwall','Ko-fi','Other streaming / social'],keywords:['digital product','download','template'],why:'Your content or storefront could support an original downloadable resource.',action:'Ask your audience which guide, template, preset, or resource would solve a real problem. Validate demand before building.',caution:'Only sell content you own or have permission to license; check marketplace rules.'},
{id:'merch',title:'Test print-on-demand merchandise',group:'products',tags:['stream'],platforms:['YouTube','Twitch','Kick','TikTok','Instagram','Other streaming / social'],keywords:['merch'],why:'A recognizable creator community can sometimes support merchandise.',action:'Validate one design with a small preorder or print-on-demand trial before buying inventory.',caution:'Factor in production costs, returns, taxes, and trademark permissions.'},
{id:'app-sub',title:'Evaluate a premium subscription',group:'products',tags:['app'],platforms:[],keywords:['subscription'],why:'You record mobile-app revenue.',action:'Identify a recurring benefit users would pay for, then compare subscription retention against a one-time purchase.',caution:'Review app-store billing policies and avoid adding subscriptions without ongoing value.'},
{id:'app-iap',title:'Explore optional in-app purchases',group:'products',tags:['app'],platforms:[],keywords:['in-app purchase'],why:'You monetize a mobile app.',action:'Test a clearly priced optional feature or upgrade with existing users before committing development time.',caution:'Follow store billing and consumer-protection requirements.'},
{id:'store-bundle',title:'Bundle complementary products',group:'products',tags:['commerce'],platforms:[],keywords:['bundle'],why:'You have commerce or storefront activity.',action:'Pair related products into a useful bundle and compare margin and conversion with individual listings.',caution:'Track fees, fulfillment costs, and refunds; a higher order value does not guarantee higher profit.'},
{id:'store-email',title:'Build an owned customer newsletter',group:'community',tags:['commerce'],platforms:[],keywords:[],why:'You have customers or a storefront.',action:'Offer an opt-in newsletter with product updates and useful content to encourage repeat purchases.',caution:'Use consent-based signup and follow applicable email marketing laws.'}
];
const GROUPS={all:'All ideas',live:'Audience growth',partners:'Brand & affiliate',community:'Community',products:'Products'};
function profile(entries=[],accounts=[]){
 const platforms=new Set(),channels=new Set(),types=new Set();
 for(const e of [...entries,...accounts]){
  if(e.platform)platforms.add(String(e.platform).toLowerCase());
  if(e.channel)channels.add(String(e.channel).toLowerCase());
  if(e.type)types.add(String(e.type).toLowerCase());
  if(e.incomeType)types.add(String(e.incomeType).toLowerCase());
  if(e.stream)types.add(String(e.stream).toLowerCase());
  if(e.category)types.add(String(e.category).toLowerCase());
 }
 return {platforms,channels,types,hasActivity:entries.length>0||accounts.length>0};
}
function suggest(entries=[],accounts=[],group='all'){
 const p=profile(entries,accounts);if(!p.hasActivity)return [];
 return RULES.filter(r=>group==='all'||r.group===group).map(r=>{
  const matching=r.platforms.filter(x=>p.platforms.has(x.toLowerCase()));
  const channel=r.tags.some(x=>p.channels.has(x));
  if(!matching.length&&!channel)return null;
  const already=r.keywords.length>0&&r.keywords.some(k=>[...p.types].some(t=>t.includes(k)));
  const score=matching.length*3+(channel?2:0)+(already?-5:0);
  return {...r,already,score,matchedPlatforms:matching};
 }).filter(Boolean).sort((a,b)=>b.score-a.score||a.title.localeCompare(b.title));
}
const api={suggest,profile,groups:GROUPS};root.CloutFlowIncomeOpportunities=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
