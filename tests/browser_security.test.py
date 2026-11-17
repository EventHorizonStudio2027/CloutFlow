"""Exercise malicious imported identifiers and HTML content in the real rendered UI."""
import pathlib,re
from playwright.sync_api import sync_playwright
root=pathlib.Path(__file__).resolve().parent.parent
html=(root/'index.html').read_text()
css=(root/'assets/css/app.css').read_text()
scripts=re.findall(r'<script src="assets/js/([^"]+)"></script>',html)
html=re.sub(r'<script src="assets/js/[^"]+"></script>','',html).replace('<link rel="stylesheet" href="assets/css/app.css">','')

with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 for width in (320,390,1280):
  page=browser.new_page(viewport={'width':width,'height':850})
  errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
  page.set_content(html);page.add_style_tag(content=css)
  page.evaluate("""() => {const data={};Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>data[k]??null,setItem:(k,v)=>data[k]=String(v),removeItem:k=>delete data[k]}})}""")
  for script in scripts:page.add_script_tag(content=(root/"assets/js"/script).read_text())
  malicious_id="bad');window.ledgerInjected=true;//"
  malicious_desc='<img src=x onerror="window.ledgerInjected=true">'
  page.evaluate("""([id,description])=>{entries=[normalize({id,channel:'stream',platform:'YouTube',account:'Main',incomeType:'Ad revenue',currency:'USD',gross:100,fees:0,refunds:0,tax:0,earnedDate:'2026-10-01',status:'Pending',description})];selectedPeriod='all';render()}""",[malicious_id,malicious_desc])
  assert page.locator('#entries tr').count()==1
  assert page.locator('#entries img').count()==0,'Untrusted description was interpreted as HTML'
  assert page.locator('#entries [onclick]').count()==0,'Inline event handlers remain in transaction rows'
  page.locator('#entries [data-income-edit]').click()
  assert page.locator('#entryId').input_value()==malicious_id
  assert page.locator('#description').input_value()==malicious_desc
  assert not page.evaluate('Boolean(window.ledgerInjected)')
  page.locator('#cancel').click()
  page.locator('#entries [data-income-copy]').click()
  assert page.evaluate('entries.length')==2,'Copy should create a second record'
  assert page.evaluate('entries[1].id')!=malicious_id
  assert not errors,errors
  print(f'PASS width={width}: hostile ID and HTML description remain inert; edit and copy work')
  page.close()
 browser.close()
