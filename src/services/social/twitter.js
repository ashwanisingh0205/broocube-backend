// src/services/social/twitter.js
const axios = require('axios');
const crypto = require('crypto');
const FormData = require('form-data');
const config = require('../../config/env');

class TwitterService {
  constructor() {
    this.clientId = config.TWITTER_CLIENT_ID;
    this.baseURL = 'https://api.twitter.com/2';
    this.codeVerifiers = new Map(); // Store code verifiers temporarily
  }

  // Generate OAuth 2.0 authorization URL with PKCE
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
      scope: config.TWITTER_SCOPES,
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });

    return `https://twitter.com/i/oauth2/authorize?${params.toString()}`;
  }

  // Exchange authorization code for access token
  async exchangeCodeForToken(code, redirectUri, state) {
    try {
      const codeVerifier = this.codeVerifiers.get(state);
      if (!codeVerifier) {
        throw new Error('Code verifier not found for state');
      }

      const params = new URLSearchParams();
      params.append('code', code);
      params.append('grant_type', 'authorization_code');
      params.append('client_id', this.clientId);
      params.append('redirect_uri', redirectUri);
      params.append('code_verifier', codeVerifier);

      const response = await axios.post(
        'https://api.twitter.com/2/oauth2/token',
        params.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      this.codeVerifiers.delete(state);

      return {
        success: true,
        access_token: response.data.access_token,
        refresh_token: response.data.refresh_token,
        expires_in: response.data.expires_in,
        token_type: response.data.token_type,
      };
    } catch (error) {
      const detail = error.response?.data || error.message;
      console.error('Twitter token exchange error:', detail);
      return {
        success: false,
        error: detail?.error_description || detail?.error || 'Token exchange failed',
        raw: detail,
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

      const response = await axios.post(
        'https://api.twitter.com/2/oauth2/token',
        params.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      return {
        success: true,
        access_token: response.data.access_token,
        refresh_token: response.data.refresh_token,
        expires_in: response.data.expires_in,
      };
    } catch (error) {
      console.error(
        'Twitter token refresh error:',
        error.response?.data || error.message
      );
      return {
        success: false,
        error: error.response?.data?.error || 'Token refresh failed',
      };
    }
  }

  // Post a tweet
  async postTweet(accessToken, content, mediaIds = []) {
    try {
      const tweetData = { text: content };

      if (mediaIds && mediaIds.length > 0) {
        tweetData.media = { media_ids: mediaIds };
      }

      const response = await axios.post(
        `${this.baseURL}/tweets?tweet.fields=created_at`,
        tweetData,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return {
        success: true,
        tweet_id: response.data.data.id,
        text: response.data.data.text,
        created_at: response.data.data.created_at,
      };
    } catch (error) {
      console.error(
        'Twitter post error:',
        error.response?.data || error.message
      );
      return {
        success: false,
        error: error.response?.data?.detail || 'Failed to post tweet',
      };
    }
  }

  // Get user profile
  async getUserProfile(accessToken) {
    try {
      const response = await axios.get(`${this.baseURL}/users/me`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'User-Agent': 'BloocubeApp/1.0',
          'Accept': 'application/json'
        },
      });

      return {
        success: true,
        user: response.data.data,
      };
    } catch (error) {
      console.error(
        'Twitter profile error:',
        error.response?.data || error.message
      );
      return {
        success: false,
        error: error.response?.data?.detail || error.response?.data?.error_description || 'Failed to get user profile',
        raw: error.response?.data || null,
      };
    }
  }

  // Upload media (basic — images, small videos/gifs)
  async uploadMedia(accessToken, mediaData, mediaType = 'image/jpeg') {
    try {
      const formData = new FormData();

      formData.append('media', mediaData, {
        filename: 'media',
        contentType: mediaType,
      });

      const mediaCategory = mediaType.startsWith('image/')
        ? 'tweet_image'
        : mediaType.startsWith('video/')
        ? 'tweet_video'
        : 'tweet_gif';

      formData.append('media_category', mediaCategory);

      const response = await axios.post(
        'https://upload.twitter.com/1.1/media/upload.json',
        formData,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            ...formData.getHeaders(),
          },
        }
      );

      return {
        success: true,
        media_id: response.data.media_id_string,
      };
    } catch (error) {
      console.error(
        'Twitter media upload error:',
        error.response?.data || error.message
      );
      return {
        success: false,
        error:
          error.response?.data?.errors?.[0]?.message ||
          'Failed to upload media',
      };
    }
  }

  // Get tweet analytics
  async getTweetAnalytics(accessToken, tweetId) {
    try {
      const response = await axios.get(`${this.baseURL}/tweets/${tweetId}`, {
        params: {
          'tweet.fields': 'public_metrics,created_at',
        },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      return {
        success: true,
        metrics: response.data.data.public_metrics,
        created_at: response.data.data.created_at,
      };
    } catch (error) {
      console.error(
        'Twitter analytics error:',
        error.response?.data || error.message
      );
      return {
        success: false,
        error: error.response?.data?.detail || 'Failed to get tweet analytics',
      };
    }
  }
}

module.exports = new TwitterService();
