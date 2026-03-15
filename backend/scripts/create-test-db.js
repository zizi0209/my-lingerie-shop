const { Client } = require('pg');

const connectionString = process.argv[2];
const dbName = process.argv[3];

if (!connectionString || !dbName) {
  console.error('Usage: node scripts/create-test-db.js <connectionString> <dbName>');
  process.exit(1);
}

const client = new Client({ connectionString });

client
  .connect()
  .then(() => client.query("SELECT 1 FROM pg_database WHERE datname = $1", [dbName]))
  .then((result) => {
    if (result.rowCount === 0) {
      return client.query(`CREATE DATABASE ${dbName}`);
    }
    return null;
  })
  .then(() => client.end())
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
