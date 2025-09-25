// src/services/social/twitter.js
module.exports = {
  post: async (accessToken, payload) => {
    return { success: true, platform: 'twitter', payload };
  }
};


