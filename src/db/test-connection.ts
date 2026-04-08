import { testConnection } from './database';

async function main() {
  console.log('Testing database connection...');
  const success = await testConnection();
  if (success) {
    console.log('✅ MySQL connection is working!');
    process.exit(0);
  } else {
    console.log('❌ Failed to connect to MySQL');
    process.exit(1);
  }
}

main();
