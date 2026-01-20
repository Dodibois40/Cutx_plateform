/**
 * Debug script to test Clerk token verification
 */

const { verifyToken } = require('@clerk/backend');
require('dotenv').config();

async function main() {
  const secretKey = process.env.CLERK_SECRET_KEY;

  console.log('=== CLERK TOKEN DEBUG ===\n');
  console.log('CLERK_SECRET_KEY exists:', !!secretKey);
  console.log('CLERK_SECRET_KEY prefix:', secretKey ? secretKey.substring(0, 15) + '...' : 'N/A');

  // Test token (you would replace this with an actual token from the browser)
  const testToken = process.argv[2];

  if (!testToken) {
    console.log('\nUsage: node scripts/debug-clerk-token.js <token>');
    console.log('\nTo get a token, open browser console and run:');
    console.log("  await window.Clerk.session.getToken()");
    return;
  }

  console.log('\nToken prefix:', testToken.substring(0, 30) + '...');
  console.log('Token length:', testToken.length);

  try {
    console.log('\nVerifying token...');
    const payload = await verifyToken(testToken, {
      secretKey: secretKey,
    });

    console.log('\n✅ Token verified successfully!');
    console.log('Payload:');
    console.log('  - sub (clerkId):', payload.sub);
    console.log('  - email:', payload.email);
    console.log('  - first_name:', payload.first_name);
    console.log('  - last_name:', payload.last_name);
    console.log('  - exp:', new Date(payload.exp * 1000).toISOString());
    console.log('  - iat:', new Date(payload.iat * 1000).toISOString());
  } catch (error) {
    console.log('\n❌ Token verification FAILED!');
    console.log('Error:', error.message);
    console.log('Error code:', error.code);
    console.log('Full error:', JSON.stringify(error, null, 2));
  }
}

main().catch(console.error);
