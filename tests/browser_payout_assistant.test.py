"""Chromium interaction checks for CloutFlow's payout allocation assistant."""
from pathlib import Path
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parent.parent
script = (root / 'assets/js/payout-assistant.js').read_text()

html = '''<!doctype html><html><body>
<select id="payoutCurrency"><option>USD</option><option>EUR</option></select>
<input id="payoutAmount" type="number" value="100" />
<div id="payoutAllocations">
<input data-allocation="older" type="number" max="70" value="0" />
<input data-allocation="newer" type="number" max="90" value="0" />
</div>
<div id="payoutBalance" role="status"></div>
<button id="autoAllocatePayout" type="button">Fill available earnings</button>
</body></html>'''

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])
    for width in (320, 390, 768, 1280):
        page = browser.new_page(viewport={'width': width, 'height': 800})
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.set_content(html)
        page.add_script_tag(content=script)
        balance = page.locator('#payoutBalance')
        button = page.locator('#autoAllocatePayout')
        assert '$100.00 remains unallocated' in balance.inner_text()
        button.click()
        assert page.locator('[data-allocation="older"]').input_value() == '70.00'
        assert page.locator('[data-allocation="newer"]').input_value() == '30.00'
        assert '$0.00 remains unallocated' in balance.inner_text()
        # Manual editing must recalculate and flag over-allocation without saving.
        page.locator('[data-allocation="newer"]').fill('90')
        assert 'Over-allocated by $60.00' in balance.inner_text()
        assert 'payout-overallocated' in balance.get_attribute('class')
        page.locator('#payoutAmount').fill('')
        assert button.is_disabled()
        assert 'Enter a positive deposit amount' in balance.inner_text()
        page.locator('#payoutAmount').fill('40')
        button.click()
        assert page.locator('[data-allocation="older"]').input_value() == '40.00'
        assert page.locator('[data-allocation="newer"]').input_value() == '0'
        page.locator('#payoutCurrency').select_option('EUR')
        assert '€0.00 remains unallocated' in balance.inner_text()
        # Dynamically replaced earnings must refresh button availability.
        page.locator('#payoutAllocations').evaluate('(el) => el.replaceChildren()')
        page.wait_for_function('document.querySelector("#autoAllocatePayout").disabled')
        assert not errors, errors
        print(f'PASS {width}px payout assistance, allocation warnings, currency, dynamic rows')
        page.close()
    browser.close()
