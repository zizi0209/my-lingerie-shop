/**
 * Test Session Expiration Flow
 *
 * This script helps test the auto-logout flow when session expires.
 *
 * Instructions:
 * 1. Open browser console
 * 2. Login to the app
 * 3. Paste this script and run it
 * 4. You should see a toast notification and be logged out
 */

// Method 1: Simulate SESSION_EXPIRED by dispatching custom event
function testSessionExpired() {
  console.log('🧪 Testing session expired event...');

  window.dispatchEvent(new CustomEvent('session-expired', {
    detail: {
      message: 'SESSION_EXPIRED',
      reason: 'Manual test trigger'
    }
  }));

  console.log('✅ Session expired event dispatched');
  console.log('👀 Watch for:');
  console.log('   1. Toast notification: "Phiên đăng nhập đã hết hạn"');
  console.log('   2. Auto logout');
  console.log('   3. Redirect to home page');
}

// Method 2: Force token expiration by manipulating localStorage
function forceTokenExpiration() {
  console.log('🧪 Forcing token expiration...');

  // Set token expiry to past
  localStorage.setItem('tokenExpiresAt', String(Date.now() - 1000));

  console.log('✅ Token expiry time set to past');
  console.log('👀 Next API call will trigger auto-refresh → SESSION_EXPIRED');
}

// Method 3: Remove token to simulate 401 response
function simulateUnauthorized() {
  console.log('🧪 Simulating unauthorized access...');

  localStorage.removeItem('accessToken');
  localStorage.removeItem('tokenExpiresAt');

  console.log('✅ Access token removed');
  console.log('👀 Next protected API call will return 401 → SESSION_EXPIRED');
}

// Display menu
console.log(`
╔════════════════════════════════════════════╗
║   Session Expiration Test Suite           ║
╠════════════════════════════════════════════╣
║  Run these commands to test:              ║
║                                            ║
║  testSessionExpired()                      ║
║    → Directly trigger session expired      ║
║                                            ║
║  forceTokenExpiration()                    ║
║    → Make token expire on next API call    ║
║                                            ║
║  simulateUnauthorized()                    ║
║    → Remove token to trigger 401           ║
╚════════════════════════════════════════════╝
`);

// Make functions available globally
window.testSessionExpired = testSessionExpired;
window.forceTokenExpiration = forceTokenExpiration;
window.simulateUnauthorized = simulateUnauthorized;
