// src/controllers/linkedinController.js
const linkedinService = require('../services/social/linkedin');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const config = require('../config/env');

class LinkedInController {
  async generateAuthURL(req, res) {
    const { redirectUri } = req.body;
    const state = jwt.sign({ userId: req.userId || req.user._id }, config.JWT_SECRET, { expiresIn: '30m' });
    const authURL = linkedinService.generateAuthURL(redirectUri, state);
    res.json({ success: true, authURL, state, redirectUri });
  }

  async handleCallback(req, res) {
    try {
      const { code, state } = req.query;
      const redirectUri = process.env.LINKEDIN_REDIRECT_URI;

      if (!code || !state || !redirectUri) {
        return res.redirect(`${redirectToFrontend}?linkedin=error&message=Missing+code+state+or+redirectUri`);
      }

      let decoded;
      try {
        decoded = jwt.verify(state, config.JWT_SECRET);
      } catch (e) {
        return res.redirect(`${redirectToFrontend}?linkedin=error&message=Invalid+state`);
      }

      const tokenResult = await linkedinService.exchangeCodeForToken(code, redirectUri);
      if (!tokenResult.success) {
        const detail = tokenResult.raw?.error_description || tokenResult.error;
        return res.redirect(`${redirectToFrontend}?linkedin=error&message=${encodeURIComponent(detail || 'Token+exchange+failed')}`);
      }

      const profileResult = await linkedinService.getUserProfile(tokenResult.access_token);
      if (!profileResult.success) {
        const detail = profileResult.raw?.message || profileResult.error;
        return res.redirect(`${redirectToFrontend}?linkedin=error&message=${encodeURIComponent(detail || 'Profile+fetch+failed')}`);
      }

      await User.findByIdAndUpdate(
        decoded.userId,
        {
          $set: {
            'socialAccounts.linkedin': {
              id: profileResult.user.id,
              email: profileResult.user.email,
              firstName: profileResult.user.firstName,
              lastName: profileResult.user.lastName,
              accessToken: tokenResult.access_token,
              expiresAt: new Date(Date.now() + tokenResult.expires_in * 1000),
              connectedAt: new Date()
            }
          }
        },
        { upsert: true }
      );

      return res.redirect(`${redirectToFrontend}?linkedin=success`);
    } catch (error) {
      const redirectToFrontend = 'http://localhost:3000/creator/settings';
      return res.redirect(`${redirectToFrontend}?linkedin=error&message=${encodeURIComponent(error.message || 'Callback+failed')}`);
    }
  }
}

module.exports = new LinkedInController();


