const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = 'C:/Users/ASUS/.gemini/antigravity/brain/fa62c637-ba09-4dcb-a2b2-d3d39a2803a3';
const BASE_WEB_URL = 'http://127.0.0.1:3000';
const BASE_API_URL = 'http://localhost:8000/api/v1';

async function verifyFourQuestions() {
  console.log('====================================================');
  console.log('EXECUTING EXACT 4-QUESTION VERIFICATION SUITE');
  console.log('====================================================');

  const results = {
    badgeText: null,
    gpt4oFoundInDOM: false,
    consoleErrors: [],
    failedRequests: [],
    questions: []
  };

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') {
      results.consoleErrors.push(msg.text());
    }
  });

  page.on('requestfailed', request => {
    if (!request.url().includes('_vercel')) {
      results.failedRequests.push(`${request.url()} - ${request.failure().errorText}`);
    }
  });

  try {
    // 1. Register User via UI
    const testEmail = `verification_${Date.now()}@mlcopilot.dev`;
    console.log(`\nRegistering user via UI: ${testEmail}`);
    await page.goto(`${BASE_WEB_URL}/register`);
    await page.waitForSelector('input[name="full_name"]');
    await page.fill('input[name="full_name"]', 'Verification Tester');
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', 'TesterPassword123!');
    await page.click('button[type="submit"]');

    await page.waitForURL('**/dashboard', { timeout: 15000 });
    console.log('✓ Registration successful, redirected to /dashboard');

    const authStateRaw = await page.evaluate(() => localStorage.getItem('mlcopilot-auth-session'));
    const authState = JSON.parse(authStateRaw || '{}');
    const token = authState?.state?.accessToken;
    console.log(`✓ Token retrieved: ${token ? 'VALID' : 'MISSING'}`);

    // 2. Create Project Workspace via UI
    await page.click('text=New Workspace');
    await page.waitForSelector('input[name="name"]');
    await page.fill('input[name="name"]', `Verification Workspace ${Date.now()}`);
    await page.fill('textarea[name="description"]', '4-Question Verification');
    await page.click('button[type="submit"]');

    await page.waitForURL(url => url.pathname.includes('/projects/') && !url.pathname.endsWith('/chat'));
    const projectId = page.url().split('/projects/')[1].split('/')[0];
    console.log(`✓ Workspace created ID: ${projectId}`);

    // 3. Upload Sample Documents via API
    const docsDir = path.join(process.cwd(), 'scratch_docs');
    const txtPath = path.join(docsDir, 'sample_operational_guidelines.txt');
    const pdfPath = path.join(docsDir, 'sample_ml_platform.pdf');

    const uploadFiles = [
      { path: txtPath, name: 'sample_operational_guidelines.txt', type: 'text/plain' },
      { path: pdfPath, name: 'sample_ml_platform.pdf', type: 'application/pdf' }
    ];

    for (const f of uploadFiles) {
      const fileBuffer = fs.readFileSync(f.path);
      const blob = new Blob([fileBuffer], { type: f.type });
      const formData = new FormData();
      formData.append('file', blob, f.name);

      await fetch(`${BASE_API_URL}/projects/${projectId}/uploads`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
    }

    // Wait for embeddings
    for (let i = 0; i < 15; i++) {
      await new Promise(r => setTimeout(r, 1000));
      const res = await fetch(`${BASE_API_URL}/projects/${projectId}/uploads`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const list = await res.json();
      if (Array.isArray(list) && list.length >= 2 && list.every(u => u.embedding_status === 'embedded')) {
        console.log('✓ Test documents parsed & embedded.');
        break;
      }
    }

    // 4. Open Chat Page in UI
    console.log(`\nNavigating to chat page: ${BASE_WEB_URL}/projects/${projectId}/chat`);
    await page.goto(`${BASE_WEB_URL}/projects/${projectId}/chat`);
    await page.waitForSelector('textarea[placeholder*="Ask anything"]', { timeout: 15000 });
    await page.waitForTimeout(1500);

    // Verify Active Model Badge
    const badgeElement = await page.locator('span:has-text("Ollama"), span:has-text("Gemini")').first();
    const badgeText = await badgeElement.textContent();
    console.log(`Active Model Badge displayed: "${badgeText}"`);
    results.badgeText = badgeText;

    const visibleText = await page.innerText('body');
    results.gpt4oFoundInDOM = visibleText.includes('gpt-4o');
    console.log(`Contains visible "gpt-4o" string in DOM: ${results.gpt4oFoundInDOM}`);

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'verification_1_chat_badge.png') });

    // Helper to send query and capture streaming answer
    async function askAndCapture(questionNum, questionText) {
      console.log(`\n--- QUESTION ${questionNum}: "${questionText}" ---`);
      const startTime = Date.now();

      const textarea = page.locator('textarea[placeholder*="Ask anything"]');
      await textarea.focus();
      await textarea.fill(questionText);
      await page.waitForTimeout(200);
      await textarea.press('Enter');

      // Wait for response streaming to finish (until typing dots disappear and content stabilizes)
      let responseText = '';
      for (let i = 0; i < 20; i++) {
        await page.waitForTimeout(1000);
        const messages = await page.locator('.prose').allInnerTexts();
        if (messages.length >= questionNum) {
          responseText = messages[messages.length - 1];
          if (responseText.length > 20 && !responseText.includes('...')) {
            break;
          }
        }
      }

      const latencyMs = Date.now() - startTime;
      console.log(`Q${questionNum} Answer (${latencyMs}ms):\n${responseText}\n`);

      await page.screenshot({ path: path.join(ARTIFACT_DIR, `verification_${questionNum + 1}_q${questionNum}.png`) });

      results.questions.push({
        questionNumber: questionNum,
        question: questionText,
        latencyMs: latencyMs,
        responseContent: responseText
      });

      return responseText;
    }

    // Question 1: What is TalentLens AI?
    await askAndCapture(1, 'What is TalentLens AI?');

    // Question 2: Summarize the uploaded documents.
    await askAndCapture(2, 'Summarize the uploaded documents.');

    // Question 3: What technology stack does this project use?
    await askAndCapture(3, 'What technology stack does this project use?');

    // Question 4: What is the capital of Mars?
    await askAndCapture(4, 'What is the capital of Mars?');

    fs.writeFileSync(
      path.join(ARTIFACT_DIR, 'four_questions_verification.json'),
      JSON.stringify(results, null, 2)
    );

    console.log('\n====================================================');
    console.log('4-QUESTION VERIFICATION COMPLETED SUCCESSFULLY');
    console.log('====================================================');
  } catch (err) {
    console.error('VERIFICATION ERROR:', err);
  } finally {
    await browser.close();
  }
}

verifyFourQuestions();
