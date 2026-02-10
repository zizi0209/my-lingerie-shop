const http = require('http');

async function testLogin() {
  try {
    console.log('\n🧪 Testing admin login endpoints...\n');

    const testData = JSON.stringify({
      email: 'admin@mylingerie.com',
      password: 'AdminSecure123!@#'
    });

    // Test 1: /api/auth/login
    console.log('Test 1: POST /api/auth/login');
    const options1 = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': testData.length
      }
    };

    const req1 = http.request(options1, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode === 200) {
            console.log('   ✅ SUCCESS');
            console.log('   Token:', parsed.data?.token?.substring(0, 50) + '...');
            console.log('   User:', parsed.data?.user?.email);
            console.log('   Role:', parsed.data?.user?.role?.name);
          } else {
            console.log('   ❌ FAILED:', parsed.error || data);
          }
        } catch {
          console.log('   ❌ PARSE ERROR:', data.substring(0, 200));
        }
        testUsersLogin();
      });
    });

    req1.on('error', (e) => {
      console.log('   ❌ REQUEST ERROR:', e.message);
      testUsersLogin();
    });

    req1.write(testData);
    req1.end();

    function testUsersLogin() {
      // Test 2: /api/users/login
      console.log('\nTest 2: POST /api/users/login');
      const options2 = {
        hostname: 'localhost',
        port: 5000,
        path: '/api/users/login',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': testData.length
        }
      };

      const req2 = http.request(options2, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (res.statusCode === 200) {
              console.log('   ✅ SUCCESS');
              console.log('   Token:', parsed.data?.token?.substring(0, 50) + '...');
              console.log('   User:', parsed.data?.user?.email);
              console.log('   Role:', parsed.data?.user?.role?.name);
            } else {
              console.log('   ❌ FAILED:', parsed.error || data);
            }
          } catch {
            console.log('   ❌ PARSE ERROR:', data.substring(0, 200));
          }
        });
      });

      req2.on('error', (e) => {
        console.log('   ❌ REQUEST ERROR:', e.message);
      });

      req2.write(testData);
      req2.end();
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testLogin();
