// src/controllers/analyticsController.js
const Analytics = require('../models/Analytics');
const { HTTP_STATUS } = require('../utils/constants');
const { asyncHandler } = require('../middlewares/errorHandler');

// Create analytics record (admin/system)
const createAnalytics = asyncHandler(async (req, res) => {
  const analytics = new Analytics(req.body);
  await analytics.save();
  res.status(HTTP_STATUS.CREATED).json({ success: true, data: { analytics } });
});

// Get analytics by user
const getUserAnalytics = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { platform } = req.query;
  const records = await Analytics.findByUser(userId, platform);
  res.json({ success: true, data: { analytics: records } });
});

// Get top performing posts
const getTopPerforming = asyncHandler(async (req, res) => {
  const { limit = 10 } = req.query;
  const top = await Analytics.findTopPerforming(parseInt(limit));
  res.json({ success: true, data: { posts: top } });
});

// Get platform stats
const getPlatformStats = asyncHandler(async (req, res) => {
  const { platform } = req.params;
  const stats = await Analytics.getPlatformStats(platform);
  res.json({ success: true, data: { stats: stats?.[0] || {} } });
});

module.exports = {
  createAnalytics,
  getUserAnalytics,
  getTopPerforming,
  getPlatformStats
};


