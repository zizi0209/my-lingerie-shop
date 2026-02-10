/**
 * Phase 3 Rate Limiting Testing Script
 * Run: node test-phase3-rate-limiting.js
 */

const API_URL_PHASE3 = 'http://localhost:5000/api';

const phase3Colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m'
};

function log(message, color = phase3Colors.reset) {
  console.log(`${color}${message}${phase3Colors.reset}`);
}

function pass(test) {
  log(`✅ PASS: ${test}`, phase3Colors.green);
}

function fail(test, reason) {
  log(`❌ FAIL: ${test}`, phase3Colors.red);
  if (reason) log(`   Reason: ${reason}`, phase3Colors.yellow);
}

function info(message) {
  log(`ℹ️  ${message}`, phase3Colors.cyan);
}

async function request(endpoint, options = {}) {
  try {
    const response = await fetch(`${API_URL_PHASE3}${endpoint}`, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      body: options.body ? JSON.stringify(options.body) : undefined
    });

    const data = await response.json();
    return { 
      status: response.status, 
      data, 
      ok: response.ok,
      headers: {
        rateLimit: response.headers.get('ratelimit-limit'),
        rateLimitRemaining: response.headers.get('ratelimit-remaining'),
        rateLimitReset: response.headers.get('ratelimit-reset')
      }
    };
  } catch (error) {
    return { status: 0, data: { error: error.message }, ok: false, headers: {} };
  }
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function test1_LoginRateLimiting() {
  info('\n[TEST 1] Login Rate Limiting - Max 5 attempts per 15 minutes');

  const testEmail = `ratelimit_${Date.now()}@test.com`;
  
  // Create test user first
  const registerResult = await request('/users/register', {
    method: 'POST',
    body: {
      email: testEmail,
      password: 'Password123',
      name: 'Rate Limit Test'
    }
  });

  if (!registerResult.ok) {
    fail('Login Rate Limiting', 'Failed to create test user');
    return;
  }

  info(`Created test user: ${testEmail}`);
  info('Attempting 6 failed logins to trigger rate limit...');

  let rateLimitTriggered = false;
  
  for (let i = 1; i <= 6; i++) {
    const result = await request('/users/login', {
      method: 'POST',
      body: {
        email: testEmail,
        password: 'WrongPassword123'
      }
    });

    log(`  Attempt ${i}: Status ${result.status}`, colors.cyan);
    
    if (result.headers.rateLimitRemaining) {
      log(`    Rate Limit Remaining: ${result.headers.rateLimitRemaining}`, colors.yellow);
    }

    if (result.status === 429) {
      rateLimitTriggered = true;
      pass('Login Rate Limiting - Rate limit triggered at attempt ' + i);
      log(`    Response: ${result.data.error}`, colors.yellow);
      if (result.data.retryAfter) {
        log(`    Retry After: ${result.data.retryAfter} seconds`, colors.yellow);
      }
      break;
    }

    // Small delay between attempts
    await sleep(100);
  }

  if (!rateLimitTriggered) {
    fail('Login Rate Limiting', 'Rate limit was not triggered after 6 attempts');
  }
}

async function test2_RegisterRateLimiting() {
  info('\n[TEST 2] Register Rate Limiting - Max 3 registrations per hour');

  info('Attempting 4 registrations to trigger rate limit...');

  let rateLimitTriggered = false;
  
  for (let i = 1; i <= 4; i++) {
    const result = await request('/users/register', {
      method: 'POST',
      body: {
        email: `ratelimit_register_${Date.now()}_${i}@test.com`,
        password: 'Password123',
        name: `Test User ${i}`
      }
    });

    log(`  Attempt ${i}: Status ${result.status}`, colors.cyan);
    
    if (result.headers.rateLimitRemaining) {
      log(`    Rate Limit Remaining: ${result.headers.rateLimitRemaining}`, colors.yellow);
    }

    if (result.status === 429) {
      rateLimitTriggered = true;
      pass('Register Rate Limiting - Rate limit triggered at attempt ' + i);
      log(`    Response: ${result.data.error}`, colors.yellow);
      break;
    }

    // Small delay between attempts
    await sleep(100);
  }

  if (!rateLimitTriggered) {
    fail('Register Rate Limiting', 'Rate limit was not triggered after 4 attempts');
  }
}

async function test3_ApiRateLimiting() {
  info('\n[TEST 3] API Rate Limiting - Max 200 requests per minute');

  info('Testing general API rate limiting with health check endpoint...');

  // Get first request to check headers
  const firstResult = await request('/health');
  
  if (firstResult.ok) {
    pass('API Rate Limiting - API is accessible');
    
    if (firstResult.headers.rateLimit) {
      log(`  Rate Limit: ${firstResult.headers.rateLimit} requests per window`, colors.cyan);
      log(`  Remaining: ${firstResult.headers.rateLimitRemaining}`, colors.cyan);
      
      const resetTime = new Date(parseInt(firstResult.headers.rateLimitReset) * 1000);
      log(`  Resets at: ${resetTime.toLocaleTimeString()}`, colors.cyan);
      
      pass('API Rate Limiting - Rate limit headers present');
    } else {
      fail('API Rate Limiting', 'Rate limit headers not present');
    }
  } else {
    fail('API Rate Limiting', 'API health check failed');
  }
}

async function test4_RateLimitHeaders() {
  info('\n[TEST 4] Rate Limit Headers Verification');

  const result = await request('/users/register', {
    method: 'POST',
    body: {
      email: `headers_test_${Date.now()}@test.com`,
      password: 'Password123',
      name: 'Headers Test'
    }
  });

  const hasHeaders = 
    result.headers.rateLimit !== null ||
    result.headers.rateLimitRemaining !== null;

  if (hasHeaders) {
    pass('Rate Limit Headers - Headers are present in response');
    log(`  RateLimit-Limit: ${result.headers.rateLimit || 'N/A'}`, colors.cyan);
    log(`  RateLimit-Remaining: ${result.headers.rateLimitRemaining || 'N/A'}`, colors.cyan);
    log(`  RateLimit-Reset: ${result.headers.rateLimitReset || 'N/A'}`, colors.cyan);
  } else {
    fail('Rate Limit Headers', 'Rate limit headers missing');
  }
}

async function test5_ValidationSchemas() {
  info('\n[TEST 5] Extended Validation Schemas');

  // Test invalid order creation
  info('Testing invalid order schema (missing required fields)...');
  
  const invalidOrderResult = await request('/orders', {
    method: 'POST',
    body: {
      shippingAddress: 'Short',  // Too short
      items: []  // Empty array
    }
  });

  if (!invalidOrderResult.ok) {
    pass('Validation - Invalid order rejected');
    log(`  Error: ${invalidOrderResult.data.error}`, colors.yellow);
  } else {
    fail('Validation', 'Invalid order was accepted');
  }

  // Test invalid cart addition
  info('Testing invalid cart item (negative quantity)...');
  
  const invalidCartResult = await request('/carts/items', {
    method: 'POST',
    body: {
      productId: 1,
      quantity: -5  // Invalid negative quantity
    }
  });

  if (!invalidCartResult.ok) {
    pass('Validation - Invalid cart item rejected');
    log(`  Error: ${invalidCartResult.data.error}`, colors.yellow);
  } else {
    fail('Validation', 'Invalid cart item was accepted');
  }
}

async function runAllTests() {
  log('\n╔════════════════════════════════════════════════╗', colors.cyan);
  log('║     PHASE 3 RATE LIMITING TESTING             ║', colors.cyan);
  log('╚════════════════════════════════════════════════╝', colors.cyan);

  info('\nTesting rate limiting and validation features...\n');

  try {
    await test1_LoginRateLimiting();
    await test2_RegisterRateLimiting();
    await test3_ApiRateLimiting();
    await test4_RateLimitHeaders();
    await test5_ValidationSchemas();

    log('\n╔════════════════════════════════════════════════╗', colors.cyan);
    log('║     TESTING COMPLETE                          ║', colors.cyan);
    log('╚════════════════════════════════════════════════╝', colors.cyan);

    info('\n⚠️  Note: Rate limits are per IP address.');
    info('Wait for rate limit windows to expire before re-running tests:');
    info('  - Login: 15 minutes');
    info('  - Register: 1 hour');
    info('  - API: 1 minute');

  } catch (error) {
    fail('Test Suite', error.message);
    console.error(error);
  }
}

// Check if server is running
async function checkServer() {
  info('Checking if server is running...');
  try {
    const response = await fetch(`${API_URL_PHASE3}/health`);
    if (response.ok) {
      pass('Server is running');
      return true;
    }
    fail('Server Check', `Server returned status ${response.status}`);
    return false;
  } catch {
    fail('Server Check', 'Server is not running');
    log('\nPlease start the server first:', colors.yellow);
    log('  cd backend', colors.cyan);
    log('  npm run dev', colors.cyan);
    return false;
  }
}

// Run tests
checkServer().then(isRunning => {
  if (isRunning) {
    runAllTests();
  }
});
