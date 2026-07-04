const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  
  // Set User-Agent
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36');

  // Set viewport to a laptop size
  await page.setViewport({ width: 1280, height: 800 });

  console.log('Navigating to Claude share link...');
  try {
    await page.goto('https://claude.ai/share/86f1475c-4abb-4a2b-9c80-d9bc9112562a', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    console.log('Waiting for body to load...');
    await page.waitForSelector('body', { timeout: 10000 });
    await new Promise(resolve => setTimeout(resolve, 3000));

    // First click status expanders
    const statusButtons = await page.$$('button');
    for (const btn of statusButtons) {
      const text = await page.evaluate(el => el.innerText, btn);
      if (text.includes('Comprehensive') || text.includes('Created a file') || text.includes('Searched the web')) {
        console.log(`Clicking expander: "${text.trim().replace(/\n/g, ' ')}"`);
        await btn.click().catch(() => {});
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    }

    // Wait for DOM to update
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Now find buttons containing the artifact filenames
    const allButtons = await page.$$('button');
    console.log(`Found ${allButtons.length} total buttons after expanding.`);

    let cssBtn = null;
    let guideBtn = null;

    for (const btn of allButtons) {
      const text = await page.evaluate(el => el.innerText, btn);
      if (text.includes('muffin-factory-responsive.css')) {
        cssBtn = btn;
        console.log('Found CSS artifact button!');
      }
      if (text.includes('installation-guide.html')) {
        guideBtn = btn;
        console.log('Found Guide artifact button!');
      }
    }

    if (cssBtn) {
      console.log('Clicking CSS button to open artifact...');
      await cssBtn.click();
      await new Promise(resolve => setTimeout(resolve, 5000)); // wait for artifact to load

      // Scrape the code
      const cssContent = await page.evaluate(() => {
        // Try finding code in code/pre or the editor
        const codeElement = document.querySelector('.monaco-editor, pre code, pre, [role="code"]');
        if (codeElement) return codeElement.innerText;
        
        // Fallback: look for text inside pre elements in the whole page
        const pres = Array.from(document.querySelectorAll('pre'));
        if (pres.length > 0) {
          // find the largest pre
          pres.sort((a, b) => b.innerText.length - a.innerText.length);
          return pres[0].innerText;
        }
        return null;
      });

      if (cssContent) {
        fs.writeFileSync('/Users/shivamrai/.gemini/antigravity/scratch/muffin-factory-responsive.css', cssContent, 'utf8');
        console.log('Successfully saved CSS to /Users/shivamrai/.gemini/antigravity/scratch/muffin-factory-responsive.css');
        console.log(`CSS length: ${cssContent.length}`);
      } else {
        console.log('Failed to extract CSS content from DOM.');
        // Save screenshot for debugging
        await page.screenshot({ path: '/Users/shivamrai/.gemini/antigravity/scratch/css_click_error.png' });
        console.log('Saved error screenshot.');
      }
    }

    if (guideBtn) {
      console.log('Clicking Guide button to open artifact...');
      await guideBtn.click();
      await new Promise(resolve => setTimeout(resolve, 5000)); // wait for artifact to load

      // Scrape the guide
      const guideContent = await page.evaluate(() => {
        const codeElement = document.querySelector('.monaco-editor, pre code, pre, [role="code"]');
        if (codeElement) return codeElement.innerText;
        
        const pres = Array.from(document.querySelectorAll('pre'));
        if (pres.length > 0) {
          pres.sort((a, b) => b.innerText.length - a.innerText.length);
          return pres[0].innerText;
        }
        return null;
      });

      if (guideContent) {
        fs.writeFileSync('/Users/shivamrai/.gemini/antigravity/scratch/installation-guide.html', guideContent, 'utf8');
        console.log('Successfully saved Guide to /Users/shivamrai/.gemini/antigravity/scratch/installation-guide.html');
        console.log(`Guide length: ${guideContent.length}`);
      } else {
        console.log('Failed to extract Guide content.');
        await page.screenshot({ path: '/Users/shivamrai/.gemini/antigravity/scratch/guide_click_error.png' });
      }
    }

    // Dump all text on the page for debugging
    const fullText = await page.evaluate(() => document.body.innerText);
    fs.writeFileSync('/Users/shivamrai/.gemini/antigravity/scratch/final_page_text.txt', fullText, 'utf8');

  } catch (err) {
    console.error('Error during scraping:', err);
  }

  await browser.close();
})();
