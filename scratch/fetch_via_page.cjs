const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  console.log('Navigating to Claude share link...');
  try {
    await page.goto('https://claude.ai/share/86f1475c-4abb-4a2b-9c80-d9bc9112562a', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    console.log('Waiting for body to load...');
    await page.waitForSelector('body', { timeout: 10000 });
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('Executing fetch inside browser console...');
    const apiData = await page.evaluate(async () => {
      try {
        const response = await fetch('/api/public/share/86f1475c-4abb-4a2b-9c80-d9bc9112562a');
        if (!response.ok) {
          throw new Error(`HTTP status ${response.status}`);
        }
        return await response.json();
      } catch (err) {
        return { error: err.message };
      }
    });

    if (apiData.error) {
      console.error('Fetch inside browser failed:', apiData.error);
    } else {
      console.log('Successfully fetched share data via browser!');
      fs.writeFileSync('/Users/shivamrai/.gemini/antigravity/scratch/share_api_response.json', JSON.stringify(apiData, null, 2), 'utf8');
      console.log('Saved JSON data to /Users/shivamrai/.gemini/antigravity/scratch/share_api_response.json');
    }

  } catch (err) {
    console.error('Error during scraping:', err);
  }

  await browser.close();
})();
