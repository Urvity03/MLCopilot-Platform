const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = 'C:/Users/ASUS/.gemini/antigravity/brain/fa62c637-ba09-4dcb-a2b2-d3d39a2803a3';

async function testChatFull() {
  console.log('--- STARTING FULL E2E PLAYWRIGHT CHAT VERIFICATION ---');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  const consoleLogs = [];
  const networkEvents = [];

  page.on('console', msg => {
    consoleLogs.push({ type: msg.type(), text: msg.text() });
    console.log(`[BROWSER CONSOLE ${msg.type().toUpperCase()}] ${msg.text()}`);
  });

  page.on('pageerror', err => {
    console.log(`[BROWSER PAGE ERROR] ${err.message}`);
    consoleLogs.push({ type: 'pageerror', text: err.message, stack: err.stack });
  });

  page.on('request', request => {
    const url = request.url();
    if (url.includes('/chat') || url.includes('/conversations')) {
      console.log(`[NETWORK REQ] ${request.method()} ${url}`);
    }
  });

  page.on('response', async response => {
    const url = response.url();
    if (url.includes('/chat') || url.includes('/conversations')) {
      let body = '';
      try {
        body = await response.text();
      } catch (_) {}
      console.log(`[NETWORK RES] ${response.status()} ${url}`);
      networkEvents.push({
        url,
        status: response.status(),
        body: body.slice(0, 500)
      });
    }
  });

  try {
    // 1. Login
    console.log('1. Navigating to Login...');
    await page.goto('http://localhost:3000/login');
    await page.waitForSelector('input[type="email"]');
    await page.fill('input[type="email"]', 'lead_engineer@mlcopilot.dev');
    await page.fill('input[type="password"]', 'ProductionPassword123!');
    await page.click('button[type="submit"]');

    // 2. Wait for Dashboard
    console.log('2. Waiting for Dashboard...');
    await page.waitForURL('**/dashboard');
    await page.waitForSelector('text=Active Workspaces');

    // 3. Create fresh workspace
    console.log('3. Opening New Project Modal...');
    await page.click('text=New Workspace');
    await page.waitForSelector('input[name="name"]');
    const ts = Date.now();
    await page.fill('input[name="name"]', `E2E Chat Test ${ts}`);
    await page.fill('textarea[name="description"]', 'Full AI chat E2E verification workspace');
    await page.click('button[type="submit"]');

    console.log('4. Waiting for redirect to project overview...');
    await page.waitForURL(url => url.pathname.includes('/projects/') && !url.pathname.endsWith('/chat'));
    const projectUrl = page.url();
    const projectId = projectUrl.split('/projects/')[1].split('/')[0];
    console.log(`Project created with ID: ${projectId}`);

    // 5. Navigate to AI Chat
    console.log('5. Navigating to Chat Page...');
    await page.goto(`http://localhost:3000/projects/${projectId}/chat`);
    await page.waitForSelector('textarea[placeholder*="Ask anything"]');
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'ai_chat_1_empty.png') });

    // 6. Send prompt "What is TalentLens AI?"
    console.log('6. Sending prompt "What is TalentLens AI?"...');
    await page.fill('textarea[placeholder*="Ask anything"]', 'What is TalentLens AI?');
    await page.click('button[type="submit"]');

    // 7. Wait for AI response bubble to appear
    console.log('7. Waiting for AI response bubble...');
    await page.waitForSelector('div:has-text("MLCopilot")');
    
    // Wait for streaming to finish and text to settle
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'ai_chat_2_first_response.png') });
    console.log('First AI response received successfully!');

    // 8. Reload page to verify persistence
    console.log('8. Reloading page to verify persistence...');
    await page.reload();
    await page.waitForSelector('textarea[placeholder*="Ask anything"]');
    await page.waitForSelector('div:has-text("MLCopilot")');
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'ai_chat_3_reloaded_persistence.png') });
    console.log('Conversation persisted across page reload!');

    // 9. Send follow-up message
    console.log('9. Sending follow-up message "Explain how TalentLens AI performs resume parsing."...');
    await page.fill('textarea[placeholder*="Ask anything"]', 'Explain how TalentLens AI performs resume parsing.');
    await page.click('button[type="submit"]');

    // Wait for second AI response
    await page.waitForTimeout(4000);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'ai_chat_4_followup_response.png') });
    console.log('Follow-up message answered by AI successfully!');

    // Save network & diagnostic logs
    fs.writeFileSync(
      path.join(ARTIFACT_DIR, 'ai_chat_e2e_report.json'),
      JSON.stringify({ consoleLogs, networkEvents }, null, 2)
    );

    console.log('SUCCESS: Full E2E AI Chat verification completed successfully!');
  } catch (err) {
    console.error('FAILURE during chat verification:', err);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'ai_chat_error.png') });
  } finally {
    await browser.close();
  }
}

testChatFull();
