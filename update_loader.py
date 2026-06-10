import os
import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

loader_html = """
    <!-- Full Screen Loader -->
    <div id="global-loader" class="fixed inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-center transition-opacity duration-700 ease-in-out">
      <div class="animate-pulse mb-6">
        <h1 class="text-4xl md:text-6xl font-extrabold tracking-tight animate-text-shimmer">
          4 WAY QUICK STOP
        </h1>
      </div>
      <div class="flex space-x-2">
        <div class="w-3 h-3 bg-orange-500 rounded-full animate-bounce" style="animation-delay: 0s;"></div>
        <div class="w-3 h-3 bg-orange-500 rounded-full animate-bounce" style="animation-delay: 0.2s;"></div>
        <div class="w-3 h-3 bg-orange-500 rounded-full animate-bounce" style="animation-delay: 0.4s;"></div>
      </div>
    </div>
"""

# Insert right after <body ...>
content = re.sub(r'(<body[^>]*>)', rf'\1{loader_html}', content)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)
print("index.html updated with loader")
