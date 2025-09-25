// src/services/aiClient.js
const axios = require('axios');
const config = require('../config/env');
const logger = require('../utils/logger');

const client = axios.create({
  baseURL: config.AI_SERVICE_URL,
  timeout: 20000,
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': config.AI_SERVICE_API_KEY || ''
  }
});

const handle = async (method, url, data) => {
  const start = Date.now();
  try {
    const res = await client({ method, url, data });
    logger.api('ai-service', url, method.toUpperCase(), res.status, Date.now() - start);
    return res.data;
  } catch (err) {
    logger.api('ai-service', url, method.toUpperCase(), err.response?.status || 500, Date.now() - start, { error: err.message });
    throw err;
  }
};

module.exports = {
  competitorAnalysis: (payload) => handle('post', '/ai/competitor-analysis', payload),
  suggestions: (payload) => handle('post', '/ai/suggestions', payload),
  matchmaking: (payload) => handle('post', '/ai/matchmaking', payload)
};


