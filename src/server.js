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
    await redis.connect();
    console.log('Redis connected');

    console.log('Starting HTTP server...');
    const server = app.listen(PORT, () => {
      logger.info(`Backend running on port ${PORT}`);
      console.log(`Server is running on port ${PORT}`);
    });

    server.on('error', (error) => {
      console.error('Server error:', error);
      logger.error('Server error', error);
    });

    server.on('listening', () => {
      console.log('Server is now listening');
    });
  } catch (error) {
    console.error('Server startup error:', error);
    logger.error('Failed to start server', error);
    process.exit(1);
  }
})();
