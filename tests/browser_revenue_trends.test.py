"""Real Chromium checks for revenue chart table and CSV parity."""
from pathlib import Path
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parent.parent
html = (root/'index.html').read_text()
names = ('platform-rankings.js','account-rankings.js','account-growth.js','period-comparison.js','revenue-trends.js','currency-overview.js','account-insights.js','ledger-tools.js','app.js','accessibility.js','mobile-navigation.js')
html = html.replace('<link rel="stylesheet" href="assets/css/app.css">','')
for name in names:
    html = html.replace(f'<script src="assets/js/{name}"></script>','')
css = (root/'assets/css/app.css').read_text()
scripts = [(root/'assets/js'/name).read_text() for name in names]
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    for width in (320,390,768,1280):
        page=browser.new_page(viewport={'width':width,'height':850},accept_downloads=True)
        errors=[]
        page.on('pageerror',lambda error:errors.append(str(error)))
        page.set_content(html)
        page.add_style_tag(content=css)
        page.evaluate("""() => {const d={};Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>d[k]??null,setItem:(k,v)=>d[k]=String(v),removeItem:k=>delete d[k]}})}""")
        for script in scripts: page.add_script_tag(content=script)
        page.evaluate("""() => {
          entries=[{id:'e1',platform:'YouTube',account:'Main',currency:'USD',gross:150,fees:20,refunds:0,tax:0,earnedDate:'2026-10-04',status:'Pending',description:'October'},{id:'e2',platform:'YouTube',account:'Main',currency:'EUR',gross:999,fees:0,refunds:0,tax:0,earnedDate:'2026-10-04',status:'Pending',description:'EUR excluded'}];
          adjustments=[{id:'a1',platform:'YouTube',account:'Main',currency:'USD',amount:-150,date:'2026-10-12',type:'Refund'}];
          selectedPeriod='all';render();
        }""")
        toggle=page.locator('#toggleTrendTable')
        toggle.click()
        assert toggle.get_attribute('aria-expanded')=='true'
        rows=page.locator('#trendRows tr')
        assert rows.count()>0
        assert '−$20.00' in page.locator('#trendRows').inner_text() or '-$20.00' in page.locator('#trendRows').inner_text()
        # Verify projection refresh works even if canvas cannot draw.
        page.evaluate("""() => {document.getElementById('chart').style.display='none';entries[0].gross=200;drawChart(periodEntries().filter(e=>e.currency==='USD'));}""")
        assert '$30.00' in page.locator('#trendRows').inner_text()
        with page.expect_download() as download_info:
            page.locator('#exportTrendCsv').click()
        download=download_info.value
        assert download.suggested_filename=='cloutflow-revenue-trends.csv'
        csv=Path(download.path()).read_text()
        assert 'Adjusted net revenue (USD)' in csv and '30' in csv
        toggle.click()
        assert toggle.get_attribute('aria-expanded')=='false'
        assert not errors,errors
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')
        print(f'PASS {width}px revenue table, hidden canvas, CSV export')
        page.close()
    browser.close()
