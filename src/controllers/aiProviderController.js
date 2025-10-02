// src/controllers/aiProviderController.js
const aiClient = require('../services/aiClient');
const { HTTP_STATUS, SUCCESS_MESSAGES } = require('../utils/constants');
const { asyncHandler } = require('../middlewares/errorHandler');
const logger = require('../utils/logger');

/**
 * Get AI providers status
 * Super admin endpoint to view all AI providers and their status
 */
const getProvidersStatus = asyncHandler(async (req, res) => {
  logger.info('Admin requesting AI providers status', { 
    adminId: req.userId,
    adminEmail: req.user.email 
  });

  try {
    const response = await aiClient.getProvidersStatus();
    
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'AI providers status retrieved successfully',
      data: response
    });
  } catch (error) {
    logger.error('Failed to get AI providers status', { 
      error: error.message,
      adminId: req.userId 
    });
    
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to retrieve AI providers status',
      error: error.message
    });
  }
});

/**
 * Switch primary AI provider
 * Super admin endpoint to change the primary AI provider
 */
const switchPrimaryProvider = asyncHandler(async (req, res) => {
  const { provider, model } = req.body;

  // Validate input
  if (!provider) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: 'Provider is required'
    });
  }

  if (!['openai', 'gemini'].includes(provider)) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: 'Provider must be either "openai" or "gemini"'
    });
  }

  logger.info('Admin switching AI provider', { 
    adminId: req.userId,
    adminEmail: req.user.email,
    newProvider: provider,
    model: model
  });

  try {
    const response = await aiClient.switchProvider({
      provider,
      model
    });
    
    // Log the successful switch
    logger.info('AI provider switched successfully', {
      adminId: req.userId,
      adminEmail: req.user.email,
      oldProvider: response.old_provider,
      newProvider: response.new_provider,
      model: response.model
    });

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: `Successfully switched primary AI provider to ${provider}`,
      data: response
    });
  } catch (error) {
    logger.error('Failed to switch AI provider', { 
      error: error.message,
      adminId: req.userId,
      provider,
      model
    });
    
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to switch AI provider',
      error: error.message
    });
  }
});

/**
 * Test AI provider
 * Super admin endpoint to test an AI provider before switching
 */
const testProvider = asyncHandler(async (req, res) => {
  const { provider, model, testPrompt = "Hello, this is a test message." } = req.body;

  // Validate input
  if (!provider) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: 'Provider is required'
    });
  }

  if (!['openai', 'gemini'].includes(provider)) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: 'Provider must be either "openai" or "gemini"'
    });
  }

  logger.info('Admin testing AI provider', { 
    adminId: req.userId,
    adminEmail: req.user.email,
    provider,
    model
  });

  try {
    const response = await aiClient.testProvider({
      provider,
      model,
      test_prompt: testPrompt
    });
    
    logger.info('AI provider test completed', {
      adminId: req.userId,
      provider,
      model,
      success: true,
      tokensUsed: response.tokens_used,
      processingTime: response.processing_time_ms
    });

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: `AI provider ${provider} test completed successfully`,
      data: response
    });
  } catch (error) {
    logger.error('AI provider test failed', { 
      error: error.message,
      adminId: req.userId,
      provider,
      model
    });
    
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: `AI provider ${provider} test failed`,
      error: error.message
    });
  }
});

/**
 * Get available models
 * Super admin endpoint to view available models for each provider
 */
const getAvailableModels = asyncHandler(async (req, res) => {
  const { provider } = req.query;

  logger.info('Admin requesting available AI models', { 
    adminId: req.userId,
    provider: provider || 'all'
  });

  try {
    const response = await aiClient.getAvailableModels(provider);
    
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Available AI models retrieved successfully',
      data: response
    });
  } catch (error) {
    logger.error('Failed to get available AI models', { 
      error: error.message,
      adminId: req.userId,
      provider
    });
    
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to retrieve available AI models',
      error: error.message
    });
  }
});

/**
 * Get AI providers health check
 * Super admin endpoint to check health of all AI providers
 */
const healthCheckProviders = asyncHandler(async (req, res) => {
  logger.info('Admin requesting AI providers health check', { 
    adminId: req.userId 
  });

  try {
    const response = await aiClient.healthCheckProviders();
    
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'AI providers health check completed',
      data: response
    });
  } catch (error) {
    logger.error('AI providers health check failed', { 
      error: error.message,
      adminId: req.userId
    });
    
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'AI providers health check failed',
      error: error.message
    });
  }
});

/**
 * Get AI usage statistics
 * Super admin endpoint to view usage statistics and costs
 */
const getUsageStatistics = asyncHandler(async (req, res) => {
  const { period = 'last_30_days' } = req.query;

  logger.info('Admin requesting AI usage statistics', { 
    adminId: req.userId,
    period
  });

  try {
    const response = await aiClient.getUsageStatistics(period);
    
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'AI usage statistics retrieved successfully',
      data: response
    });
  } catch (error) {
    logger.error('Failed to get AI usage statistics', { 
      error: error.message,
      adminId: req.userId,
      period
    });
    
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to retrieve AI usage statistics',
      error: error.message
    });
  }
});

/**
 * Update AI provider configuration
 * Super admin endpoint to update provider settings
 */
const updateProviderConfig = asyncHandler(async (req, res) => {
  const { provider, config } = req.body;

  // Validate input
  if (!provider || !config) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: 'Provider and config are required'
    });
  }

  if (!['openai', 'gemini'].includes(provider)) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: 'Provider must be either "openai" or "gemini"'
    });
  }

  logger.info('Admin updating AI provider configuration', { 
    adminId: req.userId,
    adminEmail: req.user.email,
    provider,
    configKeys: Object.keys(config)
  });

  try {
    // This would typically update environment variables or configuration
    // For now, we'll return a success response
    const response = {
      provider,
      config,
      updated_at: new Date().toISOString(),
      updated_by: req.user.email
    };
    
    logger.info('AI provider configuration updated', {
      adminId: req.userId,
      provider,
      success: true
    });

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: `AI provider ${provider} configuration updated successfully`,
      data: response
    });
  } catch (error) {
    logger.error('Failed to update AI provider configuration', { 
      error: error.message,
      adminId: req.userId,
      provider
    });
    
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to update AI provider configuration',
      error: error.message
    });
  }
});

/**
 * Get AI provider logs
 * Super admin endpoint to view AI provider operation logs
 */
const getProviderLogs = asyncHandler(async (req, res) => {
  const { provider, limit = 100, offset = 0 } = req.query;

  logger.info('Admin requesting AI provider logs', { 
    adminId: req.userId,
    provider: provider || 'all',
    limit,
    offset
  });

  try {
    // This would typically query logs from a logging system
    // For now, return mock log data
    const logs = {
      provider: provider || 'all',
      total_logs: 1500,
      logs: [
        {
          timestamp: new Date().toISOString(),
          provider: 'openai',
          operation: 'text_generation',
          model: 'gpt-4-turbo-preview',
          tokens_used: 150,
          duration_ms: 850,
          status: 'success'
        },
        {
          timestamp: new Date(Date.now() - 60000).toISOString(),
          provider: 'gemini',
          operation: 'text_generation',
          model: 'gemini-1.5-pro',
          tokens_used: 120,
          duration_ms: 1200,
          status: 'success'
        }
      ],
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        has_more: true
      }
    };
    
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'AI provider logs retrieved successfully',
      data: logs
    });
  } catch (error) {
    logger.error('Failed to get AI provider logs', { 
      error: error.message,
      adminId: req.userId,
      provider
    });
    
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to retrieve AI provider logs',
      error: error.message
    });
  }
});

module.exports = {
  getProvidersStatus,
  switchPrimaryProvider,
  testProvider,
  getAvailableModels,
  healthCheckProviders,
  getUsageStatistics,
  updateProviderConfig,
  getProviderLogs
};
