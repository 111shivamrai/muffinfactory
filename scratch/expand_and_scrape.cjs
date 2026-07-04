const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  
  // Set User-Agent to look like a real browser
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36');

  console.log('Navigating to Claude share link...');
  try {
    await page.goto('https://claude.ai/share/86f1475c-4abb-4a2b-9c80-d9bc9112562a', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    console.log('Waiting for body to load...');
    await page.waitForSelector('body', { timeout: 10000 });
    
    // Wait additional 3 seconds
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('Finding all buttons that can be expanded...');
    const buttons = await page.$$('button');
    console.log(`Found ${buttons.length} buttons on the page.`);

    // Find and click buttons that look like tool call status expanders
    let clickedCount = 0;
    for (const button of buttons) {
      const text = await page.evaluate(el => el.innerText, button);
      const isStatus = await page.evaluate(el => el.getAttribute('aria-expanded') === 'false' || el.className.includes('group/status'), button);
      if (isStatus || text.includes('Comprehensive') || text.includes('Created a file')) {
        console.log(`Clicking button with text: "${text.trim().replace(/\n/g, ' ')}"`);
        await button.click();
        clickedCount++;
        // Wait a bit after each click
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    console.log(`Clicked ${clickedCount} expander buttons.`);

    // Wait 5 more seconds for everything to settle
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Save HTML
    const htmlContent = await page.content();
    fs.writeFileSync('/Users/shivamrai/.gemini/antigravity/scratch/claude_share_expanded.html', htmlContent, 'utf8');
    console.log('Saved expanded HTML to /Users/shivamrai/.gemini/antigravity/scratch/claude_share_expanded.html');

    // Get all code/pre elements
    const codeBlocks = await page.evaluate(() => {
      const blocks = [];
      document.querySelectorAll('pre, code, div.standard-markdown').forEach((el, idx) => {
        blocks.push({
          tag: el.tagName,
          className: el.className,
          text: el.innerText
        });
      });
      return blocks;
    });

    console.log(`Found ${codeBlocks.length} code/pre/markdown blocks.`);
    fs.writeFileSync('/Users/shivamrai/.gemini/antigravity/scratch/code_blocks.json', JSON.stringify(codeBlocks, null, 2), 'utf8');
    console.log('Saved code blocks to /Users/shivamrai/.gemini/antigravity/scratch/code_blocks.json');

  } catch (err) {
    console.error('Error during scraping:', err);
  }

  await browser.close();
})();
