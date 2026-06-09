import os
import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

marquee_html = """
    <!-- Gas Price Marquee -->
    <div class="bg-black text-green-500 overflow-hidden py-1.5 border-b-2 border-slate-800">
      <div class="animate-marquee text-sm font-mono font-bold uppercase tracking-widest space-x-12">
        <span>? UNLEADED: <span data-bind="fuel.regular">--</span></span>
        <span>? PREMIUM: <span data-bind="fuel.premium">--</span></span>
        <span>?? DIESEL: <span data-bind="fuel.diesel">--</span></span>
        <span>? UNLEADED: <span data-bind="fuel.regular">--</span></span>
        <span>? PREMIUM: <span data-bind="fuel.premium">--</span></span>
        <span>?? DIESEL: <span data-bind="fuel.diesel">--</span></span>
      </div>
    </div>
"""

# Insert right after </header>
content = re.sub(r'(</header>)', rf'\1{marquee_html}', content)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)
print("index.html updated with marquee")
