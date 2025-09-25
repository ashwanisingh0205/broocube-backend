// src/controllers/adminController.js
const User = require('../models/User');
const Campaign = require('../models/Campaign');
const Bid = require('../models/Bid');
const Analytics = require('../models/Analytics');
const logger = require('../utils/logger');
const { HTTP_STATUS } = require('../utils/constants');
const { asyncHandler } = require('../middlewares/errorHandler');

const dashboardStats = asyncHandler(async (req, res) => {
  const [users, campaigns, bids, analytics] = await Promise.all([
    User.countDocuments(),
    Campaign.countDocuments(),
    Bid.countDocuments(),
    Analytics.countDocuments()
  ]);

  res.json({
    success: true,
    data: { users, campaigns, bids, analytics }
  });
});

const listUsers = asyncHandler(async (req, res) => {
  const { role, active } = req.query;
  const filter = {};
  if (role) filter.role = role;
  if (active !== undefined) filter.isActive = active === 'true';

  const users = await User.find(filter).select('-password');
  res.json({ success: true, data: { users } });
});

const toggleUserActive = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = await User.findById(id);
  if (!user) return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: 'User not found' });
  user.isActive = !user.isActive;
  await user.save();
  res.json({ success: true, data: { user } });
});

const listCampaigns = asyncHandler(async (req, res) => {
  const campaigns = await Campaign.find({}).populate('brand_id', 'name email');
  res.json({ success: true, data: { campaigns } });
});

const getLogs = asyncHandler(async (req, res) => {
  // In real systems, stream or read from log storage
  res.json({ success: true, data: { message: 'Logs endpoint placeholder' } });
});

module.exports = {
  dashboardStats,
  listUsers,
  toggleUserActive,
  listCampaigns,
  getLogs
};


