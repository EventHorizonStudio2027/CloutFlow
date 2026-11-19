"""Chromium regression for universal search, keyboard focus and responsive UI."""
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
  page=browser.new_page(viewport={'width':width,'height':850})
  errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.set_content(html)
  page.add_style_tag(content=css)
  page.evaluate("""() => {const d={};Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>d[k]??null,setItem:(k,v)=>d[k]=String(v),removeItem:k=>delete d[k]}})}""")
  for name in names:page.add_script_tag(content=(root/'assets/js'/name).read_text())
  assert page.locator('#globalSearchDialog').is_hidden()
  page.keyboard.press('Control+k')
  assert page.locator('#globalSearchDialog').is_visible()
  assert page.evaluate('document.activeElement.id')=='globalSearchInput'
  page.locator('#globalSearchInput').fill('no-results-for-xyz')
  assert 'No matching items' in page.locator('#globalSearchResults').inner_text()
  page.keyboard.press('ArrowDown')
  page.keyboard.press('Escape')
  assert page.locator('#globalSearchDialog').is_hidden()
  assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')
  assert not errors,errors
  print(f'PASS {width}px universal search keyboard and empty state')
  page.close()
 browser.close()
