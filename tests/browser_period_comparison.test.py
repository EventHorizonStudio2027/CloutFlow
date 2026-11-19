"""Chromium checks for period comparisons and responsive layout."""
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
  page.evaluate("""() => {const today=new Date();const date=(m)=>{const d=new Date(today.getFullYear(),today.getMonth()+m,2);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-02'};entries=[{id:'a',platform:'YouTube',account:'Main',currency:'USD',gross:100,fees:0,refunds:0,tax:0,earnedDate:date(0),status:'Pending'},{id:'b',platform:'YouTube',account:'Main',currency:'USD',gross:50,fees:0,refunds:0,tax:0,earnedDate:date(-1),status:'Pending'}];selectedPeriod='month';render()}""")
  assert '100' in page.locator('#comparisonCards').inner_text()
  assert '50' in page.locator('#comparisonCards').inner_text()
  page.locator('#period').select_option('all')
  assert 'no equivalent earlier period' in page.locator('#comparisonCaption').inner_text()
  assert not errors,errors
  assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')
  print(f'PASS {width}px period comparisons and all-time fallback')
  page.close()
 browser.close()
