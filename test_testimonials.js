// Testimonials API Testing Script
// Run this with: node test_testimonials.js
// Make sure your server is running first

import fetch from 'node-fetch';

const API_BASE = 'http://localhost:3000'; // Adjust port if different
let authToken = '';
let adminToken = '';
let testUserId = '';
let testProductId = '';
let testTestimonialId = '';

// Test configuration
const testConfig = {
  testUser: {
    email: 'testuser@example.com',
    password: 'testpass123',
    firstName: 'Test',
    lastName: 'User'
  },
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

// Test 1: Setup - Create test user and get tokens
async function setupTestData() {
  console.log('\n🚀 Setting up test data...');
  
  // Create test user
  const signupResult = await apiRequest('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify(testConfig.testUser)
  });
  
  if (signupResult.data && signupResult.data.token) {
    authToken = signupResult.data.token;
    testUserId = signupResult.data.user.id;
    console.log('✅ Test user created and authenticated');
  } else {
    // Try to sign in if user already exists
    const signinResult = await apiRequest('/api/auth/signin', {
      method: 'POST',
      body: JSON.stringify({
        email: testConfig.testUser.email,
        password: testConfig.testUser.password
      })
    });
    
    if (signinResult.data && signinResult.data.token) {
      authToken = signinResult.data.token;
      testUserId = signinResult.data.user.id;
      console.log('✅ Test user signed in');
    }
  }
  
  // Sign in admin
  const adminSigninResult = await apiRequest('/api/auth/signin', {
    method: 'POST',
    body: JSON.stringify(testConfig.adminUser)
  });
  
  if (adminSigninResult.data && adminSigninResult.data.token) {
    adminToken = adminSigninResult.data.token;
    console.log('✅ Admin authenticated');
  }
  
  // Get a test product ID
  const productsResult = await apiRequest('/api/products');
  if (productsResult.data && productsResult.data.data.length > 0) {
    testProductId = productsResult.data.data[0].id;
    console.log('✅ Test product ID obtained');
  }
}

// Test 2: Public endpoints
async function testPublicEndpoints() {
  console.log('\n📊 Testing Public Endpoints...');
  
  // Test get all testimonials
  await apiRequest('/api/testimonials?limit=5');
  
  // Test get testimonial stats
  await apiRequest('/api/testimonials/stats');
  
  // Test product-specific testimonials (if we have a product)
  if (testProductId) {
    await apiRequest(`/api/products/${testProductId}/testimonials`);
  }
}

// Test 3: User endpoints
async function testUserEndpoints() {
  console.log('\n👤 Testing User Endpoints...');
  
  if (!authToken) {
    console.log('❌ No auth token available, skipping user tests');
    return;
  }
  
  // Test submit testimonial (general)
  const generalTestimonial = await apiRequest('/api/testimonials', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${authToken}` },
    body: JSON.stringify({
      title: 'Great shopping experience!',
      message: 'Really love shopping here. Fast delivery and excellent customer service.',
      rating: 5
    })
  });
  
  // Test submit product-specific testimonial
  if (testProductId) {
    const productTestimonial = await apiRequest('/api/testimonials', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${authToken}` },
      body: JSON.stringify({
        title: 'Amazing product quality',
        message: 'This product exceeded my expectations. Highly recommended!',
        rating: 5,
        product_id: testProductId
      })
    });
    
    if (productTestimonial.data && productTestimonial.data.data) {
      testTestimonialId = productTestimonial.data.data.id;
    }
  }
  
  // Test get user's own testimonials
  await apiRequest('/api/user/testimonials', {
    headers: { 'Authorization': `Bearer ${authToken}` }
  });
  
  // Test update testimonial (if we have one)
  if (testTestimonialId) {
    await apiRequest(`/api/user/testimonials/${testTestimonialId}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${authToken}` },
      body: JSON.stringify({
        title: 'Updated: Amazing product quality',
        rating: 4
      })
    });
  }
}

// Test 4: Admin endpoints
async function testAdminEndpoints() {
  console.log('\n👑 Testing Admin Endpoints...');
  
  if (!adminToken) {
    console.log('❌ No admin token available, skipping admin tests');
    return;
  }
  
  // Test get all testimonials (admin view)
  await apiRequest('/api/admin/testimonials?limit=10', {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  
  // Test admin dashboard stats
  await apiRequest('/api/admin/testimonials/dashboard', {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  
  // Test approve testimonial (if we have one)
  if (testTestimonialId) {
    await apiRequest(`/api/admin/testimonials/${testTestimonialId}/status`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({
        status: 'approved',
        admin_notes: 'Great review, approved!'
      })
    });
    
    // Test toggle featured status
    await apiRequest(`/api/admin/testimonials/${testTestimonialId}/featured`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({
        is_featured: true
      })
    });
  }
  
  // Test search functionality
  await apiRequest('/api/admin/testimonials?search=amazing&status=approved', {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
}

// Test 5: Error handling
async function testErrorHandling() {
  console.log('\n🚨 Testing Error Handling...');
  
  // Test unauthorized access
  await apiRequest('/api/admin/testimonials');
  
  // Test invalid rating
  if (authToken) {
    await apiRequest('/api/testimonials', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${authToken}` },
      body: JSON.stringify({
        title: 'Invalid rating test',
        message: 'This should fail',
        rating: 6 // Invalid rating
      })
    });
  }
  
  // Test missing required fields
  if (authToken) {
    await apiRequest('/api/testimonials', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${authToken}` },
      body: JSON.stringify({
        title: 'Missing message test'
        // Missing message and rating
      })
    });
  }
}

// Test 6: Verify final state
async function verifyFinalState() {
  console.log('\n✅ Verifying Final State...');
  
  // Check public testimonials now include our approved one
  await apiRequest('/api/testimonials?limit=5');
  
  // Check stats
  await apiRequest('/api/testimonials/stats');
  
  // Check product testimonials if we have a product
  if (testProductId) {
    await apiRequest(`/api/products/${testProductId}/testimonials`);
  }
}

// Main test runner
async function runAllTests() {
  console.log('🧪 Starting Testimonials API Tests...');
  console.log('=====================================');
  
  try {
    await setupTestData();
    await testPublicEndpoints();
    await testUserEndpoints();
    await testAdminEndpoints();
    await testErrorHandling();
    await verifyFinalState();
    
    console.log('\n🎉 All tests completed!');
    console.log('=====================================');
    console.log('Check the output above for any errors or issues.');
    console.log('If all endpoints returned expected responses, your testimonials API is working correctly!');
    
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
