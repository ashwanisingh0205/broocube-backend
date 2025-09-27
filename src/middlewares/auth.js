
// src/middlewares/auth.js
const jwtManager = require('../utils/jwt');
const User = require('../models/User');
const logger = require('../utils/logger');
const { HTTP_STATUS, ERROR_MESSAGES } = require('../utils/constants');

/**
 * Authentication middleware
 * Verifies JWT token and attaches user to request
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: ERROR_MESSAGES.INVALID_TOKEN
      });
    }

    // Extract token from header
    const token = jwtManager.extractTokenFromHeader(authHeader);
    
    // Verify token
    const decoded = jwtManager.verifyAccessToken(token);
    
    // Find user
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: ERROR_MESSAGES.USER_NOT_FOUND
      });
    }

    if (!user.isActive) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    // Attach user to request
    req.user = user;
    req.userId = user._id;
    
    logger.info('User authenticated', { 
      userId: user._id, 
      email: user.email, 
      role: user.role 
    });
    
    next();
  } catch (error) {
    logger.error('Authentication error', error);
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
      success: false,
      message: ERROR_MESSAGES.INVALID_TOKEN
    });
  }
};

/**
 * Authorization middleware
 * Checks if user has required role
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: ERROR_MESSAGES.INVALID_TOKEN
      });
    }

    if (!roles.includes(req.user.role)) {
      logger.warn('Authorization failed', { 
        userId: req.user._id, 
        userRole: req.user.role, 
        requiredRoles: roles 
      });
      
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        message: ERROR_MESSAGES.ACCESS_DENIED
      });
    }

    next();
  };
};

/**
 * Optional authentication middleware
 * Attaches user if token is valid, but doesn't require it
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return next();
    }

    const token = jwtManager.extractTokenFromHeader(authHeader);
    const decoded = jwtManager.verifyAccessToken(token);
    const user = await User.findById(decoded.id).select('-password');
    
    if (user && user.isActive) {
      req.user = user;
      req.userId = user._id;
    }
    
    next();
  } catch (error) {
    // Continue without authentication for optional auth
    next();
  }
};

/**
 * Resource ownership middleware
 * Ensures user can only access their own resources
 */
const checkResourceOwnership = (resourceIdParam = 'id', userIdField = 'user_id') => {
  return (req, res, next) => {
    const resourceId = req.params[resourceIdParam];
    const userId = req.userId;
    
    // Admin can access all resources
    if (req.user.role === 'admin') {
      return next();
    }
    
    // Check if user owns the resource
    if (req.resource && req.resource[userIdField].toString() !== userId.toString()) {
      logger.warn('Resource ownership check failed', { 
        userId, 
        resourceId, 
        resourceOwner: req.resource[userIdField] 
      });
      
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        message: ERROR_MESSAGES.ACCESS_DENIED
      });
    }
    
    next();
  };
};

/**
 * Campaign ownership middleware
 * Ensures only campaign owner can modify campaign
 */
const checkCampaignOwnership = async (req, res, next) => {
  try {
    const campaignId = req.params.id;
    const userId = req.userId;
    
    // Admin can access all campaigns
    if (req.user.role === 'admin') {
      return next();
    }
    
    const Campaign = require('../models/Campaign');
    const campaign = await Campaign.findById(campaignId);
    
    if (!campaign) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: 'Campaign not found'
      });
    }
    
    if (campaign.brand_id.toString() !== userId.toString()) {
      logger.warn('Campaign ownership check failed', { 
        userId, 
        campaignId, 
        campaignOwner: campaign.brand_id 
      });
      
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        message: ERROR_MESSAGES.ACCESS_DENIED
      });
    }
    
    req.campaign = campaign;
    next();
  } catch (error) {
    logger.error('Campaign ownership check error', error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: ERROR_MESSAGES.INTERNAL_ERROR
    });
  }
};

/**
 * Bid ownership middleware
 * Ensures only bid owner can modify bid
 */
const checkBidOwnership = async (req, res, next) => {
  try {
    const bidId = req.params.id;
    const userId = req.userId;
    
    // Admin can access all bids
    if (req.user.role === 'admin') {
      return next();
    }
    
    const Bid = require('../models/Bid');
    const bid = await Bid.findById(bidId);
    
    if (!bid) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: 'Bid not found'
      });
    }
    
    // Check if user is bid creator or campaign owner
    const Campaign = require('../models/Campaign');
    const campaign = await Campaign.findById(bid.campaign_id);
    
    if (bid.creator_id.toString() !== userId.toString() && 
        campaign.brand_id.toString() !== userId.toString()) {
      logger.warn('Bid ownership check failed', { 
        userId, 
        bidId, 
        bidCreator: bid.creator_id,
        campaignOwner: campaign.brand_id
      });
      
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        message: ERROR_MESSAGES.ACCESS_DENIED
      });
    }
    
    req.bid = bid;
    req.campaign = campaign;
    next();
  } catch (error) {
    logger.error('Bid ownership check error', error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: ERROR_MESSAGES.INTERNAL_ERROR
    });
  }
};

/**
 * Refresh token middleware
 * Handles refresh token validation and new token generation
 */
const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Refresh token is required'
      });
    }
    
    const decoded = jwtManager.verifyRefreshToken(refreshToken);
    const user = await User.findById(decoded.id);
    
    if (!user || !user.isActive) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: ERROR_MESSAGES.INVALID_TOKEN
      });
    }
    
    // Generate new token pair
    const tokenPair = jwtManager.generateTokenPair({
      id: user._id,
      email: user.email,
      role: user.role
    });
    
    // Update last login
    user.lastLogin = new Date();
    await user.save();
    
    logger.info('Token refreshed', { userId: user._id });
    
    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        accessToken: tokenPair.accessToken,
        refreshToken: tokenPair.refreshToken,
        expiresIn: tokenPair.expiresIn
      }
    });
  } catch (error) {
    logger.error('Token refresh error', error);
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
      success: false,
      message: ERROR_MESSAGES.INVALID_TOKEN
    });
  }
};

/**
 * Password reset token middleware
 * Validates password reset token
 */
const validatePasswordResetToken = async (req, res, next) => {
  try {
    const { token } = req.params;
    
    if (!token) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Reset token is required'
      });
    }
    
    const decoded = jwtManager.verifyPasswordResetToken(token);
    const user = await User.findById(decoded.id);
    
    if (!user || !user.isActive) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }
    
    req.user = user;
    req.userId = user._id;
    next();
  } catch (error) {
    logger.error('Password reset token validation error', error);
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
      success: false,
      message: 'Invalid or expired reset token'
    });
  }
};

module.exports = {
  authenticate,
  authorize,
  optionalAuth,
  checkResourceOwnership,
  checkCampaignOwnership,
  checkBidOwnership,
  refreshToken,
  validatePasswordResetToken
};
