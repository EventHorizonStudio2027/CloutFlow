"""Verify malformed duplicate-ID storage cannot be silently normalized or overwritten."""
import pathlib
from playwright.sync_api import sync_playwright
ROOT=pathlib.Path(__file__).resolve().parent.parent
HTML=(ROOT/'index.html').read_text()
CSS=(ROOT/'assets/css/app.css').read_text()
import re
HTML=re.sub(r'<script\s+src="assets/js/[^\"]+"\s*></script>','',HTML)
SCRIPTS=re.findall(r'<script\s+src="(assets/js/[^\"]+)"\s*></script>',(ROOT/'index.html').read_text())
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 for kind in ('entries','accounts','payouts','adjustments','repeated_allocations'):
  record={'entries':{'id':'x','gross':100,'earnedDate':'2026-11-01'},'accounts':{'id':'x','name':'Channel'},'payouts':{'id':'x','amount':100,'received':'2026-11-02','allocations':[]},'adjustments':{'id':'x','amount':-5,'date':'2026-11-02'}}.get(kind)
  data={'version':4,'entries':[],'accounts':[],'payouts':[],'adjustments':[]}
  if kind=='repeated_allocations':
   data['payouts']=[{'id':'p1','platform':'YouTube','currency':'USD','amount':100,'received':'2026-11-02','allocations':[{'entryId':'earning-1','amount':10},{'entryId':'earning-1','amount':10}]}]
  else:data[kind]=[record.copy(),record.copy()]
  page=browser.new_page()
  page.set_content(HTML)
  page.add_style_tag(content=CSS)
  page.evaluate('''d=>{window.__store={creatorLedgerData_v2:JSON.stringify(d)};Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>window.__store[k]??null,setItem:(k,v)=>window.__store[k]=v}})}''',data)
  for script in SCRIPTS:page.add_script_tag(content=(ROOT/script).read_text())
  assert page.evaluate('ledgerReadOnly') is True,kind
  assert ('more than once' if kind=='repeated_allocations' else 'Duplicate') in page.evaluate('integrityLoadFailure'),kind
  key='payouts' if kind=='repeated_allocations' else kind
  assert page.evaluate('JSON.parse(window.__store.creatorLedgerData_v2)')[key]==data[key],kind
  page.close()
  print('PASS duplicate '+kind+' blocks editing and preserves original storage')
 browser.close()
