import { config } from 'dotenv';
import { resolve } from 'path';

// Try loading from different paths
const paths = [
  resolve(__dirname, '.env'),
  resolve(__dirname, '../.env'),
  resolve(process.cwd(), '.env'),
];

for (const p of paths) {
  console.log(`\nTrying: ${p}`);
  const result = config({ path: p, override: true });
  if (result.error) {
    console.log('  Error:', result.error.message);
  } else {
    console.log('  Loaded:', Object.keys(result.parsed || {}).length, 'vars');
  }
}

console.log('\n=== R2 Config ===');
console.log('R2_ACCOUNT_ID:', process.env.R2_ACCOUNT_ID ? 'SET' : 'NOT SET');
console.log('R2_ACCESS_KEY_ID:', process.env.R2_ACCESS_KEY_ID ? 'SET' : 'NOT SET');
console.log('R2_SECRET_ACCESS_KEY:', process.env.R2_SECRET_ACCESS_KEY ? 'SET (' + process.env.R2_SECRET_ACCESS_KEY?.substring(0, 5) + '...)' : 'NOT SET');
console.log('R2_BUCKET:', process.env.R2_BUCKET || 'NOT SET');
console.log('R2_PUBLIC_URL:', process.env.R2_PUBLIC_URL || 'NOT SET');
