// src/services/social/youtube.js
module.exports = {
  post: async (accessToken, payload) => {
    return { success: true, platform: 'youtube', payload };
  }
};


