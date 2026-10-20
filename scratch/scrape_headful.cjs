const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  console.log('Launching browser in headful mode (headless: false)...');
  const browser = await puppeteer.launch({
    headless: false,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled'
    ]
  });
  const page = await browser.newPage();
  
  await page.setViewport({ width: 1280, height: 800 });
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  // Listen to page console messages
  page.on('console', msg => {
    console.log(`[PAGE CONSOLE] ${msg.type().toUpperCase()}: ${msg.text()}`);
  });

  console.log('Navigating to Claude share link...');
  try {
    await page.goto('https://claude.ai/share/86f1475c-4abb-4a2b-9c80-d9bc9112562a', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    console.log('Waiting 10 seconds for Cloudflare/load to settle...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Accept cookies if present
    try {
      const acceptCookiesBtn = await page.$('button[data-testid="consent-accept"]');
      if (acceptCookiesBtn) {
        console.log('Clicking Accept All Cookies...');
        await acceptCookiesBtn.click();
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (e) {
      console.log('Cookie banner not present or clicked.');
    }

    // Expand status blocks
    console.log('Expanding status blocks...');
    const pageButtons = await page.$$('button');
    for (const btn of pageButtons) {
      const text = await page.evaluate(el => el.innerText, btn);
      if (text.includes('Comprehensive') || text.includes('Created a file') || text.includes('Searched the web') || text.includes('uploaded source files') || text.includes('design skill')) {
        console.log(`Clicking expander: "${text.trim().replace(/\n/g, ' ')}"`);
        await page.evaluate(el => el.scrollIntoView(), btn);
        await new Promise(resolve => setTimeout(resolve, 500));
        await btn.click().catch(() => {});
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    console.log('Waiting 5s for file cards to appear...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Find and click the CSS file button
    const currentButtons = await page.$$('button');
    let cssBtn = null;
    let guideBtn = null;
    
    for (const btn of currentButtons) {
      const text = await page.evaluate(el => el.innerText, btn);
      if (text.includes('muffin-factory-responsive.css')) {
        cssBtn = btn;
      }
      if (text.includes('installation-guide.html')) {
        guideBtn = btn;
      }
    }

    if (cssBtn) {
      console.log('Clicking CSS file button...');
      await page.evaluate(el => el.scrollIntoView(), cssBtn);
      await new Promise(resolve => setTimeout(resolve, 500));
      await cssBtn.click();
      console.log('Waiting 8 seconds for CSS content to render...');
      await new Promise(resolve => setTimeout(resolve, 8000));

      const cssContent = await page.evaluate(() => {
        // Look inside elements that might contain code text
        const codeElement = document.querySelector('.monaco-editor, pre code, pre, [role="code"], textarea');
        if (codeElement) return codeElement.innerText || codeElement.value;
        
        const pres = Array.from(document.querySelectorAll('pre'));
        if (pres.length > 0) {
          pres.sort((a, b) => b.innerText.length - a.innerText.length);
          return pres[0].innerText;
        }
        return null;
      });

      if (cssContent && cssContent.length > 100) {
        fs.writeFileSync('/Users/shivamrai/.gemini/antigravity/scratch/muffin-factory-responsive.css', cssContent, 'utf8');
        console.log(`CSS Extracted successfully! Length: ${cssContent.length}`);
      } else {
        console.log('CSS content extraction empty. Saving clicked HTML and screenshot.');
        const html = await page.content();
        fs.writeFileSync('/Users/shivamrai/.gemini/antigravity/scratch/css_clicked_page.html', html, 'utf8');
        await page.screenshot({ path: '/Users/shivamrai/.gemini/antigravity/scratch/css_headful_fail.png' });
      }
    } else {
      console.log('CSS file button not found.');
    }

    if (guideBtn) {
      console.log('Clicking Guide file button...');
      await page.evaluate(el => el.scrollIntoView(), guideBtn);
      await new Promise(resolve => setTimeout(resolve, 500));
      await guideBtn.click();
      console.log('Waiting 8 seconds for Guide content to render...');
      await new Promise(resolve => setTimeout(resolve, 8000));

      const guideContent = await page.evaluate(() => {
        const codeElement = document.querySelector('.monaco-editor, pre code, pre, [role="code"], textarea');
        if (codeElement) return codeElement.innerText || codeElement.value;
        
        const pres = Array.from(document.querySelectorAll('pre'));
        if (pres.length > 0) {
          pres.sort((a, b) => b.innerText.length - a.innerText.length);
          return pres[0].innerText;
        }
        return null;
      });

      if (guideContent && guideContent.length > 100) {
        fs.writeFileSync('/Users/shivamrai/.gemini/antigravity/scratch/installation-guide.html', guideContent, 'utf8');
        console.log(`Guide Extracted successfully! Length: ${guideContent.length}`);
      } else {
        console.log('Guide content extraction empty.');
        await page.screenshot({ path: '/Users/shivamrai/.gemini/antigravity/scratch/guide_headful_fail.png' });
      }
    } else {
      console.log('Guide file button not found.');
    }

  } catch (err) {
    console.error('Error during headful scraping:', err);
  }

  console.log('Closing browser...');
  await browser.close();
  console.log('Browser closed.');
})();
