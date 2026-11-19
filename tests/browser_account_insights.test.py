"""Account insights: real browser selection, currency isolation, period and empty states."""
from pathlib import Path
from playwright.sync_api import sync_playwright

root=Path(__file__).resolve().parent.parent
import re
html=(root/'index.html').read_text()
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
        page.on('pageerror',lambda err:errors.append(str(err)))
        page.set_content(html)
        page.add_style_tag(content=css)
        page.evaluate("""() => {const data={};Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>data[k]??null,setItem:(k,v)=>data[k]=String(v),removeItem:k=>delete data[k]}})}""")
        for script in scripts:page.add_script_tag(content=script)
        page.evaluate("""() => {
            const mk=(id,platform,account,currency,gross,fees)=>({id,platform,account,currency,gross,fees,refunds:0,tax:0,channel:'stream',incomeType:'Other',earnedDate:'2026-11-01',status:'Pending',description:'Sample'});
            entries=[mk('y1','YouTube','Main','USD',100,10),mk('y2','YouTube','Main','EUR',40,2),mk('t1','Twitch','Main','USD',80,5)];
            adjustments=[{id:'a1',platform:'YouTube',account:'Main',currency:'USD',amount:-12,date:'2026-11-02'}];
            payouts=[{id:'p1',platform:'YouTube',account:'Main',currency:'EUR',amount:25,received:'2026-11-03',allocations:[]}];
            accounts=[{id:'c1',platform:'Apple App Store',name:'Unused'}];
            selectedPeriod='all';render();
        }""")
        picker=page.locator('#insightAccount')
        assert picker.locator('option').count()==4
        youtube=page.evaluate("AccountInsights.key('YouTube','Main')")
        twitch=page.evaluate("AccountInsights.key('Twitch','Main')")
        picker.select_option(youtube)
        panel=page.locator('#accountInsightCards')
        assert panel.locator('.currency-tile').count()==2
        assert '€38.00' in panel.inner_text() and '€25.00' in panel.inner_text()
        assert '$78.00' in panel.inner_text() and '-$12.00' in panel.inner_text()
        assert '$75.00' not in panel.inner_text()
        picker.select_option(twitch)
        assert panel.locator('.currency-tile').count()==1
        assert '$75.00' in panel.inner_text()
        assert '€' not in panel.inner_text()
        picker.select_option(page.evaluate("AccountInsights.key('Apple App Store','Unused')"))
        assert 'No financial activity' in panel.inner_text()
        picker.select_option(youtube)
        page.evaluate("selectedPeriod='year';render()")
        assert picker.input_value()==youtube
        assert panel.locator('.currency-tile').count()==2
        page.evaluate("selectedPeriod='last';render()")
        assert picker.input_value()==youtube
        assert 'No financial activity' in panel.inner_text()
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')
        assert not errors,errors
        print(f'PASS {width}px account insights: selection, currency separation, periods, empty state')
        page.close()
    browser.close()
