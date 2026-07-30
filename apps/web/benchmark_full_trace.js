const axios = require('axios');
const http = require('http');

async function measureFullTrace() {
  const baseURL = 'http://127.0.0.1:8000/api/v1';
  const email = `trace_${Date.now()}@mlcopilot.dev`;
  const password = 'Password123!';

  await axios.post(`${baseURL}/auth/register`, { email, password, full_name: 'Tracer' });
  const loginRes = await axios.post(`${baseURL}/auth/login`, { email, password });
  const token = loginRes.data.access_token;

  const client = axios.create({
    baseURL,
    headers: { Authorization: `Bearer ${token}` },
  });

  const projRes = await client.post('/projects', {
    name: 'Trace Workspace',
    slug: `trace-${Date.now()}`,
    description: 'Trace workspace for bottleneck analysis',
  });
  const projectId = projRes.data.id;

  console.log('====================================================');
  console.log('FULL-PATH TIMING TRACE (LATENCY BREAKDOWN)');
  console.log('====================================================');

  const t0 = performance.now();
  let tHeaders = 0;
  let tMetadata = 0;
  let tFirstToken = 0;
  let tComplete = 0;
  let sseChunks = 0;

  await new Promise((resolve, reject) => {
    const req = http.request(
      `http://127.0.0.1:8000/api/v1/projects/${projectId}/chat`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      },
      (res) => {
        tHeaders = performance.now();
        console.log(`[1. Network Headers Received]: ${(tHeaders - t0).toFixed(2)} ms`);

        res.on('data', (chunk) => {
          const now = performance.now();
          const str = chunk.toString();
          sseChunks++;

          if (str.includes('event: metadata') && !tMetadata) {
            tMetadata = now;
            console.log(`[2. Metadata Event Received]: ${(tMetadata - t0).toFixed(2)} ms`);
          }

          if (str.includes('event: message') && !tFirstToken) {
            tFirstToken = now;
            console.log(`[3. TIME TO FIRST TOKEN (TTFT)]: ${(tFirstToken - t0).toFixed(2)} ms`);
          }
        });

        res.on('end', () => {
          tComplete = performance.now();
          console.log(`[4. Stream Complete]: ${(tComplete - t0).toFixed(2)} ms`);
          console.log(`[Total SSE Chunks]: ${sseChunks}`);
          resolve();
        });
      }
    );

    req.on('error', reject);
    req.write(JSON.stringify({ question: 'Summarize the architecture of MLCopilot', stream: true }));
    req.end();
  });

  console.log('====================================================\n');
}

measureFullTrace().catch(console.error);
