"""Check currency cards and isolation in actual Chromium layouts."""
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parent.parent
html=(root/'index.html').read_text()
for tag in ('<link rel="stylesheet" href="assets/css/app.css">',*(f'<script src="assets/js/{n}"></script>' for n in ('platform-rankings.js','account-rankings.js','account-growth.js','period-comparison.js','revenue-trends.js','currency-overview.js','account-insights.js','ledger-tools.js','app.js','accessibility.js','mobile-navigation.js'))):
    html=html.replace(tag,'')
css=(root/'assets/css/app.css').read_text()
scripts=[(root/'assets/js'/n).read_text() for n in ('platform-rankings.js','account-rankings.js','account-growth.js','period-comparison.js','revenue-trends.js','currency-overview.js','account-insights.js','ledger-tools.js','app.js','accessibility.js','mobile-navigation.js')]
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    for width in (320,390,768,1280):
        page=browser.new_page(viewport={'width':width,'height':850})
        errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.set_content(html)
        page.add_style_tag(content=css)
        page.evaluate("""() => {const d={};Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>d[k]??null,setItem:(k,v)=>d[k]=String(v),removeItem:k=>delete d[k]}})}""")
        for script in scripts:page.add_script_tag(content=script)
        assert page.locator('#currencyOverviewTitle').inner_text()=='Earnings by currency'
        assert 'No earnings' in page.locator('#currencyOverview').inner_text()
        summary=page.evaluate("""() => CurrencyOverview.summarize([{currency:'EUR',gross:20},{currency:'USD',gross:50}], [{currency:'EUR',amount:-3}], [{currency:'EUR',amount:8}],e=>e.gross)""")
        assert [(g['currency'],g['adjustedNet'],g['deposits']) for g in summary]==[('EUR',17,8),('USD',50,0)]
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')
        assert not errors,errors
        print(f'PASS {width}px currency overview and isolation')
        page.close()
    browser.close()
