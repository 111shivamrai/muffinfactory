const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--window-size=1280,800'
    ]
  });
  const page = await browser.newPage();
  
  // Set realistic user agent and headers
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'en-US,en;q=0.9'
  });

  console.log('Navigating to Claude share link...');
  try {
    await page.goto('https://claude.ai/share/86f1475c-4abb-4a2b-9c80-d9bc9112562a', {
      waitUntil: 'networkidle2',
      timeout: 45000
    });

    console.log('Checking for Cloudflare...');
    const bodyText = await page.evaluate(() => document.body.innerText);
    if (bodyText.includes('security verification') || bodyText.includes('Performing security verification')) {
      console.log('Cloudflare challenge detected. Waiting 15 seconds for it to resolve...');
      await new Promise(resolve => setTimeout(resolve, 15000));
      
      const newBodyText = await page.evaluate(() => document.body.innerText);
      if (newBodyText.includes('security verification')) {
        console.log('Still blocked by Cloudflare. Taking screenshot and exiting...');
        await page.screenshot({ path: '/Users/shivamrai/.gemini/antigravity/scratch/cloudflare_block.png' });
        await browser.close();
        return;
      }
      console.log('Cloudflare resolved!');
    }

    console.log('Waiting for body content to settle...');
    await page.waitForSelector('body', { timeout: 10000 });
    await new Promise(resolve => setTimeout(resolve, 4000));

    // 1. Expand tool call blocks
    console.log('Finding status expanders...');
    const statusButtons = await page.$$('button');
    console.log(`Found ${statusButtons.length} buttons on page load.`);
    
    let expandCount = 0;
    for (const btn of statusButtons) {
      const text = await page.evaluate(el => el.innerText, btn);
      if (text.includes('Comprehensive') || text.includes('Created a file') || text.includes('Searched the web')) {
        console.log(`Clicking expander: "${text.trim().replace(/\n/g, ' ')}"`);
        await btn.click().catch(() => {});
        expandCount++;
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    console.log(`Expanded ${expandCount} status buttons.`);

    // Wait for file buttons to be in DOM
    await new Promise(resolve => setTimeout(resolve, 4000));

    // 2. Click the CSS file button
    console.log('Looking for file buttons...');
    const buttonsAfterExpand = await page.$$('button');
    console.log(`Found ${buttonsAfterExpand.length} total buttons after expanding.`);
    
    let cssBtn = null;
    let guideBtn = null;
    for (const btn of buttonsAfterExpand) {
      const text = await page.evaluate(el => el.innerText, btn);
      if (text.includes('muffin-factory-responsive.css')) {
        cssBtn = btn;
      }
      if (text.includes('installation-guide.html')) {
        guideBtn = btn;
      }
    }

    if (cssBtn) {
      console.log('Clicking muffin-factory-responsive.css card...');
      await cssBtn.click();
      console.log('Waiting 6 seconds for CSS artifact content to load...');
      await new Promise(resolve => setTimeout(resolve, 6000));

      // Extract the code content
      const cssContent = await page.evaluate(() => {
        // Look inside the artifact sidebar (often monaco editor or similar pre-formatted container)
        const editors = document.querySelectorAll('.monaco-editor, pre code, pre, [role="code"], textarea');
        for (const el of editors) {
          const text = el.innerText || el.value;
          if (text && text.includes('/*') && text.includes('@media')) {
            return text;
          }
        }
        
        // Fallback: look for the largest pre element
        const pres = Array.from(document.querySelectorAll('pre'));
        if (pres.length > 0) {
          pres.sort((a, b) => b.innerText.length - a.innerText.length);
          return pres[0].innerText;
        }
        return null;
      });

      if (cssContent && cssContent.length > 100) {
        fs.writeFileSync('/Users/shivamrai/.gemini/antigravity/scratch/muffin-factory-responsive.css', cssContent, 'utf8');
        console.log(`CSS Extracted! Length: ${cssContent.length}`);
      } else {
        console.log('CSS extraction returned empty or small string. Taking screenshot...');
        await page.screenshot({ path: '/Users/shivamrai/.gemini/antigravity/scratch/css_extract_fail.png' });
        // Dump DOM text
        const pageText = await page.evaluate(() => document.body.innerText);
        fs.writeFileSync('/Users/shivamrai/.gemini/antigravity/scratch/css_extract_fail_text.txt', pageText, 'utf8');
      }
    } else {
      console.log('CSS card button not found in DOM.');
    }

    if (guideBtn) {
      console.log('Clicking installation-guide.html card...');
      await guideBtn.click();
      console.log('Waiting 6 seconds for Guide artifact content to load...');
      await new Promise(resolve => setTimeout(resolve, 6000));

      // Extract the guide code content
      const guideContent = await page.evaluate(() => {
        const editors = document.querySelectorAll('.monaco-editor, pre code, pre, [role="code"], textarea');
        for (const el of editors) {
          const text = el.innerText || el.value;
          if (text && (text.includes('<!DOCTYPE html>') || text.includes('<html>') || text.includes('<h2>'))) {
            return text;
          }
        }
        
        const pres = Array.from(document.querySelectorAll('pre'));
        if (pres.length > 0) {
          pres.sort((a, b) => b.innerText.length - a.innerText.length);
          return pres[0].innerText;
        }
        return null;
      });

      if (guideContent && guideContent.length > 100) {
        fs.writeFileSync('/Users/shivamrai/.gemini/antigravity/scratch/installation-guide.html', guideContent, 'utf8');
        console.log(`Guide Extracted! Length: ${guideContent.length}`);
      } else {
        console.log('Guide extraction returned empty or small string. Taking screenshot...');
        await page.screenshot({ path: '/Users/shivamrai/.gemini/antigravity/scratch/guide_extract_fail.png' });
      }
    } else {
      console.log('Guide card button not found in DOM.');
    }

  } catch (err) {
    console.error('Error during scraping execution:', err);
  }

  await browser.close();
  console.log('Browser closed.');
})();
