// src/server.js
const app = require("./app");
const connectDB = require("./config/db");
const config = require("./config/env");
const logger = require("./utils/logger");
const redis = require("./config/redis");

const PORT = config.PORT || 5000;

(async () => {
  try {
    await connectDB();
    await redis.connect();

    app.listen(PORT, () => {
      logger.info(`Backend running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
})();
