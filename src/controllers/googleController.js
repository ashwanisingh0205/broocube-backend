const googleService = require('../services/social/google');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const config = require('../config/env');

class GoogleController {
  async generateAuthURL(req, res) {
    const redirectUri = (req.body && req.body.redirectUri) || req.query.redirectUri;
    const userId = (req.userId || req.user?._id) || 'guest';
    const state = jwt.sign({ userId }, config.JWT_SECRET, { expiresIn: '30m' });
    const authURL = googleService.generateAuthURL(redirectUri, state);
    res.json({ success: true, authURL, state, redirectUri });
  }

  async handleCallback(req, res) {
    const redirectToFrontend = 'http://localhost:3000/login';
    try {
      const { code, state, redirectUri } = req.query;
      if (!code || !state || !redirectUri) {
        return res.redirect(`${redirectToFrontend}?google=error&message=Missing+code+state+or+redirectUri`);
      }

      let decoded;
      try {
        decoded = jwt.verify(state, config.JWT_SECRET);
      } catch (e) {
        return res.redirect(`${redirectToFrontend}?google=error&message=Invalid+state`);
      }

      const tokenResult = await googleService.exchangeCodeForToken(code, redirectUri);
      if (!tokenResult.success) {
        const detail = tokenResult.raw?.error_description || tokenResult.error;
        return res.redirect(`${redirectToFrontend}?google=error&message=${encodeURIComponent(detail || 'Token+exchange+failed')}`);
      }

      const userInfo = await googleService.getUserInfo(tokenResult.access_token);
      if (!userInfo.success) {
        const detail = userInfo.raw?.error_description || userInfo.error;
        return res.redirect(`${redirectToFrontend}?google=error&message=${encodeURIComponent(detail || 'Userinfo+failed')}`);
      }

      // Find or create user
      const email = (userInfo.user.email || '').toLowerCase();
      let user = await User.findByEmail(email);
      if (!user) {
        user = new User({
          name: userInfo.user.name || userInfo.user.given_name || 'Google User',
          email,
          password: Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2),
          isVerified: true
        });
        await user.save();
      }

      // Issue tokens
      const jwtManager = require('../utils/jwt');
      const tokenPair = jwtManager.generateTokenPair({ id: user._id, email: user.email, role: user.role });

      // Redirect back to frontend login page with tokens in query (frontend should store securely)
      return res.redirect(`${redirectToFrontend}?google=success&accessToken=${encodeURIComponent(tokenPair.accessToken)}&refreshToken=${encodeURIComponent(tokenPair.refreshToken)}`);
    } catch (error) {
      return res.redirect(`${redirectToFrontend}?google=error&message=${encodeURIComponent(error.message || 'Callback+failed')}`);
    }
  }
}

module.exports = new GoogleController();


