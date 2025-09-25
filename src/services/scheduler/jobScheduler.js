// src/services/scheduler/jobScheduler.js
const cron = require('node-cron');
const logger = require('../../utils/logger');
const { CRON_SCHEDULES } = require('../../utils/constants');
const Analytics = require('../../models/Analytics');
const AIResults = require('../../models/AI_Results');

const jobs = [];

function scheduleJobs() {
  // Analytics sync placeholder
  jobs.push(cron.schedule(CRON_SCHEDULES.ANALYTICS_SYNC, async () => {
    logger.info('Running scheduled analytics sync');
    // TODO: Pull latest metrics from social APIs
  }));

  // Cleanup expired AI results
  jobs.push(cron.schedule(CRON_SCHEDULES.CLEANUP_EXPIRED_TOKENS, async () => {
    logger.info('Running cleanup for expired AI results');
    await AIResults.cleanupExpired();
  }));

  logger.info('Cron jobs scheduled');
}

function stopJobs() {
  jobs.forEach(job => job.stop());
  logger.info('Cron jobs stopped');
}

module.exports = { scheduleJobs, stopJobs };


