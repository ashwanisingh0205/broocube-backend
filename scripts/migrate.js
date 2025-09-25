// scripts/migrate.js
require('dotenv').config();
const connectDB = require('../src/config/db');

(async () => {
  await connectDB();
  console.log('No migrations to run (using Mongoose schemas).');
  process.exit(0);
})();


