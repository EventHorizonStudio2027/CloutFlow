/* Supabase authentication only. Financial records remain local until verified migration. */
(function(root){'use strict';
const url='https://vyzhrewegiptlhlrbitg.supabase.co';
const key='sb_publishable_IqREMoHvHJ-gWbcyfk3x4Q_yHJOOAn0';
const api={async request(path,payload,token){
 const res=await fetch(url+'/auth/v1/'+path,{method:'POST',headers:{apikey:key,'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(payload||{})});
 const data=await res.json().catch(()=>({}));
 if(!res.ok)throw new Error(data.msg||data.error_description||data.message||'Authentication failed');
 return data;
},signIn(email,password){return this.request('token?grant_type=password',{email,password})},
signUp(email,password){return this.request('signup',{email,password})},
signOut(token){return this.request('logout',{},token)}};
root.CloutFlowAuth=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
