// src/controllers/twitterController.js
const twitterService = require('../services/social/twitter');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const config = require('../config/env');

class TwitterController {
  // Generate Twitter OAuth URL
  async generateAuthURL(req, res) {
    try {
      const { redirectUri } = req.body;
      const state = jwt.sign({ userId: req.user.id }, config.JWT_SECRET, { expiresIn: '10m' });
      
      const authURL = twitterService.generateAuthURL(redirectUri, state);
      
      res.json({
        success: true,
        authURL,
        state
      });
    } catch (error) {
      console.error('Twitter auth URL generation error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate Twitter auth URL'
      });
    }
  }

  // Handle Twitter OAuth callback
  async handleCallback(req, res) {
    try {
      const { code, state, redirectUri } = req.query;
      
      if (!code || !state) {
        return res.status(400).json({
          success: false,
          error: 'Missing authorization code or state'
        });
      }

      // Verify state parameter
      let decodedState;
      try {
        decodedState = jwt.verify(state, config.JWT_SECRET);
      } catch (error) {
        return res.status(400).json({
          success: false,
          error: 'Invalid state parameter'
        });
      }

      // Exchange code for access token
      const tokenResult = await twitterService.exchangeCodeForToken(code, redirectUri, state);
      
      if (!tokenResult.success) {
        return res.status(400).json({
          success: false,
          error: tokenResult.error
        });
      }

      // Get user profile from Twitter
      const profileResult = await twitterService.getUserProfile(tokenResult.access_token);
      
      if (!profileResult.success) {
        return res.status(400).json({
          success: false,
          error: profileResult.error
        });
      }

      // Update user with Twitter credentials
      const user = await User.findByIdAndUpdate(
        decodedState.userId,
        {
          $set: {
            'socialAccounts.twitter': {
              id: profileResult.user.id,
              username: profileResult.user.username,
              name: profileResult.user.name,
              accessToken: tokenResult.access_token,
              refreshToken: tokenResult.refresh_token,
              expiresAt: new Date(Date.now() + tokenResult.expires_in * 1000),
              connectedAt: new Date()
            }
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
        message: 'Twitter account connected successfully',
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          socialAccounts: user.socialAccounts
        }
      });
    } catch (error) {
      console.error('Twitter callback error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to connect Twitter account'
      });
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
  async postTweet(req, res) {
    try {
      const { content, mediaIds } = req.body;
      const userId = req.user.id;

      const user = await User.findById(userId);
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
