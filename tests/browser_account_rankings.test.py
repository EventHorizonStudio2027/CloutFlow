"""Chromium account rankings checks."""
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
    {id:'e1',platform:'YouTube',account:'Main',currency:'USD',gross:150,fees:20,refunds:0,tax:0,earnedDate:'2026-10-04',status:'Pending',description:'Video'},
    {id:'e2',platform:'Twitch',account:'Main',currency:'USD',gross:90,fees:0,refunds:0,tax:0,earnedDate:'2026-10-04',status:'Pending',description:'Stream'},
    {id:'e3',platform:'YouTube',account:'Main',currency:'EUR',gross:300,fees:0,refunds:0,tax:0,earnedDate:'2026-10-04',status:'Pending',description:'Euro'}];
   adjustments=[{id:'a1',platform:'YouTube',account:'Main',currency:'USD',amount:-70,date:'2026-10-12',type:'Refund'},
                {id:'a2',platform:'TikTok',account:'Main',currency:'USD',amount:-10,date:'2026-10-12',type:'Refund'}];
   selectedPeriod='all';render();
  }""")
  ranking=page.locator('#accountRankings')
  assert ranking.locator('.ranking-currency').count()==2
  usd=ranking.locator('.ranking-currency').filter(has=page.locator('h4',has_text='USD'))
  assert 'Twitch' in usd.locator('.ranking-row').nth(0).inner_text()
  assert 'YouTube' in usd.locator('.ranking-row').nth(1).inner_text()
  assert 'TikTok' in usd.locator('.ranking-row').nth(2).inner_text()
  assert '$60.00' in usd.inner_text() and '$90.00' in usd.inner_text()
  assert 'Leading account' in usd.inner_text()
  assert usd.locator('.ranking-track').count()==3
  eur=ranking.locator('.ranking-currency').filter(has=page.locator('h4',has_text='EUR'))
  assert '€300.00' in eur.inner_text()
  page.evaluate("""() => {entries[0].account='<img src=x onerror=alert(1)>';render()}""")
  assert ranking.locator('img').count()==0
  assert not errors,errors
  page.evaluate("() => {entries[0].account='Main';render()}")
  assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')
  print(f'PASS {width}px account rankings, adjustments, currency separation, escaping')
  page.close()
 browser.close()
