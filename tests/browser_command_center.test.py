from pathlib import Path
from playwright.sync_api import sync_playwright
import re
root=Path(__file__).resolve().parent.parent
html=(root/'index.html').read_text()
html=re.sub(r'<script src="assets/js/[^\"]+"></script>','',html)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 for width in (320,390,768,1280):
  page=browser.new_page(viewport={'width':width,'height':850})
  page.set_content(html)
  page.add_style_tag(content=(root/'assets/css/app.css').read_text())
  page.add_script_tag(content=(root/'assets/js/quick-access.js').read_text())
  page.add_script_tag(content=(root/'assets/js/command-center.js').read_text())
  assert page.locator('.command-card').count()==8
  page.locator('#customizeCommandCenter').click()
  page.locator('#commandCenterOptions input').first.uncheck()
  assert page.locator('.command-card').count()==7
  page.locator('#commandCenterOptions button[aria-label^="Move down"]').first.click()
  page.locator('#customizeCommandCenter').click()
  page.locator('.command-card').first.click()
  assert page.locator('#mainContent').is_hidden()
  assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 2')
  page.evaluate('window.CloutFlowOpenWorkspace("mainContent",false)')
  assert page.locator('#commandCenter').is_visible()
  page.locator('#customizeCommandCenter').click()
  page.locator('#resetCommandCenter').click()
  assert page.locator('.command-card').count()==8
  print('PASS command center',width)
  page.close()
 browser.close()
