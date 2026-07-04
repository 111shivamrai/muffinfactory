const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  
  await page.setViewport({ width: 1440, height: 900 });
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  // Listen to page console messages
  page.on('console', msg => {
    console.log(`[PAGE CONSOLE] ${msg.type().toUpperCase()}: ${msg.text()}`);
  });

  // Listen to page errors
  page.on('pageerror', err => {
    console.log(`[PAGE ERROR] ${err.toString()}`);
  });

  console.log('Navigating to Claude share link...');
  try {
    await page.goto('https://claude.ai/share/86f1475c-4abb-4a2b-9c80-d9bc9112562a', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    console.log('Waiting 5s for page to settle...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Expand status blocks
    const statusButtons = await page.$$('button');
    for (const btn of statusButtons) {
      const text = await page.evaluate(el => el.innerText, btn);
      if (text.includes('Comprehensive') || text.includes('Created a file') || text.includes('Searched the web') || text.includes('uploaded source files') || text.includes('design skill')) {
        await btn.click().catch(() => {});
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    }

    await new Promise(resolve => setTimeout(resolve, 4000));

    // Find the CSS file button and click it
    const allButtons = await page.$$('button');
    let cssBtn = null;
    for (const btn of allButtons) {
      const text = await page.evaluate(el => el.innerText, btn);
      if (text.includes('muffin-factory-responsive.css')) {
        cssBtn = btn;
        break;
      }
    }

    if (cssBtn) {
      console.log('Clicking CSS file button...');
      await cssBtn.click();
      console.log('Waiting 10s for content to render...');
      await new Promise(resolve => setTimeout(resolve, 10000));

      // Save HTML to file
      const clickedHtml = await page.content();
      fs.writeFileSync('/Users/shivamrai/.gemini/antigravity/scratch/claude_share_clicked.html', clickedHtml, 'utf8');
      console.log('Saved clicked HTML to /Users/shivamrai/.gemini/antigravity/scratch/claude_share_clicked.html');
    } else {
      console.log('CSS card button not found.');
    }

  } catch (err) {
    console.error('Error:', err);
  }

  await browser.close();
  console.log('Browser closed.');
})();
