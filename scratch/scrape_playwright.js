import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

(async () => {
  console.log('Launching Playwright Chromium...');
  const browser = await chromium.launch({
    headless: true
  });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();

  // Intercept responses
  page.on('response', async (response) => {
    const url = response.url();
    const status = response.status();
    const contentType = response.headers()['content-type'] || '';

    if (url.includes('share') || contentType.includes('application/json')) {
      console.log(`[Playwright] Response: ${url} (${status})`);
      try {
        const text = await response.text();
        const safeName = 'pw_' + url.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 100) + '.json';
        const dest = path.join('/Users/shivamrai/.gemini/antigravity/scratch', safeName);
        fs.writeFileSync(dest, text, 'utf8');
        console.log(`[Playwright] Saved response to ${dest}`);
      } catch (err) {
        // Some responses might not be readable
      }
    }
  });

  console.log('Navigating to share page...');
  try {
    await page.goto('https://claude.ai/share/86f1475c-4abb-4a2b-9c80-d9bc9112562a', {
      waitUntil: 'networkidle',
      timeout: 45000
    });

    console.log('Waiting 5s for page to settle...');
    await page.waitForTimeout(5000);

    // Get page text to check if blocked
    const bodyText = await page.innerText('body');
    if (bodyText.includes('security verification')) {
      console.log('[Playwright] Blocked by Cloudflare. Taking screenshot...');
      await page.screenshot({ path: '/Users/shivamrai/.gemini/antigravity/scratch/pw_cloudflare.png' });
    } else {
      console.log('[Playwright] Successfully loaded page! Clicking expanders...');
      
      // Click consent accept if exists
      const consentBtn = await page.$('button[data-testid="consent-accept"]');
      if (consentBtn) {
        await consentBtn.click();
        await page.waitForTimeout(2000);
      }

      // Click all expanders
      const buttons = await page.$$('button');
      for (const btn of buttons) {
        const text = await btn.innerText();
        if (text.includes('Comprehensive') || text.includes('Created a file') || text.includes('Searched the web') || text.includes('uploaded source files') || text.includes('design skill')) {
          console.log(`[Playwright] Clicking: "${text.trim().replace(/\n/g, ' ')}"`);
          await btn.click().catch(() => {});
          await page.waitForTimeout(1500);
        }
      }

      // Wait for file buttons
      await page.waitForTimeout(3000);

      // Click CSS button
      const buttons2 = await page.$$('button');
      for (const btn of buttons2) {
        const text = await btn.innerText();
        if (text.includes('muffin-factory-responsive.css')) {
          console.log('[Playwright] Clicking CSS button...');
          await btn.click();
          await page.waitForTimeout(5000);
          
          // Grab code
          const cssContent = await page.evaluate(() => {
            const pre = document.querySelector('pre');
            return pre ? pre.innerText : null;
          });
          if (cssContent) {
            fs.writeFileSync('/Users/shivamrai/.gemini/antigravity/scratch/muffin-factory-responsive.css', cssContent, 'utf8');
            console.log('[Playwright] Saved CSS file!');
          }
          break;
        }
      }

      // Click Guide button
      for (const btn of buttons2) {
        const text = await btn.innerText();
        if (text.includes('installation-guide.html')) {
          console.log('[Playwright] Clicking Guide button...');
          await btn.click();
          await page.waitForTimeout(5000);

          const guideContent = await page.evaluate(() => {
            const pre = document.querySelector('pre');
            return pre ? pre.innerText : null;
          });
          if (guideContent) {
            fs.writeFileSync('/Users/shivamrai/.gemini/antigravity/scratch/installation-guide.html', guideContent, 'utf8');
            console.log('[Playwright] Saved Guide file!');
          }
          break;
        }
      }
    }
  } catch (err) {
    console.error('[Playwright] Error:', err);
  }

  await browser.close();
  console.log('[Playwright] Done.');
})();
