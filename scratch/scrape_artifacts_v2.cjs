const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  console.log('Launching browser in headless mode...');
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled'
    ]
  });
  const page = await browser.newPage();
  
  // Set window size
  await page.setViewport({ width: 1440, height: 900 });
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  console.log('Navigating to Claude share link...');
  try {
    await page.goto('https://claude.ai/share/86f1475c-4abb-4a2b-9c80-d9bc9112562a', {
      waitUntil: 'networkidle2',
      timeout: 45000
    });

    console.log('Waiting 5 seconds for page load...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Handle Cloudflare check
    const bodyText = await page.evaluate(() => document.body.innerText);
    if (bodyText.includes('security verification') || bodyText.includes('Performing security verification')) {
      console.log('Cloudflare detected. Waiting 15s...');
      await new Promise(resolve => setTimeout(resolve, 15000));
    }

    // Accept cookies if present
    try {
      const acceptCookiesBtn = await page.$('button[data-testid="consent-accept"]');
      if (acceptCookiesBtn) {
        console.log('Clicking Accept All Cookies...');
        await acceptCookiesBtn.click();
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (e) {
      console.log('Cookie banner check failed (probably not present or different selector).');
    }

    // Log all buttons currently on the page
    let buttons = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('button')).map((b, i) => ({
        index: i,
        text: b.innerText.trim(),
        className: b.className
      }));
    });
    console.log('Initial buttons on page:', buttons);

    // Expand all status buttons
    console.log('Expanding status blocks...');
    const buttonsToClick = [];
    const pageButtons = await page.$$('button');
    for (const btn of pageButtons) {
      const text = await page.evaluate(el => el.innerText, btn);
      const isStatus = await page.evaluate(el => el.className.includes('group/status') || el.className.includes('status'), btn);
      if (isStatus || text.includes('Comprehensive') || text.includes('Created a file') || text.includes('Searched the web') || text.includes('uploaded source files') || text.includes('design skill')) {
        buttonsToClick.push({ btn, text });
      }
    }

    for (const { btn, text } of buttonsToClick) {
      console.log(`Clicking expander button: "${text.trim().replace(/\n/g, ' ')}"`);
      // Scroll into view first
      await page.evaluate(el => el.scrollIntoView(), btn);
      await new Promise(resolve => setTimeout(resolve, 500));
      await btn.click().catch(err => console.log(`Click failed for "${text}":`, err.message));
      await new Promise(resolve => setTimeout(resolve, 1500));
    }

    console.log('Waiting 5 seconds for DOM to update with expanded content...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Log buttons after expansion
    buttons = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('button')).map((b, i) => ({
        index: i,
        text: b.innerText.trim(),
        className: b.className
      }));
    });
    console.log('Buttons on page after expansion:', buttons);

    // Find and click the CSS file button
    let clickedCss = false;
    const currentButtons = await page.$$('button');
    for (const btn of currentButtons) {
      const text = await page.evaluate(el => el.innerText, btn);
      if (text.includes('muffin-factory-responsive.css')) {
        console.log('Clicking CSS file button...');
        await page.evaluate(el => el.scrollIntoView(), btn);
        await new Promise(resolve => setTimeout(resolve, 500));
        await btn.click();
        clickedCss = true;
        break;
      }
    }

    if (clickedCss) {
      console.log('Waiting 6 seconds for CSS content to render...');
      await new Promise(resolve => setTimeout(resolve, 6000));

      // Extract CSS content
      const cssContent = await page.evaluate(() => {
        // Look for typical editor/pre elements
        const preElements = Array.from(document.querySelectorAll('pre'));
        if (preElements.length > 0) {
          // Find the largest pre element
          preElements.sort((a, b) => b.innerText.length - a.innerText.length);
          return preElements[0].innerText;
        }
        return null;
      });

      if (cssContent && cssContent.length > 100) {
        fs.writeFileSync('/Users/shivamrai/.gemini/antigravity/scratch/muffin-factory-responsive.css', cssContent, 'utf8');
        console.log(`Successfully extracted CSS! Length: ${cssContent.length}`);
      } else {
        console.log('CSS extraction returned empty/short content.');
        await page.screenshot({ path: '/Users/shivamrai/.gemini/antigravity/scratch/css_extract_fail_v2.png' });
      }
    } else {
      console.log('Could not find CSS file button in DOM.');
    }

    // Find and click the Guide file button
    let clickedGuide = false;
    const currentButtons2 = await page.$$('button');
    for (const btn of currentButtons2) {
      const text = await page.evaluate(el => el.innerText, btn);
      if (text.includes('installation-guide.html')) {
        console.log('Clicking Guide file button...');
        await page.evaluate(el => el.scrollIntoView(), btn);
        await new Promise(resolve => setTimeout(resolve, 500));
        await btn.click();
        clickedGuide = true;
        break;
      }
    }

    if (clickedGuide) {
      console.log('Waiting 6 seconds for Guide content to render...');
      await new Promise(resolve => setTimeout(resolve, 6000));

      // Extract Guide content
      const guideContent = await page.evaluate(() => {
        const preElements = Array.from(document.querySelectorAll('pre'));
        if (preElements.length > 0) {
          preElements.sort((a, b) => b.innerText.length - a.innerText.length);
          return preElements[0].innerText;
        }
        return null;
      });

      if (guideContent && guideContent.length > 100) {
        fs.writeFileSync('/Users/shivamrai/.gemini/antigravity/scratch/installation-guide.html', guideContent, 'utf8');
        console.log(`Successfully extracted Guide! Length: ${guideContent.length}`);
      } else {
        console.log('Guide extraction returned empty/short content.');
        await page.screenshot({ path: '/Users/shivamrai/.gemini/antigravity/scratch/guide_extract_fail_v2.png' });
      }
    } else {
      console.log('Could not find Guide file button in DOM.');
    }

  } catch (err) {
    console.error('Error in scrape_artifacts_v2:', err);
  }

  await browser.close();
  console.log('Browser closed.');
})();
