// src/services/notifier/push.js
const axios = require('axios');
const config = require('../../config/env');
const logger = require('../../utils/logger');

async function sendPush(to, title, body, data = {}) {
  if (!config.PUSH_NOTIFICATION_SERVICE_URL) {
    logger.warn('Push notification service URL not configured');
    return { success: false, message: 'Push service not configured' };
  }

  const res = await axios.post(config.PUSH_NOTIFICATION_SERVICE_URL, {
    to, title, body, data
  }, {
    headers: { 'x-api-key': config.PUSH_NOTIFICATION_API_KEY || '' }
  });
  logger.info('Push notification sent', { to, status: res.status });
  return res.data;
}

module.exports = { sendPush };


