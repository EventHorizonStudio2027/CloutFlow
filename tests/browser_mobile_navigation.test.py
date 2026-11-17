"""Exercise CloutFlow's mobile dock and secondary action tray in Chromium."""
from pathlib import Path
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parent.parent
html = (root / 'index.html').read_text()
import re
names = re.findall(r'<script src="assets/js/([^"]+)"></script>', html)
html = re.sub(r'<script src="assets/js/[^"]+"></script>', '', html)
html = html.replace('<link rel="stylesheet" href="assets/css/app.css">', '')
css = (root / 'assets/css/app.css').read_text()
scripts = [(root / 'assets/js' / name).read_text() for name in names]
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])
    for width in (320, 390, 768, 1280):
        page = browser.new_page(viewport={'width':width, 'height':850}, accept_downloads=True)
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.set_content(html)
        page.add_style_tag(content=css)
        page.evaluate("""() => {const d={};Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>d[k]??null,setItem:(k,v)=>d[k]=String(v),removeItem:k=>delete d[k]}})}""")
        for script in scripts: page.add_script_tag(content=script)
        nav = page.locator('.mobile-nav')
        if width <= 800:
            assert nav.is_visible()
            assert page.locator('.mobile-nav button').count() == 5
            page.locator('#mobileMore').click()
            assert page.locator('#mobileMoreMenu').is_visible()
            assert page.locator('#mobileMore').get_attribute('aria-expanded') == 'true'
            assert page.evaluate('document.activeElement.id') == 'mobileExport'
            page.keyboard.press('Escape')
            assert page.locator('#mobileMoreMenu').is_hidden()
            assert page.evaluate('document.activeElement.id') == 'mobileMore'
            page.locator('#mobileMore').click()
            page.locator('#mobileActivity').click()
            assert page.locator('#mobileMoreMenu').is_hidden()
            page.locator('#mobileAdd').click()
            assert page.locator('#modal').evaluate("e=>e.classList.contains('show')")
            page.locator('#cancel').click()
            page.locator('#mobileImport').click()
            assert page.locator('#importOptionsModal').evaluate("e=>e.classList.contains('show')")
            page.locator('#cancelImportOptions').click()
            page.locator('#mobileMore').click()
            with page.expect_download() as dl: page.locator('#mobileExport').click()
            assert dl.value.suggested_filename.startswith('cloutflow-')
            assert page.locator('#mobileMoreMenu').is_hidden()
            assert page.evaluate('document.activeElement.id') == 'mobileMore'
            page.locator('#mobileMore').click()
            page.locator('.top').click(position={'x': 4, 'y': 4}, force=True)
            assert page.locator('#mobileMoreMenu').is_hidden()
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')
        else:
            assert nav.is_hidden()
            assert page.locator('#mobileMoreMenu').is_hidden()
        assert not errors, errors
        print(f'PASS {width}px mobile navigation: visibility, focus, actions, CSV, overflow')
        page.close()
    browser.close()
