const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

(async () => {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  // Monitor network responses
  page.on('response', async (response) => {
    const url = response.url();
    const status = response.status();
    const contentType = response.headers()['content-type'] || '';
    
    // Check if it's a JSON response or contains share API
    if (url.includes('share') || contentType.includes('application/json')) {
      console.log(`Response intercepted: URL=${url}, Status=${status}, Content-Type=${contentType}`);
      try {
        const text = await response.text();
        console.log(`-> Intercepted body length: ${text.length}`);
        
        // Save to scratch directory
        const safeName = url.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 100) + '.json';
        const dest = path.join('/Users/shivamrai/.gemini/antigravity/scratch', safeName);
        fs.writeFileSync(dest, text, 'utf8');
        console.log(`-> Saved intercepted response to ${dest}`);
      } catch (err) {
        console.log(`-> Could not read response text: ${err.message}`);
      }
    }
  });

  console.log('Navigating to Claude share link...');
  try {
    await page.goto('https://claude.ai/share/86f1475c-4abb-4a2b-9c80-d9bc9112562a', {
      waitUntil: 'networkidle2',
      timeout: 45000
    });

    console.log('Waiting 10 seconds for background requests to settle...');
    await new Promise(resolve => setTimeout(resolve, 10000));
  } catch (err) {
    console.error('Error during navigation:', err);
  }

  await browser.close();
  console.log('Browser closed.');
})();
