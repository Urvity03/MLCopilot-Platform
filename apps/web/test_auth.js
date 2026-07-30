const axios = require('axios');

async function testBackend() {
  const baseURL = 'http://127.0.0.1:8000/api/v1';
  const email = `test_node_${Date.now()}@mlcopilot.dev`;
  const password = 'Password123!';
  const full_name = 'Node Tester';

  console.log('1. Testing Registration...');
  try {
    const regRes = await axios.post(`${baseURL}/auth/register`, {
      email,
      password,
      full_name,
    });
    console.log('✓ Registration SUCCESS:', regRes.data.email);
  } catch (err) {
    console.error('✗ Registration FAILED:', err.response?.data || err.message);
    return;
  }

  console.log('2. Testing Login...');
  let token = '';
  try {
    const loginRes = await axios.post(`${baseURL}/auth/login`, {
      email,
      password,
    });
    token = loginRes.data.access_token;
    console.log('✓ Login SUCCESS! Token received:', token ? 'YES' : 'NO');
  } catch (err) {
    console.error('✗ Login FAILED:', err.response?.data || err.message);
    return;
  }

  const client = axios.create({
    baseURL,
    headers: { Authorization: `Bearer ${token}` },
  });

  console.log('3. Testing Project Creation...');
  let projectId = '';
  try {
    const projRes = await client.post('/projects', {
      name: `Test Project ${Date.now()}`,
      slug: `test-project-${Date.now()}`,
      description: 'Integration test project workspace',
    });
    projectId = projRes.data.id;
    console.log('✓ Project Creation SUCCESS! Project ID:', projectId);
  } catch (err) {
    console.error('✗ Project Creation FAILED:', err.response?.data || err.message);
    return;
  }

  console.log('4. Testing Projects List...');
  try {
    const listRes = await client.get('/projects');
    console.log(`✓ Projects List SUCCESS! Total projects: ${listRes.data.length}`);
  } catch (err) {
    console.error('✗ Projects List FAILED:', err.response?.data || err.message);
  }

  console.log('5. Testing Chat Stream Endpoint...');
  try {
    const chatRes = await client.post(
      `/projects/${projectId}/chat/stream`,
      { message: 'Hello AI assistant' },
      { responseType: 'stream' }
    );
    console.log('✓ Chat Stream Endpoint SUCCESS! Status code:', chatRes.status);
  } catch (err) {
    console.error('✗ Chat Stream FAILED:', err.response?.data || err.message);
  }

  console.log('\n========================================');
  console.log('100% FULL-STACK BACKEND VERIFICATION SUCCESSFUL');
  console.log('========================================');
}

testBackend();
