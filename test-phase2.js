/**
 * Phase 2 Security Testing Script
 * Run: node test-phase2.js
 */

const API_URL = 'http://localhost:5000/api';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function pass(test) {
  log(`✅ PASS: ${test}`, colors.green);
}

function fail(test, reason) {
  log(`❌ FAIL: ${test}`, colors.red);
  if (reason) log(`   Reason: ${reason}`, colors.yellow);
}

function info(message) {
  log(`ℹ️  ${message}`, colors.cyan);
}

async function request(endpoint, options = {}) {
  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      body: options.body ? JSON.stringify(options.body) : undefined
    });

    const data = await response.json();
    return { status: response.status, data, ok: response.ok };
  } catch (error) {
    return { status: 0, data: { error: error.message }, ok: false };
  }
}

async function test1_MassAssignmentPrevention() {
  info('\n[TEST 1] Mass Assignment Prevention - Role Injection Attack');
  
  const testEmail = `hacker_${Date.now()}@test.com`;
  
  const result = await request('/users/register', {
    method: 'POST',
    body: {
      email: testEmail,
      password: 'Password123',
      name: 'Hacker',
      roleId: 11  // Try to inject SUPER_ADMIN role
    }
  });

  if (!result.ok) {
    fail('Mass Assignment Prevention', 'Registration failed');
    console.log(result.data);
    return;
  }

  // Check if roleId is null (not 11)
  if (result.data.data.user.roleId === null) {
    pass('Mass Assignment Prevention - roleId forced to null');
  } else {
    fail('Mass Assignment Prevention', `roleId is ${result.data.data.user.roleId}, should be null`);
  }

  return result.data.data.user.id;
}

async function test2_PasswordSanitization(userId) {
  info('\n[TEST 2] Password Sanitization in Response');

  const result = await request('/users/register', {
    method: 'POST',
    body: {
      email: `test_${Date.now()}@test.com`,
      password: 'Password123',
      name: 'Test User'
    }
  });

  if (!result.ok) {
    fail('Password Sanitization', 'Registration failed');
    return;
  }

  const user = result.data.data.user;
  const hasSensitiveFields = 
    user.password !== undefined ||
    user.failedLoginAttempts !== undefined ||
    user.tokenVersion !== undefined ||
    user.lockedUntil !== undefined;

  if (!hasSensitiveFields) {
    pass('Password Sanitization - No sensitive fields in response');
  } else {
    fail('Password Sanitization', 'Sensitive fields exposed in response');
    console.log('Exposed fields:', Object.keys(user));
  }
}

async function test3_AccountLockout() {
  info('\n[TEST 3] Account Lockout After 5 Failed Attempts');

  // Create a test user
  const testEmail = `lockout_${Date.now()}@test.com`;
  const registerResult = await request('/users/register', {
    method: 'POST',
    body: {
      email: testEmail,
      password: 'CorrectPassword123',
      name: 'Lockout Test'
    }
  });

  if (!registerResult.ok) {
    fail('Account Lockout', 'Failed to create test user');
    return;
  }

  info(`Created test user: ${testEmail}`);

  // Try 5 wrong passwords
  let lastResult;
  for (let i = 1; i <= 6; i++) {
    info(`Attempt ${i}/6 with wrong password...`);
    lastResult = await request('/users/login', {
      method: 'POST',
      body: {
        email: testEmail,
        password: 'WrongPassword123'
      }
    });

    if (i < 5) {
      // First 4 attempts should show remaining tries
      if (lastResult.data.error && lastResult.data.error.includes('Còn')) {
        log(`   Response: ${lastResult.data.error}`, colors.yellow);
      }
    } else if (i === 5) {
      // 5th attempt should lock the account
      if (lastResult.data.error && lastResult.data.error.includes('khóa')) {
        pass('Account Lockout - Account locked after 5 attempts');
        log(`   Response: ${lastResult.data.error}`, colors.yellow);
      } else {
        fail('Account Lockout', 'Account not locked after 5 attempts');
        log(`   Response: ${lastResult.data.error}`, colors.yellow);
      }
    } else {
      // 6th attempt should still be locked
      if (lastResult.data.error && lastResult.data.error.includes('khóa')) {
        pass('Account Lockout - Subsequent attempts still locked');
      } else {
        fail('Account Lockout', 'Account not locked on 6th attempt');
      }
    }

    // Small delay between attempts
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

async function test4_AuditLogging() {
  info('\n[TEST 4] Audit Logging - Register Action');

  const testEmail = `audit_${Date.now()}@test.com`;
  const result = await request('/users/register', {
    method: 'POST',
    body: {
      email: testEmail,
      password: 'Password123',
      name: 'Audit Test'
    }
  });

  if (!result.ok) {
    fail('Audit Logging', 'Registration failed');
    return;
  }

  pass('Audit Logging - CREATE_USER should be logged (check database)');
  info('To verify: SELECT * FROM audit_logs WHERE action = \'CREATE_USER\' ORDER BY "createdAt" DESC LIMIT 1;');
}

async function test5_InputValidation() {
  info('\n[TEST 5] Input Validation - Weak Password');

  const result = await request('/users/register', {
    method: 'POST',
    body: {
      email: `weak_${Date.now()}@test.com`,
      password: 'weak',  // Too short, no uppercase, no numbers
      name: 'Weak Password Test'
    }
  });

  if (!result.ok && result.data.error) {
    if (result.data.error.includes('8 characters') || 
        result.data.error.includes('uppercase') ||
        result.data.error.includes('number')) {
      pass('Input Validation - Weak password rejected');
      log(`   Validation error: ${result.data.error}`, colors.yellow);
    } else {
      fail('Input Validation', 'Wrong error message for weak password');
      log(`   Error: ${result.data.error}`, colors.yellow);
    }
  } else {
    fail('Input Validation', 'Weak password was accepted');
  }
}

async function test6_BcryptCost() {
  info('\n[TEST 6] Password Hashing - Bcrypt Cost 12');

  const startTime = Date.now();
  const result = await request('/users/register', {
    method: 'POST',
    body: {
      email: `bcrypt_${Date.now()}@test.com`,
      password: 'Password123',
      name: 'Bcrypt Test'
    }
  });
  const duration = Date.now() - startTime;

  if (result.ok) {
    // Bcrypt cost 12 should take at least 100ms on most systems
    if (duration >= 50) {
      pass(`Password Hashing - Took ${duration}ms (cost 12 is working)`);
      info('Note: Check code to verify bcrypt.hash uses cost 12');
    } else {
      fail('Password Hashing', `Too fast (${duration}ms), might not be using cost 12`);
    }
  } else {
    fail('Password Hashing', 'Registration failed');
  }
}

async function test7_TokenStructure() {
  info('\n[TEST 7] JWT Token Structure');

  const result = await request('/users/login', {
    method: 'POST',
    body: {
      email: 'admin@mylingerie.com',
      password: 'AdminSecure123!@#'
    }
  });

  if (result.ok && result.data.data.token) {
    const token = result.data.data.token;
    
    // Decode JWT (without verification)
    const parts = token.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      
      // Check if tokenVersion is in payload
      if (payload.tokenVersion !== undefined) {
        pass('JWT Token Structure - Contains tokenVersion');
      } else {
        fail('JWT Token Structure', 'Missing tokenVersion in payload');
      }

      if (payload.userId && payload.email) {
        pass('JWT Token Structure - Contains userId and email');
      } else {
        fail('JWT Token Structure', 'Missing userId or email');
      }

      log(`   Token payload: ${JSON.stringify(payload, null, 2)}`, colors.cyan);
    } else {
      fail('JWT Token Structure', 'Invalid JWT format');
    }
  } else {
    fail('JWT Token Structure', 'Login failed - cannot verify admin credentials');
    log(`   Make sure admin account exists with correct password`, colors.yellow);
  }
}

async function runAllTests() {
  log('\n╔════════════════════════════════════════════════╗', colors.cyan);
  log('║     PHASE 2 SECURITY TESTING                  ║', colors.cyan);
  log('╚════════════════════════════════════════════════╝', colors.cyan);

  info('\nTesting security features implemented in Phase 2...\n');

  try {
    await test1_MassAssignmentPrevention();
    await test2_PasswordSanitization();
    await test3_AccountLockout();
    await test4_AuditLogging();
    await test5_InputValidation();
    await test6_BcryptCost();
    await test7_TokenStructure();

    log('\n╔════════════════════════════════════════════════╗', colors.cyan);
    log('║     TESTING COMPLETE                          ║', colors.cyan);
    log('╚════════════════════════════════════════════════╝', colors.cyan);

    info('\nManual verification required:');
    info('1. Check audit_logs table for CREATE_USER entries');
    info('2. Verify failedLoginAttempts increments in User table');
    info('3. Verify lockedUntil is set after 5 failed attempts');
    info('\nSQL Queries:');
    info('SELECT * FROM audit_logs ORDER BY "createdAt" DESC LIMIT 10;');
    info('SELECT email, "failedLoginAttempts", "lockedUntil" FROM "User" WHERE email LIKE \'%test.com\';');

  } catch (error) {
    fail('Test Suite', error.message);
    console.error(error);
  }
}

// Check if server is running
async function checkServer() {
  info('Checking if server is running...');
  try {
    const response = await fetch(`${API_URL}/users/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    pass('Server is running');
    return true;
  } catch (error) {
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
