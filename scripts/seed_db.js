// scripts/seed_db.js
require('dotenv').config();
const connectDB = require('../src/config/db');
const User = require('../src/models/User');
const Campaign = require('../src/models/Campaign');

(async () => {
  await connectDB();
  await User.deleteMany({});
  await Campaign.deleteMany({});

  const admin = await User.create({ name: 'Admin', email: 'admin@bloocube.com', password: 'Password@123', role: 'admin' });
  const brand = await User.create({ name: 'Brand', email: 'brand@bloocube.com', password: 'Password@123', role: 'brand' });
  const creator = await User.create({ name: 'Creator', email: 'creator@bloocube.com', password: 'Password@123', role: 'creator' });

  console.log('Seeded users:', { admin: admin._id, brand: brand._id, creator: creator._id });
  process.exit(0);
})();


