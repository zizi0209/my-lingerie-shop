/**
 * Verify NextAuth configuration is valid
 * Run: node verify-nextauth-config.js
 */

console.log('🔍 Verifying NextAuth configuration...\n');

// Check 1: Environment variables
console.log('1. Checking environment variables:');
const fs = require('fs');
const envPath = './frontend/.env.local';

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  
  const requiredVars = [
    'AUTH_SECRET',
    'NEXTAUTH_URL',
    'DATABASE_URL',
    'NEXT_PUBLIC_API_URL',
  ];

  const optionalVars = [
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'GITHUB_CLIENT_ID',
    'GITHUB_CLIENT_SECRET',
  ];

  requiredVars.forEach(varName => {
    if (envContent.includes(`${varName}=`) && !envContent.includes(`${varName}=your-`)) {
      console.log(`   ✅ ${varName} is set`);
    } else {
      console.log(`   ❌ ${varName} is MISSING or has placeholder value`);
    }
  });

  console.log('\n   Optional (for social login):');
  let hasOAuth = false;
  optionalVars.forEach(varName => {
    if (envContent.includes(`${varName}=`) && !envContent.includes(`${varName}=your-`)) {
      console.log(`   ✅ ${varName} is set`);
      hasOAuth = true;
    } else {
      console.log(`   ⚠️  ${varName} is not set (social login will not work)`);
    }
  });

  if (!hasOAuth) {
    console.log('\n   ℹ️  To enable social login, follow: docs/OAUTH_SETUP.md');
  }
} else {
  console.log('   ❌ .env.local not found!');
}

// Check 2: File structure
console.log('\n2. Checking NextAuth files:');
const requiredFiles = [
  'frontend/src/auth.ts',
  'frontend/src/auth.config.ts',
  'frontend/src/app/api/auth/[...nextauth]/route.ts',
  'frontend/src/types/next-auth.d.ts',
];

requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`   ✅ ${file}`);
  } else {
    console.log(`   ❌ ${file} is MISSING`);
  }
});

// Check 3: Verify exports in auth.ts
console.log('\n3. Checking auth.ts exports:');
const authTsPath = 'frontend/src/auth.ts';
if (fs.existsSync(authTsPath)) {
  const authContent = fs.readFileSync(authTsPath, 'utf8');
  
  if (authContent.includes('export { handlers')) {
    console.log('   ✅ handlers exported correctly');
  } else {
    console.log('   ❌ handlers export is missing or incorrect');
  }

  if (authContent.includes('export { handlers, auth, signIn, signOut }')) {
    console.log('   ✅ All exports present (handlers, auth, signIn, signOut)');
  } else {
    console.log('   ⚠️  Some exports may be missing');
  }
}

// Check 4: Database migration
console.log('\n4. Checking database migration:');
const migrationPath = 'backend/prisma/migrations/20260122_add_social_auth_models/migration.sql';
if (fs.existsSync(migrationPath)) {
  console.log('   ✅ Migration file exists');
  console.log('   ℹ️  Verify migration applied: cd backend && npx prisma migrate status');
} else {
  console.log('   ❌ Migration file not found');
}

console.log('\n' + '='.repeat(60));
console.log('📝 Summary:');
console.log('='.repeat(60));
console.log('\nIf all checks passed, you can:');
console.log('1. Stop frontend server (Ctrl+C)');
console.log('2. Restart: cd frontend && npm run dev');
console.log('3. Test login at: http://localhost:3000/login-register');
console.log('\nIf you see build errors, check:');
console.log('- All required env vars are set');
console.log('- auth.ts exports are correct');
console.log('- No TypeScript errors in auth files');
