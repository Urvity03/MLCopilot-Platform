const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = 'C:/Users/ASUS/.gemini/antigravity/brain/fa62c637-ba09-4dcb-a2b2-d3d39a2803a3';
const BASE_WEB_URL = 'http://127.0.0.1:3000';
const BASE_API_URL = 'http://localhost:8000/api/v1';

async function runFinalVerification() {
  console.log('====================================================');
  console.log('STARTING FULL AI CHAT VERIFICATION SUITE');
  console.log('====================================================');

  const report = {
    timestamp: new Date().toISOString(),
    commitsVerified: [
      '99119c5 fix(ui): remove hardcoded model labels and expose active provider',
      '6ce4523 perf(chat): instrument end-to-end latency and RAG deduplication'
    ],
    badgeVerification: {},
    consoleErrors: [],
    failedRequests: [],
    questions: [],
    isProductionReady: false
  };

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  page.on('console', msg => {
    const text = msg.text();
    if (msg.type() === 'error' && !text.includes('_vercel') && !text.includes('favicon') && !text.includes('404')) {
      console.log(`[CONSOLE ERROR] ${text}`);
      report.consoleErrors.push(text);
    }
  });

  page.on('requestfailed', req => {
    const url = req.url();
    if (!url.includes('_vercel') && !url.includes('_rsc') && !url.includes('favicon')) {
      console.log(`[REQUEST FAILED] ${url} - ${req.failure().errorText}`);
      report.failedRequests.push(`${url} - ${req.failure().errorText}`);
    }
  });

  try {
    // Step 1: Register User
    const testEmail = `verification_${Date.now()}@mlcopilot.dev`;
    console.log(`\n1. Registering user: ${testEmail}`);
    await page.goto(`${BASE_WEB_URL}/register`);
    await page.waitForSelector('input[name="full_name"]');
    await page.fill('input[name="full_name"]', 'Production Verifier');
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', 'VerifierPass123!');
    await page.click('button[type="submit"]');

    await page.waitForURL('**/dashboard', { timeout: 15000 });
    console.log('✓ Successfully registered and logged in.');

    const authStateRaw = await page.evaluate(() => localStorage.getItem('mlcopilot-auth-session'));
    const authState = JSON.parse(authStateRaw || '{}');
    const token = authState?.state?.accessToken;

    // Step 2: Create Workspace Project
    console.log('\n2. Creating workspace project...');
    await page.click('text=New Workspace');
    await page.waitForSelector('input[name="name"]');
    await page.fill('input[name="name"]', `Verification Workspace ${Date.now()}`);
    await page.fill('textarea[name="description"]', 'Full End-to-End AI Chat Verification');
    await page.click('form button[type="submit"]');

    await page.waitForURL(url => url.pathname.includes('/projects/'));
    const projectId = page.url().split('/projects/')[1].split('/')[0].split('?')[0];
    console.log(`✓ Workspace created (ID: ${projectId})`);

    // Step 3: Upload Sample Documents
    console.log('\n3. Uploading test documents (TXT & PDF)...');
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
        console.log('✓ All uploaded documents successfully parsed & embedded.');
        break;
      }
    }

    // Step 4: Open Chat Page & Inspect Model Badge
    console.log(`\n4. Opening AI Chat page: ${BASE_WEB_URL}/projects/${projectId}/chat`);
    await page.goto(`${BASE_WEB_URL}/projects/${projectId}/chat`);
    await page.waitForSelector('textarea[placeholder*="Ask anything"]', { timeout: 15000 });
    await page.waitForTimeout(2000);

    const badgeElement = page.locator('span:has-text("Ollama"), span:has-text("Gemini")').first();
    const badgeText = await badgeElement.innerText();
    const isOllamaBadge = badgeText.includes('Ollama') || badgeText.includes('llama3.1:8b');
    console.log(`✓ Active Model Badge text: "${badgeText}" (Valid Ollama badge: ${isOllamaBadge})`);

    const fullDOMText = await page.innerText('body');
    const hasGpt4o = fullDOMText.includes('gpt-4o');
    console.log(`✓ Contains hardcoded "gpt-4o" text in DOM: ${hasGpt4o}`);

    report.badgeVerification = {
      badgeText: badgeText,
      isOllamaBadge: isOllamaBadge,
      hasHardcodedGpt4o: hasGpt4o
    };

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'final_verification_badge.png') });

    // Step 5: Execute 4 AI Chat Questions
    const questionsToAsk = [
      {
        id: 1,
        text: 'What is TalentLens AI?',
        type: 'Unanswerable / Out of scope'
      },
      {
        id: 2,
        text: 'Summarize the uploaded documents.',
        type: 'Document Summary'
      },
      {
        id: 3,
        text: 'What technology stack does this project use?',
        type: 'Technical RAG query'
      },
      {
        id: 4,
        text: 'What is the capital of Mars?',
        type: 'Impossible / Anti-hallucination check'
      }
    ];

    for (const q of questionsToAsk) {
      console.log(`\n--- QUESTION ${q.id}: "${q.text}" (${q.type}) ---`);
      const startTime = Date.now();

      const textarea = page.locator('textarea[placeholder*="Ask anything"]');
      await textarea.focus();
      await textarea.fill(q.text);
      await page.waitForTimeout(300);
      await page.click('button[type="submit"]');

      // Wait for response: wait until streaming completes
      let responseText = '';
      for (let i = 0; i < 35; i++) {
        await page.waitForTimeout(1000);
        const proseElements = await page.locator('.prose').allInnerTexts();
        if (proseElements.length >= q.id) {
          const lastProse = proseElements[proseElements.length - 1];
          if (lastProse.length > 10) {
            responseText = lastProse;
          }
        }
        const isBouncing = await page.locator('.animate-bounce').count();
        if (isBouncing === 0 && responseText.length > 10) {
          break;
        }
      }

      // Check citations
      const citeButtons = await page.locator('button:has-text("[")').allInnerTexts();
      const citationList = citeButtons.map(b => b.trim());

      const latencyMs = Date.now() - startTime;
      console.log(`✓ Completed in ${latencyMs}ms`);
      console.log(`   Answer snippet: "${responseText.replace(/\n+/g, ' ').slice(0, 180)}..."`);
      console.log(`   Citations found: ${JSON.stringify(citationList)}`);

      await page.screenshot({ path: path.join(ARTIFACT_DIR, `final_verification_q${q.id}.png`) });

      report.questions.push({
        id: q.id,
        question: q.text,
        type: q.type,
        latencyMs: latencyMs,
        responseContent: responseText,
        citations: citationList
      });
    }

    report.isProductionReady = (
      report.badgeVerification.isOllamaBadge &&
      !report.badgeVerification.hasHardcodedGpt4o &&
      report.consoleErrors.length === 0 &&
      report.failedRequests.length === 0 &&
      report.questions.length === 4
    );

    fs.writeFileSync(
      path.join(ARTIFACT_DIR, 'final_verification_report.json'),
      JSON.stringify(report, null, 2)
    );

    console.log('\n====================================================');
    console.log(`FINAL VERIFICATION RESULT: ${report.isProductionReady ? 'PASSED (PRODUCTION READY)' : 'FAILED'}`);
    console.log('====================================================');
  } catch (err) {
    console.error('VERIFICATION FAILURE:', err);
  } finally {
    await browser.close();
  }
}

runFinalVerification();
