// Banners API Testing Script
// Run this with: node test_banners.js
// Make sure your server is running first

import fetch from 'node-fetch';

const API_BASE = 'http://localhost:3000'; // Adjust port if different
let adminToken = '';
let testBannerId = '';

// Test configuration
const testConfig = {
  adminUser: {
    email: 'roosseltam@gmail.com', // Your admin email
    password: 'admin123' // Your admin password
  }
};

// Helper function to make API requests
async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json();
    
    console.log(`\n🔍 ${options.method || 'GET'} ${endpoint}`);
    console.log(`Status: ${response.status}`);
    console.log('Response:', JSON.stringify(data, null, 2));
    
    return { response, data };
  } catch (error) {
    console.error(`❌ Error calling ${endpoint}:`, error.message);
    return { error };
  }
}

// Test 1: Setup - Get admin token
async function setupTestData() {
  console.log('\n🚀 Setting up test data...');
  
  // Sign in admin
  const adminSigninResult = await apiRequest('/api/auth/signin', {
    method: 'POST',
    body: JSON.stringify(testConfig.adminUser)
  });
  
  if (adminSigninResult.data && adminSigninResult.data.token) {
    adminToken = adminSigninResult.data.token;
    console.log('✅ Admin authenticated');
  } else {
    console.log('❌ Failed to authenticate admin');
    return false;
  }
  
  return true;
}

// Test 2: Public endpoints
async function testPublicEndpoints() {
  console.log('\n📊 Testing Public Endpoints...');
  
  // Test get all active banners
  await apiRequest('/api/banners');
}

// Test 3: Admin endpoints
async function testAdminEndpoints() {
  console.log('\n👑 Testing Admin Endpoints...');
  
  if (!adminToken) {
    console.log('❌ No admin token available, skipping admin tests');
    return;
  }
  
  // Test get all banners (admin view)
  await apiRequest('/api/admin/banners', {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  
  // Test banner statistics
  await apiRequest('/api/admin/banners/stats', {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  
  // Test create banner
  const createResult = await apiRequest('/api/admin/banners', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${adminToken}` },
    body: JSON.stringify({
      title: 'Test Banner',
      subtitle: 'This is a test banner',
      description: 'Created by automated test script for validation purposes.',
      image_url: '/uploads/products/test-banner.jpg',
      button_text: 'Test Button',
      button_link: '/test-page',
      background_color: '#1a202c',
      text_color: '#ffffff',
      is_active: true
    })
  });
  
  if (createResult.data && createResult.data.data) {
    testBannerId = createResult.data.data.id;
    console.log('✅ Test banner created with ID:', testBannerId);
  }
  
  // Test update banner (if we have one)
  if (testBannerId) {
    await apiRequest(`/api/admin/banners/${testBannerId}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({
        title: 'Updated Test Banner',
        subtitle: 'This banner has been updated',
        description: 'Updated description for testing purposes.',
        image_url: '/uploads/products/test-banner-updated.jpg',
        button_text: 'Updated Button',
        button_link: '/updated-page',
        background_color: '#e53e3e',
        text_color: '#ffffff',
        is_active: true
      })
    });
    
    // Test update banner status
    await apiRequest(`/api/admin/banners/${testBannerId}/status`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({
        is_active: false
      })
    });
    
    // Reactivate for further tests
    await apiRequest(`/api/admin/banners/${testBannerId}/status`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({
        is_active: true
      })
    });
  }
  
  // Test reorder banners (if we have banners)
  const bannersResult = await apiRequest('/api/admin/banners?limit=5', {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  
  if (bannersResult.data && bannersResult.data.data.length > 0) {
    const banners = bannersResult.data.data.map((banner, index) => ({
      id: banner.id,
      display_order: index + 1
    }));
    
    await apiRequest('/api/admin/banners/reorder', {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({ banners })
    });
  }
}

// Test 4: Error handling
async function testErrorHandling() {
  console.log('\n🚨 Testing Error Handling...');
  
  // Test unauthorized access
  await apiRequest('/api/admin/banners');
  
  // Test invalid banner creation
  if (adminToken) {
    await apiRequest('/api/admin/banners', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({
        // Missing required title and image_url
        subtitle: 'Invalid banner test'
      })
    });
  }
  
  // Test invalid banner ID
  if (adminToken) {
    await apiRequest('/api/admin/banners/invalid-uuid', {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({
        title: 'Test',
        image_url: '/test.jpg'
      })
    });
  }
  
  // Test invalid status update
  if (adminToken && testBannerId) {
    await apiRequest(`/api/admin/banners/${testBannerId}/status`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({
        is_active: 'invalid-boolean' // Should be boolean
      })
    });
  }
}

// Test 5: Image upload simulation
async function testImageUpload() {
  console.log('\n📷 Testing Image Upload...');
  
  if (!adminToken) {
    console.log('❌ No admin token available, skipping image upload test');
    return;
  }
  
  // Note: This is a simulated test since we don't have actual image files
  // In a real scenario, you would use FormData with actual image files
  console.log('ℹ️  Image upload test requires actual image files');
  console.log('ℹ️  Use the following curl command to test image upload:');
  console.log(`curl -X POST ${API_BASE}/api/admin/banners/upload-image \\`);
  console.log(`  -H "Authorization: Bearer ${adminToken}" \\`);
  console.log(`  -F "image=@/path/to/your/image.jpg"`);
}

// Test 6: Verify final state
async function verifyFinalState() {
  console.log('\n✅ Verifying Final State...');
  
  // Check public banners include our test banner
  await apiRequest('/api/banners');
  
  // Check admin view
  if (adminToken) {
    await apiRequest('/api/admin/banners', {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
  }
}

// Test 7: Cleanup
async function cleanup() {
  console.log('\n🧹 Cleaning up test data...');
  
  if (adminToken && testBannerId) {
    await apiRequest(`/api/admin/banners/${testBannerId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    console.log('✅ Test banner deleted');
  }
}

// Main test runner
async function runAllTests() {
  console.log('🧪 Starting Banners API Tests...');
  console.log('=====================================');
  
  try {
    const setupSuccess = await setupTestData();
    if (!setupSuccess) {
      console.log('❌ Setup failed, aborting tests');
      return;
    }
    
    await testPublicEndpoints();
    await testAdminEndpoints();
    await testErrorHandling();
    await testImageUpload();
    await verifyFinalState();
    await cleanup();
    
    console.log('\n🎉 All banner tests completed!');
    console.log('=====================================');
    console.log('Check the output above for any errors or issues.');
    console.log('If all endpoints returned expected responses, your banners API is working correctly!');
    
  } catch (error) {
    console.error('\n❌ Test suite failed:', error);
  }
}

// Check if fetch is available (for Node.js compatibility)
if (typeof fetch === 'undefined') {
  console.log('❌ This test requires node-fetch. Install it with: npm install node-fetch');
  console.log('Or run individual tests using a tool like Postman or curl');
} else {
  runAllTests();
}

export { runAllTests };
