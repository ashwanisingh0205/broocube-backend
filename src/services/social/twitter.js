// src/services/social/twitter.js
const axios = require('axios');
const crypto = require('crypto');
const config = require('../../config/env');

class TwitterService {
  constructor() {
    this.clientId = config.TWITTER_CLIENT_ID;
    this.clientSecret = config.TWITTER_CLIENT_SECRET;
    this.baseURL = 'https://api.twitter.com/2';
    this.authURL = 'https://twitter.com/i/oauth2/authorize';
    this.tokenURL = 'https://api.twitter.com/2/oauth2/token';
    this.codeVerifiers = new Map();
  }

  generateAuthURL(redirectUri, state) {
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto
      .createHash('sha256')
      .update(codeVerifier)
      .digest('base64url');

    this.codeVerifiers.set(state, codeVerifier);

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: redirectUri,
      scope: config.TWITTER_SCOPES || 'tweet.read users.read offline.access', // Fallback scopes
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });

    return `${this.authURL}?${params.toString()}`;
  }

  async exchangeCodeForToken(code, redirectUri, state) {
    try {
      const codeVerifier = this.codeVerifiers.get(state);
      if (!codeVerifier) {
        throw new Error('Code verifier not found for state');
      }

      const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');

      const params = new URLSearchParams();
      params.append('code', code);
      params.append('grant_type', 'authorization_code');
      params.append('client_id', this.clientId);
      params.append('redirect_uri', redirectUri);
      params.append('code_verifier', codeVerifier);

      const response = await axios.post(this.tokenURL, params.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${credentials}`
        },
      });

      this.codeVerifiers.delete(state);

      return {
        success: true,
        access_token: response.data.access_token,
        refresh_token: response.data.refresh_token,
        expires_in: response.data.expires_in,
        token_type: response.data.token_type,
        scope: response.data.scope
      };
    } catch (error) {
      console.error('Twitter token exchange error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error_description || error.response?.data?.error || 'Token exchange failed',
        statusCode: error.response?.status,
      };
    }
  }
   // Refresh access token
   async refreshToken(refreshToken) {
    try {
      const params = new URLSearchParams();
      params.append('refresh_token', refreshToken);
      params.append('grant_type', 'refresh_token');
      params.append('client_id', this.clientId);
      params.append('client_secret', this.clientSecret);

      const response = await axios.post(this.tokenURL, params.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      return {
        success: true,
        access_token: response.data.access_token,
        refresh_token: response.data.refresh_token || refreshToken,
        expires_in: response.data.expires_in,
      };
    } catch (error) {
      const statusCode = error.response?.status;
      console.error('YouTube token refresh error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || 'Token refresh failed',
        statusCode,
      };
    }
  }

  // Add other Twitter API methods (post tweet, get user info, etc.)
  async postTweet(accessToken, text, options = {}) {
    try {
      const response = await axios.post(
        `${this.baseURL}/tweets`,
        {
          text: text.substring(0, 280), // Twitter character limit
          ...options
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        tweet_id: response.data.data.id,
        text: response.data.data.text
      };
    } catch (error) {
      console.error('Twitter post error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.detail || 'Failed to post tweet',
        statusCode: error.response?.status,
      };
    }
  }
  async postPoll(accessToken, text, poll) {
    try {
      const { options, durationMinutes } = poll;

      if (!options || options.length < 2 || options.length > 4) {
        return {
          success: false,
          error: 'Poll must have between 2 and 4 options'
        };
      }

      if (!durationMinutes || durationMinutes < 5 || durationMinutes > 10080) {
        return {
          success: false,
          error: 'Poll duration must be between 5 minutes and 7 days (10080 minutes)'
        };
      }

      const pollData = {
        text: text.substring(0, 280),
        poll: {
          options: options.map(option => ({ label: option.substring(0, 25) })), // Max 25 chars per option
          duration_minutes: durationMinutes
        }
      };

      const response = await axios.post(
        `${this.baseURL}/tweets`,
        pollData,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        tweet_id: response.data.data.id,
        text: response.data.data.text,
        poll: {
          options: options,
          duration_minutes: durationMinutes,
          ends_at: new Date(Date.now() + durationMinutes * 60 * 1000).toISOString()
        }
      };
    } catch (error) {
      console.error('Twitter poll post error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.detail || 'Failed to post poll',
        statusCode: error.response?.status,
      };
    }
  }
  // Upload media (images, GIFs)
  async uploadMedia(accessToken, mediaBuffer, mimeType) {
    try {
      const formData = new FormData();
      const blob = new Blob([mediaBuffer], { type: mimeType });
      formData.append('media', blob);

      const response = await axios.post(
        `${this.uploadURL}/media/upload.json`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            ...formData.getHeaders()
          }
        }
      );

      return {
        success: true,
        media_id: response.data.media_id_string,
        size: response.data.size,
        image: response.data.image
      };
    } catch (error) {
      console.error('Twitter media upload error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.errors?.[0]?.message || 'Failed to upload media',
        statusCode: error.response?.status,
      };
    }
  }

  async getProfile(accessToken) {
    try {
      const response = await axios.get(
        `${this.baseURL}/users/me`,
        {
          params: {
            'user.fields': 'id,name,username,profile_image_url,verified,public_metrics,created_at,description,location,url,protected'
          },
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      return {
        success: true,
        user: response.data.data
      };
    } catch (error) {
      console.error('Twitter user profile error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.detail || 'Failed to get user profile',
        statusCode: error.response?.status,
      };
    }
  }
  async validateToken(accessToken) {
    try {
      const profile = await this.getProfile(accessToken);
      if (!profile.success) {
        return {
          valid: false,
          error: profile.error
        };
      }

      // Check if we can post (basic write validation)
      const testResult = await this.postTweet(accessToken, 'Test tweet for validation - will be deleted immediately');
      
      return {
        valid: true,
        user: profile.user,
        canPost: testResult.success
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message
      };
    }
  }

}

module.exports = new TwitterService();