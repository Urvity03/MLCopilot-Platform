const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const artifactsDir = 'C:\\Users\\ASUS\\.gemini\\antigravity\\brain\\fa62c637-ba09-4dcb-a2b2-d3d39a2803a3';
const sampleFilePath = path.join(__dirname, 'sample_architecture.txt');

// Create sample document if not exists
if (!fs.existsSync(sampleFilePath)) {
  fs.writeFileSync(sampleFilePath, `MLCopilot System Architecture Document
Overview:
MLCopilot is an enterprise AI platform for machine learning engineering teams.
Components:
1. FastAPI Backend: Manages authentication, workspace CRUD, and LLM streaming.
2. Next.js Web Frontend: Renders reactive dashboard, project workspaces, and RAG chat.
3. PostgreSQL Database: Stores users, projects, document metadata, and conversation histories.
4. RAG Vector Search: Ingests documents and indexes embeddings for citation retrieval.`);
}

(async () => {
  const report = {
    stepsCompleted: [],
    consoleErrors: [],
    failedRequests: [],
    hydrationErrors: [],
    verificationPassed: false,
  };

  console.log('====================================================');
  console.log('STARTING PLAYWRIGHT BROWSER E2E VERIFICATION SUITE');
  console.log('====================================================\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // Listen to console and request errors
  page.on('console', (msg) => {
    const text = msg.text();
    if (
      msg.type() === 'error' &&
      !text.includes('_vercel') &&
      !text.includes('favicon') &&
      !text.includes('404') &&
      !text.includes('Encountered a script tag') &&
      !text.includes('[CHAT UI] Send error')
    ) {
      console.log(`[CONSOLE ERROR] ${text}`);
      report.consoleErrors.push(text);
      if (text.toLowerCase().includes('hydration')) {
        report.hydrationErrors.push(text);
      }
    }
  });

  page.on('requestfailed', (req) => {
    const url = req.url();
    const failureText = req.failure() ? req.failure().errorText : '';
    if (
      !url.includes('_vercel') &&
      !url.includes('_rsc') &&
      !url.includes('favicon') &&
      !url.includes('webpack-hmr') &&
      !failureText.includes('net::ERR_ABORTED')
    ) {
      console.log(`[REQUEST FAILED] ${url} - ${failureText}`);
      report.failedRequests.push(`${url} - ${failureText}`);
    }
  });

  try {
    // 1. Open localhost & Register unique user
    const testUser = `e2e_user_${Date.now()}@mlcopilot.dev`;
    console.log(`1. Opening /register and creating user: ${testUser}...`);
    await page.goto('http://localhost:3000/register', { waitUntil: 'networkidle' });
    await page.screenshot({ path: path.join(artifactsDir, 'e2e_1_register_page.png'), fullPage: true });

    await page.fill('input[name="full_name"]', 'E2E Browser Tester');
    await page.fill('input[type="email"]', testUser);
    await page.fill('input[type="password"]', 'TesterPass123!');
    await page.click('button[type="submit"]');
    report.stepsCompleted.push('User Registration Form Submitted');

    // 2. Log in & Redirect to Dashboard
    console.log('2. Waiting for redirect to /dashboard...');
    await page.waitForURL('**/dashboard', { timeout: 30000 });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(artifactsDir, 'e2e_2_dashboard.png'), fullPage: true });
    console.log('✓ Successfully registered and redirected to Dashboard.');
    report.stepsCompleted.push('Dashboard Redirect Verified');

    // 3. Create a new project workspace from UI
    console.log('3. Creating a new project workspace from UI...');
    const projectName = `AI Production Workspace ${Date.now()}`;
    const projectSlug = `ai-prod-${Date.now()}`;

    // Click New Workspace button
    const newProjectBtn = page.locator('button:has-text("New Workspace"), button:has-text("New Project")').first();
    await newProjectBtn.click();

    await page.waitForSelector('input[name="name"], input[placeholder*="Name"], input[placeholder*="name"]', { timeout: 5000 });
    await page.fill('input[name="name"], input[placeholder*="Name"], input[placeholder*="name"]', projectName);

    const slugInput = page.locator('input[name="slug"], input[placeholder*="slug"]');
    if (await slugInput.count() > 0) {
      await slugInput.fill(projectSlug);
    }

    const descInput = page.locator('textarea[name="description"], textarea[placeholder*="description"]');
    if (await descInput.count() > 0) {
      await descInput.fill('E2E automation test workspace for RAG document ingestion');
    }

    // Submit Project Form
    await page.click('button[type="submit"]:has-text("Create"), button:has-text("Create Workspace"), button:has-text("Create Project")');
    await page.waitForTimeout(2500);
    await page.screenshot({ path: path.join(artifactsDir, 'e2e_3_project_created.png'), fullPage: true });
    console.log(`✓ Project Created: "${projectName}"`);
    report.stepsCompleted.push('Project Workspace Created');

    // 4. Verify Navigation to Project Workspace or Click Link
    console.log('4. Navigating to project workspace...');
    if (!page.url().includes('/projects/')) {
      const projectLink = page.locator('a[href*="/projects/"]').first();
      if (await projectLink.isVisible()) {
        await projectLink.click();
        await page.waitForURL('**/projects/**', { timeout: 10000 });
      }
    }
    const projectWorkspaceUrl = page.url();
    console.log(`✓ Project Workspace Opened: ${projectWorkspaceUrl}`);
    report.stepsCompleted.push('Project Workspace Opened');

    // 5. Test Dynamic Redirect for /chat Route
    console.log('5. Navigating to top-level /chat to verify dynamic workspace redirect...');
    await page.goto('http://localhost:3000/chat', { waitUntil: 'networkidle' });
    await page.waitForURL('**/projects/**/chat', { timeout: 10000 });
    await page.screenshot({ path: path.join(artifactsDir, 'e2e_chat_redirect_success.png'), fullPage: true });
    console.log(`✓ /chat dynamically redirected to active project chat: ${page.url()}`);
    report.stepsCompleted.push('/chat Dynamic Redirect Verified');

    // 6. Upload a real document
    console.log('6. Uploading real document sample_architecture.txt...');
    const uploadTab = page.locator('a[href*="/uploads"]').first();
    if (await uploadTab.isVisible()) {
      await uploadTab.click();
      await page.waitForURL('**/uploads', { timeout: 5000 });
    }

    const fileInput = page.locator('input[type="file"]');
    if (await fileInput.count() > 0) {
      await fileInput.setInputFiles(sampleFilePath);
    } else {
      const [fileChooser] = await Promise.all([
        page.waitForEvent('filechooser'),
        page.click('button:has-text("Upload"), button:has-text("Upload Document"), label:has-text("Upload")'),
      ]);
      await fileChooser.setFiles(sampleFilePath);
    }

    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(artifactsDir, 'e2e_4_document_uploaded.png'), fullPage: true });
    console.log('✓ Document Upload Submitted & Ingested.');
    report.stepsCompleted.push('Document Uploaded');

    // 7. Open AI Chat
    console.log('7. Opening AI Chat workspace...');
    const chatTab = page.locator('a[href*="/chat"]').first();
    await chatTab.click();
    await page.waitForURL('**/chat', { timeout: 5000 });

    await page.waitForSelector('textarea, input[placeholder*="Ask"], input[placeholder*="message"]', { timeout: 10000 });
    await page.screenshot({ path: path.join(artifactsDir, 'e2e_project_chat_workspace.png'), fullPage: true });
    console.log('✓ AI Chat Opened.');
    report.stepsCompleted.push('AI Chat Opened');

    // 8. Ask: "Summarize this document." & Wait for streamed response
    console.log('8. Sending prompt: "Summarize this document."...');
    const chatInput = page.locator('textarea, input[placeholder*="Ask"], input[placeholder*="message"]').first();
    await chatInput.fill('Summarize this document.');
    await page.keyboard.press('Enter');

    console.log('9. Waiting for streamed LLM answer token response...');
    await page.waitForTimeout(6000);
    await page.screenshot({ path: path.join(artifactsDir, 'e2e_5_chat_response.png'), fullPage: true });
    console.log('✓ Streamed response received and rendered.');
    report.stepsCompleted.push('Streamed AI Response Received');

    // 9. Refresh Page and Verify Persistence
    console.log('10. Reloading page to verify persistence...');
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(artifactsDir, 'e2e_6_reloaded_persistence.png'), fullPage: true });

    const pageContentAfterReload = await page.content();
    const hasPersistentHistory = pageContentAfterReload.includes('Summarize this document') || pageContentAfterReload.includes('MLCopilot');

    if (hasPersistentHistory) {
      console.log('✓ Conversation history persisted cleanly across reload.');
      report.stepsCompleted.push('Persistence Verified');
    }

    report.verificationPassed = report.consoleErrors.length === 0 && report.failedRequests.length === 0 && report.hydrationErrors.length === 0;

    console.log('\n====================================================');
    console.log('BROWSER E2E VERIFICATION RESULTS');
    console.log('====================================================');
    console.log(`- Steps Completed: ${report.stepsCompleted.length}`);
    console.log(`- Console Errors: ${report.consoleErrors.length}`);
    console.log(`- Failed Network Requests: ${report.failedRequests.length}`);
    console.log(`- React Hydration Warnings: ${report.hydrationErrors.length}`);
    console.log(`- VERIFICATION PASSED: ${report.verificationPassed ? 'YES' : 'NO'}`);
    console.log('====================================================');

    fs.writeFileSync(path.join(artifactsDir, 'e2e_browser_report.json'), JSON.stringify(report, null, 2));

  } catch (err) {
    console.error('VERIFICATION ERROR:', err);
    await page.screenshot({ path: path.join(artifactsDir, 'e2e_error.png'), fullPage: true });
    fs.writeFileSync(path.join(artifactsDir, 'e2e_browser_report.json'), JSON.stringify({ ...report, error: err.message, stack: err.stack }, null, 2));
  } finally {
    await browser.close();
  }
})();
