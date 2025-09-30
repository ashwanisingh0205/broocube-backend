// src/server.js
const app = require("./app");
const connectDB = require("./config/db");
const config = require("./config/env");
const logger = require("./utils/logger");
const redis = require("./config/redis");

const PORT = config.PORT || 5000;

(async () => {
  try {
    console.log('Starting server...');
    await connectDB();
    console.log('Database connected');
    
    // Try to connect to Redis, but don't fail if it's not available
    try {
      await redis.connect();
      console.log('Redis connected');
    } catch (error) {
      console.log('Redis connection failed, continuing without Redis:', error.message);
    }

    console.log('Starting HTTP server...');
    const server = app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });

    server.on('error', (error) => {
      console.error('Server error:', error);
    });

    server.on('listening', () => {
      console.log('Server is now listening');
    });
  } catch (error) {
    console.error('Server startup error:', error);
    process.exit(1);
  }
})();
