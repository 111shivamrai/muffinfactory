const puppeteer = require('puppeteer');

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

    console.log('Waiting for content...');
    await page.waitForSelector('body', { timeout: 10000 });
    
    // Wait additional 5 seconds
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Get text content of the page
    const textContent = await page.evaluate(() => document.body.innerText);
    console.log('--- PAGE TEXT CONTENT ---');
    console.log(textContent);
    console.log('--- END OF TEXT ---');

    // Save HTML
    const htmlContent = await page.content();
    const fs = require('fs');
    fs.writeFileSync('/Users/shivamrai/.gemini/antigravity/scratch/claude_share_resolved.html', htmlContent, 'utf8');
    console.log('Saved HTML to /Users/shivamrai/.gemini/antigravity/scratch/claude_share_resolved.html');
  } catch (err) {
    console.error('Error during scraping:', err);
  }

  await browser.close();
})();
