// src/middlewares/errorHandler.js
const logger = require('../utils/logger');
const { HTTP_STATUS, ERROR_CODES } = require('../utils/constants');

/**
 * Global error handler middleware
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error
  logger.error('Error occurred', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = {
      message,
      statusCode: HTTP_STATUS.NOT_FOUND,
      code: ERROR_CODES.NOT_FOUND
    };
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const message = `${field} already exists`;
    error = {
      message,
      statusCode: HTTP_STATUS.CONFLICT,
      code: ERROR_CODES.CONFLICT
    };
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = {
      message,
      statusCode: HTTP_STATUS.BAD_REQUEST,
      code: ERROR_CODES.VALIDATION_ERROR
    };
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = {
      message,
      statusCode: HTTP_STATUS.UNAUTHORIZED,
      code: ERROR_CODES.AUTHENTICATION_ERROR
    };
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired';
    error = {
      message,
      statusCode: HTTP_STATUS.UNAUTHORIZED,
      code: ERROR_CODES.AUTHENTICATION_ERROR
    };
  }

  // Rate limit error
  if (err.name === 'TooManyRequestsError') {
    const message = 'Too many requests';
    error = {
      message,
      statusCode: HTTP_STATUS.TOO_MANY_REQUESTS,
      code: ERROR_CODES.RATE_LIMIT_EXCEEDED
    };
  }

  // External service errors
  if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
    const message = 'External service unavailable';
    error = {
      message,
      statusCode: HTTP_STATUS.SERVICE_UNAVAILABLE,
      code: ERROR_CODES.EXTERNAL_SERVICE_ERROR
    };
  }

  // Default to 500 server error
  const statusCode = error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
  const message = error.message || 'Internal Server Error';
  const code = error.code || ERROR_CODES.INTERNAL_ERROR;

  res.status(statusCode).json({
    success: false,
    message,
    code,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

/**
 * 404 handler for undefined routes
 */
const notFound = (req, res, next) => {
  const error = new Error(`Route ${req.originalUrl} not found`);
  error.statusCode = HTTP_STATUS.NOT_FOUND;
  error.code = ERROR_CODES.NOT_FOUND;
  next(error);
};

/**
 * Async error wrapper
 * Wraps async route handlers to catch errors
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Validation error formatter
 */
const formatValidationErrors = (errors) => {
  return errors.map(error => ({
    field: error.path || error.param,
    message: error.msg || error.message,
    value: error.value
  }));
};

/**
 * Database error handler
 */
const handleDatabaseError = (err) => {
  if (err.name === 'MongoError' || err.name === 'MongoServerError') {
    if (err.code === 11000) {
      return {
        message: 'Duplicate entry',
        statusCode: HTTP_STATUS.CONFLICT,
        code: ERROR_CODES.CONFLICT
      };
    }
    
    return {
      message: 'Database error',
      statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      code: ERROR_CODES.INTERNAL_ERROR
    };
  }
  
  return {
    message: err.message || 'Database error',
    statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
    code: ERROR_CODES.INTERNAL_ERROR
  };
};

/**
 * External API error handler
 */
const handleExternalAPIError = (err) => {
  if (err.response) {
    // API responded with error status
    const status = err.response.status;
    const message = err.response.data?.message || 'External API error';
    
    return {
      message,
      statusCode: status >= 400 && status < 500 ? HTTP_STATUS.BAD_REQUEST : HTTP_STATUS.BAD_GATEWAY,
      code: ERROR_CODES.EXTERNAL_SERVICE_ERROR
    };
  } else if (err.request) {
    // Request was made but no response received
    return {
      message: 'External service unavailable',
      statusCode: HTTP_STATUS.SERVICE_UNAVAILABLE,
      code: ERROR_CODES.EXTERNAL_SERVICE_ERROR
    };
  } else {
    // Something else happened
    return {
      message: 'External service error',
      statusCode: HTTP_STATUS.BAD_GATEWAY,
      code: ERROR_CODES.EXTERNAL_SERVICE_ERROR
    };
  }
};

/**
 * Security error handler
 */
const handleSecurityError = (err) => {
  logger.security('Security error detected', {
    error: err.message,
    stack: err.stack,
    type: 'security_error'
  });
  
  return {
    message: 'Security error',
    statusCode: HTTP_STATUS.FORBIDDEN,
    code: ERROR_CODES.AUTHORIZATION_ERROR
  };
};

module.exports = {
  errorHandler,
  notFound,
  asyncHandler,
  formatValidationErrors,
  handleDatabaseError,
  handleExternalAPIError,
  handleSecurityError
};
