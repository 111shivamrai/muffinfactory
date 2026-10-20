import json
import re

html_path = '/Users/shivamrai/.gemini/antigravity/scratch/claude_share_resolved.html'

with open(html_path, 'r', encoding='utf-8') as f:
    content = f.read()

print(f"File length: {len(content)} characters.")

# Let's search for script tags and dump their lengths and first 100 chars
from bs4 import BeautifulSoup
soup = BeautifulSoup(content, 'html.parser')

print("\n--- Script Tags ---")
for idx, s in enumerate(soup.find_all('script')):
    s_text = s.get_text()
    print(f"Script {idx}: length={len(s_text)}")
    if len(s_text) > 1000:
        print(s_text[:200] + "...")
        # Save script content
        with open(f'/Users/shivamrai/.gemini/antigravity/scratch/script_{idx}.js', 'w') as sf:
            sf.write(s_text)

# Let's search for any divs that might contain the conversation or code blocks
print("\n--- Code Containers ---")
for idx, div in enumerate(soup.find_all('div')):
    div_class = div.get('class', [])
    div_text = div.get_text()
    if any('code' in c.lower() for c in div_class) or any('pre' in c.lower() for c in div_class):
        print(f"Div {idx}: class={div_class}, length={len(div_text)}")
        if len(div_text) > 200:
            print(div_text[:200] + "...")
            with open(f'/Users/shivamrai/.gemini/antigravity/scratch/div_{idx}.txt', 'w') as df:
                df.write(div_text)

# Let's search for some css keywords in the text
matches = list(re.finditer(r'CSS|styles|@media|\.flex', content, re.IGNORECASE))
print(f"\nFound {len(matches)} occurrences of CSS keywords.")
for m in matches[:10]:
    start = max(0, m.start() - 100)
    end = min(len(content), m.end() + 100)
    print(f"Match at {m.start()}: {content[start:end]}")

