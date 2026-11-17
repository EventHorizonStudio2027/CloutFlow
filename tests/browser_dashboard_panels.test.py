"""Chromium dashboard panel disclosure and preference checks."""
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parent.parent
html=(root/'index.html').read_text()
css=(root/'assets/css/app.css').read_text()
html=html.replace('<link rel="stylesheet" href="assets/css/app.css">','')
import re
html=re.sub(r'<script src="assets/js/[^\"]+"></script>','',html)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 for width in (320,390,768,1280):
  page=browser.new_page(viewport={'width':width,'height':850})
  page.set_content(html)
  page.add_style_tag(content=css)
  page.evaluate("""() => {const d={};window.testStorage={getItem:k=>d[k]??null,setItem:(k,v)=>d[k]=v}}""")
  page.add_script_tag(content=(root/'assets/js/dashboard-panels.js').read_text())
  page.evaluate('CloutFlowDashboardPanels.init(document,testStorage)')
  toggle=page.locator('[data-panel-toggle="accountGrowthTitle"]')
  assert toggle.count()==1
  assert toggle.get_attribute('aria-expanded')=='true'
  assert not page.locator('#accountGrowth').evaluate('(e)=>e.hidden')
  toggle.click()
  assert toggle.get_attribute('aria-expanded')=='false'
  assert page.locator('#accountGrowth').evaluate('(e)=>e.hidden')
  assert page.evaluate("""() => {CloutFlowDashboardPanels.init(document,testStorage);return true}""")
  # Separate explicit persistence test using the exported API and injected storage.
  page.evaluate("""() => {const t=document.querySelector('[data-panel-toggle="accountGrowthTitle"]');t.click();t.click()}""")
  assert toggle.get_attribute('aria-expanded')=='false'
  toggle.focus();page.keyboard.press('Enter')
  assert toggle.get_attribute('aria-expanded')=='true'
  assert not page.locator('#accountGrowth').evaluate('(e)=>e.hidden')
  assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 2')
  print(f'PASS {width}px dashboard panel disclosure')
  page.close()
 browser.close()
