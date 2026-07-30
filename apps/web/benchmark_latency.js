const axios = require('axios');
const http = require('http');

async function benchmark() {
  const baseURL = 'http://127.0.0.1:8000/api/v1';
  const email = `bench_${Date.now()}@mlcopilot.dev`;
  const password = 'Password123!';

  console.log('1. Registering test user & creating project for benchmark...');
  await axios.post(`${baseURL}/auth/register`, { email, password, full_name: 'Benchmarker' });
  const loginRes = await axios.post(`${baseURL}/auth/login`, { email, password });
  const token = loginRes.data.access_token;

  const client = axios.create({
    baseURL,
    headers: { Authorization: `Bearer ${token}` },
  });

  const projRes = await client.post('/projects', {
    name: 'Latency Bench Workspace',
    slug: `bench-${Date.now()}`,
    description: 'Benchmarking latency performance',
  });
  const projectId = projRes.data.id;

  console.log(`✓ Test workspace created: ${projectId}\n`);
  console.log('====================================================');
  console.log('MEASURING STREAMING LATENCY BREAKDOWN (BEFORE FIX)');
  console.log('====================================================');

  const t0 = performance.now();

  const res = await new Promise((resolve, reject) => {
    let t1 = 0;
    let tFirstToken = 0;
    let tokenCount = 0;
    let fullText = '';

    const req = http.request(
      `http://127.0.0.1:8000/api/v1/projects/${projectId}/chat`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      },
      (response) => {
        t1 = performance.now();
        const headerLatency = t1 - t0;
        console.log(`[T1 - Headers Received]: ${headerLatency.toFixed(2)} ms`);

        response.on('data', (chunk) => {
          const now = performance.now();
          const str = chunk.toString();
          tokenCount++;

          if (!tFirstToken) {
            tFirstToken = now;
            const ttft = tFirstToken - t0;
            console.log(`[TTFT - Time To First Token]: ${ttft.toFixed(2)} ms`);
          }

          fullText += str;
        });

        response.on('end', () => {
          const tEnd = performance.now();
          const totalDuration = tEnd - t0;
          console.log(`[T_END - Response Complete]: ${totalDuration.toFixed(2)} ms`);
          console.log(`[Stats]: Total SSE chunks=${tokenCount}, Chars=${fullText.length}`);
          resolve({
            headerLatency: t1 - t0,
            ttft: tFirstToken - t0,
            totalDuration,
          });
        });
      }
    );

    req.on('error', reject);
    req.write(JSON.stringify({ question: 'What is MLCopilot?', stream: true }));
    req.end();
  });

  return res;
}

benchmark().catch(console.error);
