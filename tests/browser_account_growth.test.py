"""Chromium account growth checks."""
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parent.parent
html=(root/'index.html').read_text()
import re
names=re.findall(r'<script src="assets/js/([^"]+)"></script>',html)
html=html.replace('<link rel="stylesheet" href="assets/css/app.css">','')
html=re.sub(r'<script src="assets/js/[^"]+"></script>','',html)
css=(root/'assets/css/app.css').read_text()
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 for width in (320,390,768,1280):
  page=browser.new_page(viewport={'width':width,'height':850})
  errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.set_content(html)
  page.add_style_tag(content=css)
  page.evaluate("""() => {const d={};Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>d[k]??null,setItem:(k,v)=>d[k]=String(v),removeItem:k=>delete d[k]}})}""")
  for name in names: page.add_script_tag(content=(root/'assets/js'/name).read_text())
  page.evaluate("""() => {
   entries=[
    {id:'e1',platform:'YouTube',account:'Main',currency:'USD',gross:100,fees:0,refunds:0,tax:0,earnedDate:'2026-10-04',status:'Pending',description:'Old'},
    {id:'e2',platform:'YouTube',account:'Main',currency:'USD',gross:150,fees:0,refunds:0,tax:0,earnedDate:'2026-11-04',status:'Pending',description:'New'},
    {id:'e3',platform:'Twitch',account:'Main',currency:'EUR',gross:50,fees:0,refunds:0,tax:0,earnedDate:'2026-10-04',status:'Pending',description:'Euro'}];
   adjustments=[{id:'a1',platform:'YouTube',account:'Main',currency:'USD',amount:-20,date:'2026-11-05',type:'Refund'}];
   selectedPeriod='month';render();
  }""")
  panel=page.locator('#accountGrowth')
  assert panel.locator('.ranking-currency').count()>=1
  assert 'YouTube' in panel.inner_text()
  assert 'Twitch' in panel.inner_text()
  assert '€' in panel.inner_text()
  assert not errors,errors
  page.evaluate("() => {selectedPeriod='all';render()}")
  assert 'no matching earlier period' in panel.inner_text()
  print(f'PASS {width}px account growth, period handling, currency separation')
  page.close()
 browser.close()
