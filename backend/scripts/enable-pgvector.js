const { Client } = require('pg');

const connectionString = process.argv[2] || process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL is required');
  process.exit(1);
}

const client = new Client({ connectionString });

client
  .connect()
  .then(() => client.query('CREATE EXTENSION IF NOT EXISTS vector;'))
  .then(() => client.end())
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
