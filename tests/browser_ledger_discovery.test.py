"""CloutFlow ledger search, sort and reset behavior at multiple viewports."""
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parent.parent
html=(root/'index.html').read_text()
import re
names=re.findall(r'<script src="assets/js/([^"]+)"></script>',html)
html=re.sub(r'<script src="assets/js/[^"]+"></script>','',html)
html=html.replace('<link rel="stylesheet" href="assets/css/app.css">','')
css=(root/'assets/css/app.css').read_text()
scripts=[(root/'assets/js'/name).read_text() for name in names]
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    for width in (320,390,768,1280):
        page=browser.new_page(viewport={'width':width,'height':850})
        errors=[]
        page.on('pageerror',lambda error:errors.append(str(error)))
        page.set_content(html)
        page.add_style_tag(content=css)
        page.evaluate("""() => {const d={};Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>d[k]??null,setItem:(k,v)=>d[k]=String(v),removeItem:k=>delete d[k]}})}""")
        for script in scripts:page.add_script_tag(content=script)
        page.locator('#search').fill('unfindable-example')
        assert page.locator('#entries tr').count()==0
        assert 'No transactions match' in page.locator('#empty').inner_text() or 'No income entries' in page.locator('#empty').inner_text()
        assert page.locator('#clearSearch').is_visible(), {'width':width,'errors':errors,'search':page.locator('#search').input_value(),'clearHidden':page.locator('#clearSearch').get_attribute('hidden')}
        page.locator('#clearSearch').click()
        assert page.locator('#search').input_value()==''
        page.locator('#ledgerSort').select_option('oldest')
        assert page.locator('#resetLedgerFilters').is_enabled()
        page.locator('#resetLedgerFilters').click()
        assert page.locator('#ledgerSort').input_value()=='newest'
        page.keyboard.press('Control+k')
        assert page.locator('#globalSearchDialog').is_visible()
        assert page.evaluate('document.activeElement.id')=='globalSearchInput'
        page.locator('#globalSearchInput').fill('ledger')
        page.keyboard.press('Escape')
        assert page.locator('#globalSearchDialog').is_hidden()
        assert page.locator('#search').input_value()==''
        page.locator('#search').fill('test')
        page.locator('#search').press('Escape')
        assert page.locator('#search').input_value()==''
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')
        assert not errors,errors
        print(f'PASS {width}px ledger discovery: search, reset, shortcut, no overflow')
        page.close()
    browser.close()
