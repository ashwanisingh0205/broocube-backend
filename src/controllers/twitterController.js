// src/controllers/twitterController.js
const twitterService = require('../services/social/twitter');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const config = require('../config/env');

class TwitterController {
  // Generate Twitter OAuth URL
  async generateAuthURL(req, res) {
    const { redirectUri } = req.body;
    const state = jwt.sign({ userId: req.userId || req.user._id }, config.JWT_SECRET, { expiresIn: '30m' });
  
    const authURL = twitterService.generateAuthURL(redirectUri, state);
  
    res.json({ success: true, authURL, state, redirectUri }); // include redirectUri
  }

// Inside TwitterController.handleCallback
async handleCallback(req, res) {
  try {
    const { code, state, redirectUri } = req.query;
    const redirectToFrontend = 'http://localhost:3000/creator/settings';

    console.log("📥 Callback query params:", { code, state, redirectUri });
    console.log("📥 Request headers:", req.headers);
    console.log("📥 Request method:", req.method);
    console.log("📥 Full URL:", req.originalUrl);

    if (!code || !state || !redirectUri) {
      const msg = 'Missing code, state or redirectUri';
      return res.redirect(`${redirectToFrontend}?twitter=error&message=${encodeURIComponent(msg)}`);
    }

    // Verify state
    let decodedState;
    try {
      decodedState = jwt.verify(state, config.JWT_SECRET);
      console.log("✅ Decoded state:", decodedState);
    } catch (error) {
      console.error("❌ Invalid state:", error);
      const msg = 'Invalid state';
      return res.redirect(`${redirectToFrontend}?twitter=error&message=${encodeURIComponent(msg)}`);
    }

    // Exchange code for token
    console.log("🔄 Exchanging code for token with redirectUri:", redirectUri);
    const tokenResult = await twitterService.exchangeCodeForToken(code, redirectUri, state);
    console.log("🔑 Token result:", tokenResult);

    if (!tokenResult.success) {
      const detail = tokenResult.raw?.error_description || tokenResult.raw?.detail || tokenResult.error || 'Token exchange failed';
      return res.redirect(`${redirectToFrontend}?twitter=error&message=${encodeURIComponent(String(detail))}`);
    }

    // Try to get profile, but don't fail the connection if it errors
    let profileResult;
    try {
      profileResult = await twitterService.getUserProfile(tokenResult.access_token);
      console.log("👤 Profile result:", profileResult);
    } catch (e) {
      console.log("👤 Profile fetch threw:", e);
    }

    const twitterProfile = profileResult?.success ? {
      id: profileResult.user.id,
      username: profileResult.user.username,
      name: profileResult.user.name
    } : undefined;

    // Update DB (store tokens regardless; profile if available)
    await User.findByIdAndUpdate(
      decodedState.userId,
      {
        $set: {
          'socialAccounts.twitter.accessToken': tokenResult.access_token,
          'socialAccounts.twitter.refreshToken': tokenResult.refresh_token,
          'socialAccounts.twitter.expiresAt': new Date(Date.now() + tokenResult.expires_in * 1000),
          'socialAccounts.twitter.connectedAt': new Date(),
          ...(twitterProfile && {
            'socialAccounts.twitter.id': twitterProfile.id,
            'socialAccounts.twitter.username': twitterProfile.username,
            'socialAccounts.twitter.name': twitterProfile.name,
          })
        }
      },
      { upsert: true }
    );

    console.log("✅ User updated in DB");

    return res.redirect(`${redirectToFrontend}?twitter=success`);
  } catch (error) {
    console.error("🔥 Twitter callback error:", error);
    const msg = error?.message || 'Callback failed';
    return res.redirect(`${redirectToFrontend}?twitter=error&message=${encodeURIComponent(String(msg))}`);
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

    const result = await twitterService.postTweet(accessToken, content, mediaIds);
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
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

      const result = await twitterService.uploadMedia(
        user.socialAccounts.twitter.accessToken,
        req.file.buffer,
        req.file.mimetype
      );

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
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
}

module.exports = new TwitterController();
