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
signOut(token){return this.request('logout',{},token)},
async currentUser(token){const response=await fetch(url+'/auth/v1/user',{headers:{apikey:key,Authorization:'Bearer '+token}});if(!response.ok)throw Error('Session expired. Sign in again.');return response.json()},
async firstBackup(token,userId,snapshot){const response=await fetch(url+'/rest/v1/cf_workspace_backups?select=user_id,revision,updated_at',{method:'POST',headers:{apikey:key,Authorization:'Bearer '+token,'Content-Type':'application/json',Prefer:'return=representation'},body:JSON.stringify({user_id:userId,snapshot})});const data=await response.json().catch(()=>null);if(response.status===409)throw Error('A cloud copy already exists. Nothing was overwritten.');if(!response.ok)throw Error(data?.message||'Cloud backup failed');if(!Array.isArray(data)||data.length!==1||data[0].user_id!==userId)throw Error('Could not verify cloud backup receipt');return data[0]},
async readBackup(token,userId){const response=await fetch(url+'/rest/v1/cf_workspace_backups?select=snapshot,revision&user_id=eq.'+encodeURIComponent(userId),{headers:{apikey:key,Authorization:'Bearer '+token}});if(!response.ok)throw Error('Could not verify saved cloud copy');const data=await response.json();return Array.isArray(data)?data[0]||null:null}};
root.CloutFlowAuth=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
