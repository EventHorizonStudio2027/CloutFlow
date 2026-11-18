/* Optional offline shell; no user financial data is sent to a server. */
(function(root){if(!root.navigator?.serviceWorker||!/^https?:$/.test(root.location?.protocol||''))return;root.addEventListener('load',()=>root.navigator.serviceWorker.register('./service-worker.js').catch(()=>{}));})(typeof window!=='undefined'?window:globalThis);
