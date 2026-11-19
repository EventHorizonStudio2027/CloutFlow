"""Full Chromium audit-panel and export integration checks."""
from pathlib import Path
import re
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parent.parent
html=(root/'index.html').read_text()
names=re.findall(r'<script src="assets/js/([^"]+)"></script>',html)
html=re.sub(r'<script src="assets/js/[^"]+"></script>','',html).replace('<link rel="stylesheet" href="assets/css/app.css">','')
css=(root/'assets/css/app.css').read_text()
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 for width in (320,390,1280):
  page=browser.new_page(viewport={'width':width,'height':850},accept_downloads=True)
  errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.set_content(html);page.add_style_tag(content=css)
  page.evaluate("""() => {const d={};Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>d[k]??null,setItem:(k,v)=>d[k]=String(v),removeItem:k=>delete d[k]}})}""")
  for name in names:page.add_script_tag(content=(root/'assets/js'/name).read_text())
  page.evaluate("""() => {
   selectedPeriod='all';entries=[];accounts=[];adjustments=[];
   payouts=[{id:'p1',platform:'YouTube',account:'Main',currency:'USD',amount:100,received:'2026-11-10',reference:'Ref-1',notes:'',allocations:[]},
            {id:'p2',platform:'YouTube',account:'Main',currency:'USD',amount:100,received:'2026-11-11',reference:'ref-1',notes:'',allocations:[]}];
   render();
  }""")
  assert '1 payout audit finding' in page.locator('[data-audit-title]').inner_text()
  assert 'Repeated deposit reference' in page.locator('[data-audit-list]').inner_text()
  with page.expect_download() as pending:
   page.locator('#exportPayoutAudit').click()
  download=pending.value
  assert download.suggested_filename=='cloutflow-payout-audit.csv'
  content=Path(download.path()).read_text(encoding='utf-8-sig')
  assert 'repeated-reference' in content and 'Ref-1' in content
  assert len(page.evaluate('payouts'))==2
  page.evaluate("() => {payouts[1].reference='Unique';render()}")
  assert 'no issues detected' in page.locator('[data-audit-title]').inner_text()
  assert not errors,errors
  print(f'PASS {width}px payout audit, CSV download, non-destructive review')
  page.close()
 browser.close()
