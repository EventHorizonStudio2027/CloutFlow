"""Workspace navigation hides unrelated content while preserving every major destination."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import re
root=Path(__file__).resolve().parent.parent
html=(root/'index.html').read_text()
html=html.replace('<link rel="stylesheet" href="assets/css/app.css">','')
html=re.sub(r'<script src="assets/js/[^"]+"></script>','',html)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 for width in (320,390,768,1280):
  page=browser.new_page(viewport={'width':width,'height':850})
  page.set_content(html)
  page.add_style_tag(content=(root/'assets/css/app.css').read_text())
  page.add_script_tag(content=(root/'assets/js/quick-access.js').read_text())
  assert page.locator('#overviewStats').is_visible()
  assert page.locator('#revenueChartsSection').is_visible()
  assert not page.locator('#ledgerSection').is_visible()
  targets=page.eval_on_selector_all('[data-quick-target]','nodes=>nodes.map(n=>n.dataset.quickTarget)')
  for target in targets:
   assert page.evaluate('(id)=>window.CloutFlowOpenWorkspace(id,false)',target)
   assert page.locator('#'+target).is_visible(),target
   if target!='mainContent':
    assert not page.locator('#overviewStats').is_visible(),target
    assert not page.locator('#revenueChartsSection').is_visible() or target=='revenueChartsSection'
   assert page.locator('[data-quick-target="'+target+'"]').get_attribute('aria-current')=='page'
  page.evaluate('window.CloutFlowOpenWorkspace("mainContent",false)')
  assert page.locator('#overviewStats').is_visible()
  assert page.locator('#paymentDashboard').is_visible()
  assert not page.locator('#adjustmentsSection').is_visible()
  assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 2')
  print(f'PASS {width}px workspace routing')
  page.close()
 browser.close()
