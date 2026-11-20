'use strict';
const assert=require('node:assert/strict');
const integrations=require('../assets/js/integrations.js');
assert.equal(integrations.PROVIDERS.length,8);
assert.equal(new Set(integrations.PROVIDERS.map(p=>p.id)).size,8);
assert.equal(integrations.validateApiBase('https://api.example.com/','https://example.com'),'https://api.example.com');
assert.equal(integrations.validateApiBase('http://api.example.com','https://example.com'),'');
assert.equal(integrations.validateApiBase('https://user:password@api.example.com','https://example.com'),'');
assert.equal(integrations.validateApiBase('https://api.example.com/?token=secret','https://example.com'),'');
assert.equal(integrations.validateApiBase('/api','https://example.com'),'https://example.com/api');
console.log('PASS integration provider registry and secure API base validation');

const fs=require('node:fs');const html=fs.readFileSync(require.resolve('../index.html'),'utf8');assert.ok(html.includes('assets/js/integrations.js'));
