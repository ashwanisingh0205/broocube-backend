// src/routes/bid.routes.js
const router = require('express').Router();
const { authenticate, authorize } = require('../middlewares/auth');
const { validateWithJoi, bidValidation } = require('../utils/validator');
const { bidLimiter } = require('../middlewares/rateLimiter');
const ctrl = require('../controllers/bidController');

// Create bid (creator only)
router.post('/', authenticate, authorize('creator', 'admin'), bidLimiter, validateWithJoi(bidValidation.create), ctrl.createBid);

// List bids (creator sees own, admin sees all)
router.get('/', authenticate, ctrl.getBids);

// Bid details
router.get('/:id', authenticate, ctrl.getBid);

// Update bid (creator)
router.put('/:id', authenticate, authorize('creator', 'admin'), validateWithJoi(bidValidation.update), ctrl.updateBid);

// Withdraw bid (creator)
router.post('/:id/withdraw', authenticate, authorize('creator', 'admin'), ctrl.withdrawBid);

// Bids by creator
router.get('/creator/:creatorId', authenticate, authorize('creator', 'admin'), ctrl.getCreatorBids);

// Bid analytics
router.get('/:id/analytics', authenticate, ctrl.getBidAnalytics);

// Feedback
router.post('/:id/feedback', authenticate, ctrl.addBidFeedback);

module.exports = router;


