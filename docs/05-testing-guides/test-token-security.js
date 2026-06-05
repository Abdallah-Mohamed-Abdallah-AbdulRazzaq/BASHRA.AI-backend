const axios = require('axios');

// Test configuration
const BASE_URL = 'http://localhost:3006/api';
const TEST_USER = {
  email: 'test@example.com',
  password: 'TestPassword123!',
  entityType: 'user'
};

let authTokens = {};

async function testTokenSecurity() {
  console.log('🔐 Starting Token Security Test...\n');

  try {
    // Step 1: Login and get tokens
    console.log('1️⃣ Testing Login...');
    const loginResponse = await axios.post(`${BASE_URL}/auth-user/login`, {
      email: TEST_USER.email,
      password: TEST_USER.password,
      entityType: TEST_USER.entityType
    });

    if (loginResponse.data.success) {
      authTokens = loginResponse.data.tokens;
      console.log('✅ Login successful');
      console.log(`   Access Token: ${authTokens.accessToken.substring(0, 20)}...`);
      console.log(`   Refresh Token: ${authTokens.refreshToken.substring(0, 20)}...`);
      console.log(`   Session Token: ${authTokens.sessionToken.substring(0, 20)}...\n`);
    } else {
      console.log('❌ Login failed:', loginResponse.data.message_en);
      return;
    }

    // Step 2: Test access with valid token
    console.log('2️⃣ Testing API access with valid token...');
    try {
      const protectedResponse = await axios.get(`${BASE_URL}/auth-user/profile`, {
        headers: {
          'Authorization': `Bearer ${authTokens.accessToken}`,
          'X-Session-Token': authTokens.sessionToken
        }
      });
      console.log('✅ Protected route accessible with valid token\n');
    } catch (error) {
      console.log('❌ Protected route failed with valid token:', error.response?.data?.error || error.message);
    }

    // Step 3: Logout
    console.log('3️⃣ Testing Logout...');
    const logoutResponse = await axios.post(`${BASE_URL}/auth-user/logout`, {
      sessionToken: authTokens.sessionToken
    }, {
      headers: {
        'Authorization': `Bearer ${authTokens.accessToken}`,
        'X-Session-Token': authTokens.sessionToken
      }
    });

    if (logoutResponse.data.success) {
      console.log('✅ Logout successful');
      console.log(`   Tokens Revoked: ${logoutResponse.data.tokensRevoked || 'N/A'}`);
      console.log(`   Sessions Ended: ${logoutResponse.data.sessionsEnded || 'N/A'}\n`);
    } else {
      console.log('❌ Logout failed:', logoutResponse.data.message_en);
    }

    // Step 4: Test access with revoked token (This should fail)
    console.log('4️⃣ Testing API access with revoked token (should fail)...');
    try {
      const protectedResponse = await axios.get(`${BASE_URL}/auth-user/profile`, {
        headers: {
          'Authorization': `Bearer ${authTokens.accessToken}`,
          'X-Session-Token': authTokens.sessionToken
        }
      });
      console.log('❌ SECURITY ISSUE: Protected route still accessible with revoked token!');
      console.log('   Response:', protectedResponse.data);
    } catch (error) {
      if (error.response?.status === 403 || error.response?.status === 401) {
        console.log('✅ SECURITY OK: Protected route correctly blocked revoked token');
        console.log(`   Status: ${error.response.status}`);
        console.log(`   Error: ${error.response.data?.error || error.message}\n`);
      } else {
        console.log('❌ Unexpected error:', error.response?.data?.error || error.message);
      }
    }

    // Step 5: Test refresh token (This should also fail)
    console.log('5️⃣ Testing refresh token after logout (should fail)...');
    try {
      const refreshResponse = await axios.post(`${BASE_URL}/auth-user/refresh-token`, {
        refreshToken: authTokens.refreshToken
      });
      console.log('❌ SECURITY ISSUE: Refresh token still works after logout!');
      console.log('   Response:', refreshResponse.data);
    } catch (error) {
      if (error.response?.status === 403 || error.response?.status === 401) {
        console.log('✅ SECURITY OK: Refresh token correctly rejected after logout');
        console.log(`   Status: ${error.response.status}`);
        console.log(`   Error: ${error.response.data?.error || error.message}\n`);
      } else {
        console.log('❌ Unexpected error:', error.response?.data?.error || error.message);
      }
    }

    console.log('🎉 Token Security Test Completed!\n');

  } catch (error) {
    console.error('❌ Test failed with error:', error.response?.data || error.message);
  }
}

// Run the test
testTokenSecurity();
