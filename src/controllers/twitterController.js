// src/controllers/twitterController.js
const twitterService = require('../services/social/twitter');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const config = require('../config/env');

class TwitterController {
  // Add this to your TwitterController
async testRoutes(req, res) {
  const baseURL = `${req.protocol}://${req.get('host')}`;
  
  const testRoutes = {
    'Callback debug': `${baseURL}/api/twitter/callback/debug?test=123`,
    'Actual callback': `${baseURL}/api/twitter/callback`,
    'Auth callback': `${baseURL}/auth/twitter/callback`,
    'Generate auth URL': `${baseURL}/api/twitter/auth-url`
  };
  
  res.json({ testRoutes });
}
  // Generate Twitter OAuth URL
  async generateAuthURL(req, res) {
    try {
      console.log('🔑 Twitter generateAuthURL called:', {
        hasUser: !!req.user,
        userId: req.userId || req.user?._id || 'guest',
        redirectUri: req.body?.redirectUri || req.query?.redirectUri || config.TWITTER_REDIRECT_URI,
        method: req.method
      });

      const redirectUri = (req.body && req.body.redirectUri) || req.query?.redirectUri || config.TWITTER_REDIRECT_URI || '';
      const userId = req.userId || req.user?._id || 'guest';
      const state = jwt.sign({ userId }, config.JWT_SECRET, { expiresIn: '30m' });

      const authURL = twitterService.generateAuthURL(redirectUri, state);

      console.log('✅ Twitter auth URL generated:', { hasAuthURL: !!authURL, state: state.substring(0, 20) + '...' });
      return res.json({ success: true, authURL, state, redirectUri });
    } catch (error) {
      console.error('❌ Twitter generateAuthURL error:', error);
      return res.status(500).json({ success: false, error: error.message || 'Failed to generate Twitter auth URL' });
    }
  }

// Inside TwitterController.handleCallback
async handleCallback(req, res) {
  try {
    const { code, state, redirectUri } = req.query;
    const redirectToFrontend = config.FRONTEND_URL || 'http://localhost:3000';

    console.log("🔍 DEBUG - Callback details:", {
      code: code ? `present (${code.substring(0, 10)}...)` : 'missing',
      state: state ? `present (${state.substring(0, 20)}...)` : 'missing',
      redirectUri: redirectUri || 'missing',
      hasCodeVerifier: state ? twitterService.codeVerifiers.has(state) : false,
      availableStates: Array.from(twitterService.codeVerifiers.keys())
    });

    if (!code || !state || !redirectUri) {
      const msg = 'Missing code, state or redirectUri';
      console.log('❌ Missing parameters:', { code: !!code, state: !!state, redirectUri: !!redirectUri });
      return res.redirect(`${redirectToFrontend}/creator/settings?twitter=error&message=${encodeURIComponent(msg)}`);
    }

    // Check if state exists in codeVerifiers BEFORE verification
    if (!twitterService.codeVerifiers.has(state)) {
      console.log('❌ State not found in codeVerifiers map:', {
        state,
        availableStates: Array.from(twitterService.codeVerifiers.keys())
      });
      const msg = 'Session expired - please try connecting again';
      return res.redirect(`${redirectToFrontend}/creator/settings?twitter=error&message=${encodeURIComponent(msg)}`);
    }

    // Verify state JWT
    let decodedState;
    try {
      decodedState = jwt.verify(state, config.JWT_SECRET);
      console.log("✅ Decoded state:", decodedState);
    } catch (error) {
      console.error("❌ Invalid state JWT:", error);
      const msg = 'Invalid authentication state';
      return res.redirect(`${redirectToFrontend}/creator/settings?twitter=error&message=${encodeURIComponent(msg)}`);
    }} catch (error) {
    console.error("🔥 Twitter callback error:", error);
    const msg = error?.message || 'Callback failed';
    return res.redirect(`${redirectToFrontend}/creator/settings?twitter=error&message=${encodeURIComponent(String(msg))}`);
  }
}



  // Disconnect Twitter account
  async disconnect(req, res) {
    try {
      const userId = req.user.id;
      
      const user = await User.findByIdAndUpdate(
        userId,
        {
          $unset: {
            'socialAccounts.twitter': 1
          }
        },
        { new: true }
      );

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      res.json({
        success: true,
        message: 'Twitter account disconnected successfully'
      });
    } catch (error) {
      console.error('Twitter disconnect error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to disconnect Twitter account'
      });
    }
  }

  // Post tweet
 // Post tweet
async postTweet(req, res) {
  try {
    const { content, mediaIds } = req.body;
    const userId = req.user.id;

    const user = await User.findById(userId);

    // <-- Add this debug line
    console.log('Twitter account in DB:', user.socialAccounts?.twitter);

    if (!user || !user.socialAccounts?.twitter?.accessToken) {
      return res.status(400).json({
        success: false,
        error: 'Twitter account not connected'
      });
    }

    // Check if token is expired and refresh if needed
    let accessToken = user.socialAccounts.twitter.accessToken;
    if (user.socialAccounts.twitter.expiresAt < new Date()) {
      const refreshResult = await twitterService.refreshToken(user.socialAccounts.twitter.refreshToken);
      if (refreshResult.success) {
        accessToken = refreshResult.access_token;
        // Update user with new token
        await User.findByIdAndUpdate(userId, {
          $set: {
            'socialAccounts.twitter.accessToken': refreshResult.access_token,
            'socialAccounts.twitter.refreshToken': refreshResult.refresh_token,
            'socialAccounts.twitter.expiresAt': new Date(Date.now() + refreshResult.expires_in * 1000)
          }
        });
      } else {
        return res.status(400).json({
          success: false,
          error: 'Failed to refresh Twitter token'
        });
      }
    }

    let result = await twitterService.postTweet(accessToken, content, mediaIds);
    if (!result.success && (result.statusCode === 401 || result.statusCode === 403)) {
      // attempt refresh using stored refreshToken and retry once
      const refresh = await twitterService.refreshToken(user.socialAccounts.twitter.refreshToken);
      if (refresh.success) {
        accessToken = refresh.access_token;
        await User.findByIdAndUpdate(userId, {
          $set: {
            'socialAccounts.twitter.accessToken': refresh.access_token,
            'socialAccounts.twitter.refreshToken': refresh.refresh_token || user.socialAccounts.twitter.refreshToken,
            'socialAccounts.twitter.expiresAt': new Date(Date.now() + (refresh.expires_in || 3600) * 1000)
          }
        });
        result = await twitterService.postTweet(accessToken, content, mediaIds);
      }
    }
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }

    res.json({
      success: true,
      message: 'Tweet posted successfully',
      tweet: result
    });
  } catch (error) {
    console.error('Twitter post error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to post tweet'
    });
  }
}

  // Get Twitter profile
  async getProfile(req, res) {
    try {
      const userId = req.user.id;
      const user = await User.findById(userId);
      
      if (!user || !user.socialAccounts?.twitter) {
        return res.status(400).json({
          success: false,
          error: 'Twitter account not connected'
        });
      }

      res.json({
        success: true,
        profile: user.socialAccounts.twitter
      });
    } catch (error) {
      console.error('Twitter profile error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get Twitter profile'
      });
    }
  }

  // Upload media to Twitter
  async uploadMedia(req, res) {
    try {
      const userId = req.user.id;
      const user = await User.findById(userId);
      
      if (!user || !user.socialAccounts?.twitter?.accessToken) {
        return res.status(400).json({
          success: false,
          error: 'Twitter account not connected'
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No media file provided'
        });
      }

      let result = await twitterService.uploadMedia(user.socialAccounts.twitter.accessToken, req.file.buffer, req.file.mimetype);
      if (!result.success && (result.statusCode === 401 || result.statusCode === 403)) {
        const refresh = await twitterService.refreshToken(user.socialAccounts.twitter.refreshToken);
        if (refresh.success) {
          await User.findByIdAndUpdate(userId, {
            $set: {
              'socialAccounts.twitter.accessToken': refresh.access_token,
              'socialAccounts.twitter.refreshToken': refresh.refresh_token || user.socialAccounts.twitter.refreshToken,
              'socialAccounts.twitter.expiresAt': new Date(Date.now() + (refresh.expires_in || 3600) * 1000)
            }
          });
          result = await twitterService.uploadMedia(refresh.access_token, req.file.buffer, req.file.mimetype);
        }
      }
      if (!result.success) {
        return res.status(400).json({ success: false, error: result.error });
      }

      res.json({
        success: true,
        mediaId: result.media_id
      });
    } catch (error) {
      console.error('Twitter media upload error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to upload media'
      });
    }
  }
// Add this temporary debug method
async debugCallback(req, res) {
  console.log("🔍 DEBUG - Callback reached:", {
    query: req.query,
    originalUrl: req.originalUrl,
    method: req.method,
    headers: req.headers
  });
  
  res.json({ 
    success: true, 
    message: "Callback endpoint reached",
    query: req.query 
  });
}
}

module.exports = new TwitterController();
