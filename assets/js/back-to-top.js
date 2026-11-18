'use strict';
(function(root){
 const doc=root.document;if(!doc)return;
 function init(){
  const button=doc.getElementById('backToTop');if(!button)return;
  let scheduled=false;
  function update(){scheduled=false;button.hidden=(root.scrollY||doc.documentElement.scrollTop||0)<480;}
  function onScroll(){
   if(scheduled)return;scheduled=true;
   if(typeof root.requestAnimationFrame==='function')root.requestAnimationFrame(update);
   else update();
  }
  button.addEventListener('click',function(){
   const reduce=!!(root.matchMedia&&root.matchMedia('(prefers-reduced-motion: reduce)').matches);
   if(typeof root.scrollTo==='function')root.scrollTo({top:0,behavior:reduce?'instant':'smooth'});
   else doc.documentElement.scrollTop=0;
  });
  root.addEventListener('scroll',onScroll,{passive:true});
  update();
 }
 if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',init);
 else init();
})(typeof window!=='undefined'?window:globalThis);
