import os
from bs4 import BeautifulSoup

html_path = '/Users/shivamrai/.gemini/antigravity/scratch/claude_share_resolved.html'

with open(html_path, 'r', encoding='utf-8') as f:
    soup = BeautifulSoup(f.read(), 'html.parser')

print("=== PARSING CLAUDE SHARE PAGE ===")

# Find all code blocks, pre blocks, or artifacts
code_blocks = soup.find_all(['pre', 'code'])
print(f"Found {len(code_blocks)} code/pre elements.")

# Also let's search for elements representing Claude artifacts (often have specific classes or structures)
for idx, el in enumerate(code_blocks):
    text = el.get_text()
    print(f"\n--- Element {idx} (Length: {len(text)}) ---")
    print(text[:200] + "...")
    # Save the full text to a file so we can read it
    out_file = f'/Users/shivamrai/.gemini/antigravity/scratch/extracted_block_{idx}.txt'
    with open(out_file, 'w', encoding='utf-8') as out_f:
        out_f.write(text)
    print(f"Saved to {out_file}")

# Let's search if there are any json scripts containing data
scripts = soup.find_all('script')
for idx, s in enumerate(scripts):
    s_text = s.get_text()
    if 'muffin-factory-responsive.css' in s_text or 'installation-guide.html' in s_text:
        print(f"\n--- Found reference in script {idx} (Length: {len(s_text)}) ---")
        out_file = f'/Users/shivamrai/.gemini/antigravity/scratch/extracted_script_{idx}.txt'
        with open(out_file, 'w', encoding='utf-8') as out_f:
            out_f.write(s_text)
        print(f"Saved script text to {out_file}")

print("\n=== DONE ===")
