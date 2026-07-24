const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = 'C:/Users/ASUS/.gemini/antigravity/brain/fa62c637-ba09-4dcb-a2b2-d3d39a2803a3';

async function run() {
  console.log('Launching browser...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });
  const page = await context.newPage();

  const networkLogs = {
    createProject: null,
    deleteProject: null
  };

  // Setup request/response interception
  page.on('request', request => {
    const url = request.url();
    const method = request.method();
    if (url.includes('/projects') && method === 'POST') {
      networkLogs.createProject = {
        url,
        method,
        headers: request.headers(),
        payload: request.postData()
      };
    } else if (url.includes('/projects/') && method === 'DELETE') {
      networkLogs.deleteProject = {
        url,
        method,
        headers: request.headers(),
        payload: request.postData()
      };
    }
  });

  page.on('response', async response => {
    const request = response.request();
    const url = request.url();
    const method = request.method();
    if (url.includes('/projects') && method === 'POST') {
      let body;
      try {
        body = await response.json();
      } catch (e) {
        body = await response.text();
      }
      networkLogs.createProject = {
        ...networkLogs.createProject,
        status: response.status(),
        responseHeaders: response.headers(),
        responseBody: body
      };
    } else if (url.includes('/projects/') && method === 'DELETE') {
      let body;
      try {
        body = await response.json();
      } catch (e) {
        body = await response.text();
      }
      networkLogs.deleteProject = {
        ...networkLogs.deleteProject,
        status: response.status(),
        responseHeaders: response.headers(),
        responseBody: body
      };
    }
  });

  // Handle confirm dialogs
  page.on('dialog', async dialog => {
    console.log(`[DIALOG] type: ${dialog.type()}, message: ${dialog.message()}`);
    await dialog.accept();
    console.log('[DIALOG] Accepted.');
  });

  try {
    // 1. Go to Login Page
    console.log('Navigating to http://localhost:3000/login ...');
    await page.goto('http://localhost:3000/login');
    await page.waitForSelector('input[type="email"]');
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'screenshot_1_login.png') });

    // 2. Fill login form
    console.log('Logging in...');
    await page.fill('input[type="email"]', 'lead_engineer@mlcopilot.dev');
    await page.fill('input[type="password"]', 'ProductionPassword123!');
    await page.click('button[type="submit"]');

    // 3. Wait for Dashboard redirect
    console.log('Waiting for dashboard redirects...');
    await page.waitForURL('**/dashboard');
    await page.waitForSelector('text=New Workspace');
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'screenshot_2_dashboard.png') });

    // Get current project count before creation
    console.log('Dashboard loaded.');

    // 4. Click New Workspace / New Project button
    console.log('Opening New Project Modal...');
    await page.click('text=New Workspace');
    await page.waitForSelector('input[name="name"]');
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'screenshot_3_new_project_modal.png') });

    // 5. Fill and Submit form
    console.log('Submitting project creation form...');
    await page.fill('input[name="name"]', 'MLCopilot-Browser-Test');
    
    // Auto slug check
    const slugValue = await page.inputValue('input[name="slug"]');
    console.log(`Generated Slug: ${slugValue}`);

    await page.fill('textarea[name="description"]', 'Manual browser automation test workspace');
    
    // Submit creation
    await page.click('button[type="submit"]');

    // 6. Verify Redirect
    console.log('Waiting for automatic redirection...');
    // Redirection URL is /projects/{projectId}
    await page.waitForURL(url => url.pathname.includes('/projects/') && !url.pathname.endsWith('/settings') && !url.pathname.endsWith('/chat') && !url.pathname.endsWith('/uploads'));
    console.log(`Redirected successfully to: ${page.url()}`);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'screenshot_4_project_overview.png') });

    // 7. Refresh page & confirm project details persistence
    console.log('Refreshing page...');
    await page.reload();
    await page.waitForSelector('text=MLCopilot-Browser-Test');
    console.log('Project verified post-refresh.');
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'screenshot_5_project_refresh.png') });

    // 8. Go to settings and delete
    console.log('Navigating to project settings...');
    await page.click('text=Settings');
    await page.waitForSelector('button:has-text("Delete Workspace")');
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'screenshot_6_settings_general.png') });

    // Click Delete Workspace
    console.log('Triggering project deletion...');
    await page.click('button:has-text("Delete Workspace")');
    
    // Wait to be redirected back to Dashboard
    await page.waitForURL('**/dashboard');
    console.log('Workspace deleted. Redirected back to Dashboard.');
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'screenshot_7_dashboard_after_delete.png') });

    // Write network logs and report
    fs.writeFileSync(
      path.join(ARTIFACT_DIR, 'playwright_report.json'),
      JSON.stringify(networkLogs, null, 2)
    );
    console.log('SUCCESS: All browser verification steps completed successfully.');

  } catch (error) {
    console.error('FAILURE during browser automation:', error);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'screenshot_error.png') });
  } finally {
    await browser.close();
  }
}

run();
