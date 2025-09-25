// src/services/social/linkedin.js
module.exports = {
  post: async (accessToken, payload) => {
    return { success: true, platform: 'linkedin', payload };
  }
};


