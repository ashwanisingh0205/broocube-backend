// src/routes/campaign.routes.js
const router = require('express').Router();
const { authenticate, authorize, checkCampaignOwnership } = require('../middlewares/auth');
const { validateWithJoi, campaignValidation, validationRules, validateRequest } = require('../utils/validator');
const { campaignLimiter } = require('../middlewares/rateLimiter');
const ctrl = require('../controllers/campaignController');

// Public list with filters, private fields hidden by controller
router.get('/', authenticate, ctrl.getCampaigns);

// Create campaign (brand only)
router.post('/', authenticate, authorize('brand', 'admin'), campaignLimiter, validateWithJoi(campaignValidation.create), ctrl.createCampaign);

// Campaign details
router.get('/:id', authenticate, ctrl.getCampaign);

// Update campaign (owner/admin)
router.put('/:id', authenticate, authorize('brand', 'admin'), validateWithJoi(campaignValidation.update), ctrl.updateCampaign);

// Delete campaign (owner/admin)
router.delete('/:id', authenticate, authorize('brand', 'admin'), ctrl.deleteCampaign);

// Brand campaigns
router.get('/brand/:brandId', authenticate, authorize('brand', 'admin'), ctrl.getBrandCampaigns);

// Campaign bids (owner/admin)
router.get('/:id/bids', authenticate, authorize('brand', 'admin'), ctrl.getCampaignBids);
router.post('/:campaignId/bids/:bidId/accept', authenticate, authorize('brand', 'admin'), ctrl.acceptBid);
router.post('/:campaignId/bids/:bidId/reject', authenticate, authorize('brand', 'admin'), ctrl.rejectBid);

// Campaign analytics
router.get('/:id/analytics', authenticate, authorize('brand', 'admin'), ctrl.getCampaignAnalytics);

module.exports = router;


