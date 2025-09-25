// src/jobs/cleanup.js
const AIResults = require('../models/AI_Results');
const logger = require('../utils/logger');

async function cleanup() {
  try {
    const res = await AIResults.cleanupExpired();
    logger.info('Cleanup job executed', { matched: res.matchedCount, modified: res.modifiedCount });
  } catch (e) {
    logger.error('Cleanup job failed', e);
  }
}

module.exports = cleanup;


