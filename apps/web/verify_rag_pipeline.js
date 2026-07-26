const fs = require('fs');
const path = require('path');

async function runRAGVerification() {
  console.log('=== STARTING RAG RETRIEVAL & GENERATION VERIFICATION ===');
  const baseUrl = 'http://127.0.0.1:8000/api/v1';
  const testEmail = `rag_test_${Date.now()}@mlcopilot.dev`;
  const testPassword = 'ProductionPassword123!';

  // 1. Register & Login user
  console.log('\n1. Registering & Authenticating user...');
  await fetch(`${baseUrl}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      full_name: 'RAG Verifier',
      email: testEmail,
      password: testPassword,
    }),
  });

  const loginRes = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      password: testPassword,
    }),
  });

  if (!loginRes.ok) {
    const errText = await loginRes.text();
    throw new Error(`Login failed: ${loginRes.status} ${errText}`);
  }

  const tokenData = await loginRes.json();
  const token = tokenData.access_token;
  console.log('Authentication successful. Token received.');

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  // 2. Create Project
  console.log('\n2. Creating verification project workspace...');
  const ts = Date.now();
  const projRes = await fetch(`${baseUrl}/projects`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      name: `RAG Pipeline Verification ${ts}`,
      slug: `rag-verification-${ts}`,
      description: 'Project workspace for testing semantic RAG retrieval and generation',
    }),
  });
  if (!projRes.ok) {
    const errText = await projRes.text();
    throw new Error(`Project creation failed: ${projRes.status} ${errText}`);
  }
  const project = await projRes.json();
  const projectId = project.id;
  console.log(`Project created: ${project.name} (${projectId})`);

  // 3. Upload knowledge document
  console.log('\n3. Ingesting multi-section knowledge document...');
  const docContent = `# TalentLens Technical Architecture Specification

## Overview & Purpose
TalentLens AI is an enterprise knowledge operating system designed for deep technical document intelligence and semantic search.

## Database Architecture
TalentLens uses PostgreSQL with the pgvector extension for high-dimensional vector similarity search and metadata filtering. Redis is used for high-performance session caching and Celery task queue message routing. Neo4j graph database powers knowledge graph relationship extraction and multi-hop reasoning. MinIO object storage stores raw document artifacts.

## Frontend Framework
The frontend web application is built using Next.js 15 App Router and React 19 server components. Styling uses custom Vanilla CSS design tokens combined with Tailwind CSS utilities. State management uses Zustand for local UI state and React Query (TanStack Query) for async API data fetching.

## AI Models and Embedding Pipeline
TalentLens uses Google Gemini 2.5 Flash as the default LLM for context-aware text generation and reasoning. Vector embeddings are generated locally using the sentence-transformers all-MiniLM-L6-v2 model which produces 384-dimensional dense floating-point vectors.

## Special Features
TalentLens features real-time Server-Sent Events (SSE) token streaming, multi-provider LLM failover architecture (Gemini, OpenAI, OpenRouter, Ollama), automatic graph-RAG document entity linking, strict citation tracking to eliminate hallucinations, and clean architecture scoping.

## System Architecture Summary
The system follows Clean Architecture principles separated into presentation (FastAPI & Next.js), feature domain logic (RAGService, RetrievalService, GenerationService), and infrastructure adapters (PostgreSQL, Redis, Neo4j, MinIO, Gemini).
`;

  const formData = new FormData();
  const blob = new Blob([docContent], { type: 'text/markdown' });
  formData.append('file', blob, 'talentlens_specification.md');

  const uploadRes = await fetch(`${baseUrl}/projects/${projectId}/uploads`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });
  if (!uploadRes.ok) {
    const errText = await uploadRes.text();
    throw new Error(`Upload failed: ${uploadRes.status} ${errText}`);
  }
  const upload = await uploadRes.json();
  console.log(`Document uploaded: ${upload.filename} (ID: ${upload.id})`);

  // Poll for background embedding completion
  console.log('Polling for vector embedding status...');
  let attempts = 0;
  let status = upload.embedding_status;
  while (status !== 'embedded' && attempts < 25) {
    await new Promise(r => setTimeout(r, 1000));
    attempts++;
    const checkRes = await fetch(`${baseUrl}/projects/${projectId}/uploads/${upload.id}`, { headers });
    if (checkRes.ok) {
      const updated = await checkRes.json();
      status = updated.embedding_status;
    }
  }
  console.log(`Embedding lifecycle status: ${status} (completed in ${attempts}s)`);

  // 4. Verification Queries
  const queries = [
    "What database does TalentLens use?",
    "What frontend framework is used?",
    "What AI models are used?",
    "What are the special features?",
    "Summarize only the Architecture section."
  ];

  const results = [];

  for (const q of queries) {
    console.log(`\n==================================================`);
    console.log(`QUERY: "${q}"`);
    console.log(`==================================================`);

    const chatRes = await fetch(`${baseUrl}/projects/${projectId}/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ question: q }),
    });

    if (!chatRes.ok) {
      const errText = await chatRes.text();
      console.error(`Chat error: ${chatRes.status} ${errText}`);
      continue;
    }

    const rawText = await chatRes.text();
    const lines = rawText.split('\n');
    let metadata = null;
    let messageTokens = [];

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const payloadStr = line.replace('data: ', '').trim();
        try {
          const payload = JSON.parse(payloadStr);
          if (payload.conversation_id && payload.citations) {
            metadata = payload;
          } else if (payload.text) {
            messageTokens.push(payload.text);
          }
        } catch (e) {}
      }
    }

    const fullResponse = messageTokens.join('');
    const citations = metadata ? metadata.citations : [];

    console.log('\nRetrieved Citations / Chunks:');
    citations.forEach((c, idx) => {
      console.log(`  [Chunk ${idx + 1}] ID: ${c.chunk_id} | Score: ${c.score.toFixed(4)}`);
      console.log(`  Snippet: ${c.content.substring(0, 140).replace(/\n/g, ' ')}...`);
    });

    console.log('\nAI Response:');
    console.log(fullResponse);

    results.push({
      question: q,
      citations: citations.map(c => ({
        chunk_id: c.chunk_id,
        filename: c.filename,
        score: c.score,
        snippet: c.content,
      })),
      response: fullResponse,
    });
  }

  // Save report
  const reportPath = path.join(__dirname, '../../rag_verification_report.json');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`\nFull report written to ${reportPath}`);
}

runRAGVerification().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
